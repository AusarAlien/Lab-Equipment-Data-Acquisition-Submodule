package main

import (
	_ "embed"
	"fmt"
	"os"
	"sync"
	"sync/atomic"
	"syscall"
	"time"
	"unsafe"
)

//go:embed systray_gray.ico
var icoGray []byte

//go:embed systray_green.ico
var icoGreen []byte

// Windows constants
const (
	wmAppTray     = 0x8000 + 1
	wmMenuCommand = 0x8000 + 2

	wmLButtonUp   = 0x0202
	wmRButtonUp   = 0x0205
	wmContextMenu = 0x007B
	wmDestroy     = 0x0002
	wmCommand     = 0x0111

	mfString       = 0x00000000
	mfSeparator    = 0x00000800
	mfGrayed       = 0x00000001
	tpmRightButton = 0x0002
	tpmNonotify    = 0x0080
	tpmReturnCmd   = 0x0100

	wsExNoactivate = 0x08000000
	wsExToolwindow = 0x00000080

	nimAdd        = 0x00000000
	nimModify     = 0x00000001
	nimDelete     = 0x00000002
	nimSetVersion = 0x00000004
	nifMessage    = 0x00000001
	nifIcon       = 0x00000002
	nifTip        = 0x00000004
)

var (
	trayItems   []*trayMenuItem
	trayMu      sync.Mutex
	trayHwnd    syscall.Handle
	trayNid     *_NOTIFYICONDATA
	trayReady   = make(chan struct{})
	trayOnReady func()

	trayMenuOpen       atomic.Bool
	trayMenuLastClosed atomic.Int64
)

type trayMenuItem struct {
	id      uint32
	label   string
	enabled bool
	onClick func()
}

const (
	menuBaseID = 1000
	menuSepID  = 2999
	menuQuitID = 2998
)

// DLLs
var (
	user32   = syscall.NewLazyDLL("user32.dll")
	shell32  = syscall.NewLazyDLL("shell32.dll")
	kernel32 = syscall.NewLazyDLL("kernel32.dll")

	procDefWindowProc       = user32.NewProc("DefWindowProcW")
	procRegisterClassEx     = user32.NewProc("RegisterClassExW")
	procCreateWindowEx      = user32.NewProc("CreateWindowExW")
	procDestroyWindow       = user32.NewProc("DestroyWindow")
	procPostQuitMessage     = user32.NewProc("PostQuitMessage")
	procGetMessage          = user32.NewProc("GetMessageW")
	procTranslateMessage    = user32.NewProc("TranslateMessage")
	procDispatchMessage     = user32.NewProc("DispatchMessageW")
	procCreatePopupMenu     = user32.NewProc("CreatePopupMenu")
	procAppendMenu          = user32.NewProc("AppendMenuW")
	procDestroyMenu         = user32.NewProc("DestroyMenu")
	procTrackPopupMenu      = user32.NewProc("TrackPopupMenu")
	procSetForegroundWindow = user32.NewProc("SetForegroundWindow")
	procGetCursorPos        = user32.NewProc("GetCursorPos")
	procPostMessage         = user32.NewProc("PostMessageW")
	procGetModuleHandle     = kernel32.NewProc("GetModuleHandleW")
	procShellNotifyIcon     = shell32.NewProc("Shell_NotifyIconW")
	procCreateIconFromRes   = user32.NewProc("CreateIconFromResourceEx")
)

type _WNDCLASSEX struct {
	Size       uint32
	Style      uint32
	WndProc    uintptr
	ClsExtra   int32
	WndExtra   int32
	Instance   syscall.Handle
	Icon       syscall.Handle
	Cursor     syscall.Handle
	Background syscall.Handle
	MenuName   *uint16
	ClassName  *uint16
	IconSm     syscall.Handle
}

type _MSG struct {
	Hwnd    syscall.Handle
	Message uint32
	WParam  uintptr
	LParam  uintptr
	Time    uint32
	Pt      _POINT
}

type _POINT struct {
	X int32
	Y int32
}

type _NOTIFYICONDATA struct {
	CbSize            uint32
	HWnd              syscall.Handle
	UID               uint32
	UFlags            uint32
	UCallbackMessage  uint32
	HIcon             syscall.Handle
	SzTip             [128]uint16
	DwState           uint32
	DwStateMask       uint32
	SzInfo            [256]uint16
	UTimeoutOrVersion uint32 // union: uTimeout / uVersion (same offset!)
	SzInfoTitle       [64]uint16
	DwInfoFlags       uint32
}

// 无锁调试日志，直接写文件，避免 logMu 死锁
func trayDebug(f string, args ...interface{}) {
	fl, err := os.OpenFile("tray_debug.log", os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
	if err != nil {
		return
	}
	defer fl.Close()
	fmt.Fprintf(fl, f+"\n", args...)
}

func trayRun(onReady func()) {
	trayOnReady = onReady
	err := createTrayWindow()
	if err != nil {
		trayDebug("ERROR: createTrayWindow: %v", err)
		return
	}
	close(trayReady)
	if trayOnReady != nil {
		trayOnReady()
	}

	var msg _MSG
	for {
		ret, _, _ := procGetMessage.Call(
			uintptr(unsafe.Pointer(&msg)),
			0, 0, 0,
		)
		if ret == 0 || ret == 0xFFFFFFFF {
			break
		}
		procTranslateMessage.Call(uintptr(unsafe.Pointer(&msg)))
		procDispatchMessage.Call(uintptr(unsafe.Pointer(&msg)))
	}
}

func createTrayWindow() error {
	instance, _, _ := procGetModuleHandle.Call(0)
	className, _ := syscall.UTF16PtrFromString("GoTrayClass")
	wndProc := syscall.NewCallback(trayWndProc)

	var wc _WNDCLASSEX
	wc.Size = uint32(unsafe.Sizeof(wc))
	wc.Style = 3 // CS_HREDRAW | CS_VREDRAW
	wc.WndProc = wndProc
	wc.Instance = syscall.Handle(instance)
	wc.Background = 5 // COLOR_WINDOW + 1
	wc.ClassName = className

	ret, _, err := procRegisterClassEx.Call(uintptr(unsafe.Pointer(&wc)))
	if ret == 0 {
		return fmt.Errorf("RegisterClassEx: %v", err)
	}

	cwu := uintptr(0x80000000) // CW_USEDEFAULT
	hwnd, _, err := procCreateWindowEx.Call(
		uintptr(wsExToolwindow),
		uintptr(unsafe.Pointer(className)),
		uintptr(unsafe.Pointer(nil)),
		0, // WS_OVERLAPPED
		cwu, cwu, cwu, cwu,
		0, // HWND_DESKTOP
		0,
		instance,
		0,
	)
	if hwnd == 0 {
		return fmt.Errorf("CreateWindowEx: %v", err)
	}
	trayHwnd = syscall.Handle(hwnd)
	trayDebug("window created: hwnd=0x%X", hwnd)
	return nil
}

func trayWndProc(hwnd syscall.Handle, msg uint32, wParam, lParam uintptr) uintptr {
	// 记录所有托盘回调消息
	if msg == wmAppTray {
		trayDebug("TRAY_EVENT: lParam=0x%04X (RDown=0x0204, RUp=0x0205, Ctx=0x007B)", uint32(lParam))
	}

	switch msg {
	case wmAppTray:
		lp := uint32(lParam) & 0xFFFF
		switch lp {
		case wmLButtonUp:
			trayDebug("LEFT-CLICK -> requestTrayMenu")
			requestTrayMenu(hwnd)
		case wmRButtonUp, wmContextMenu:
			trayDebug("RIGHT-CLICK -> requestTrayMenu")
			requestTrayMenu(hwnd)
		}
		return 0

	case wmCommand:
		id := uint32(wParam & 0xFFFF)
		trayDebug("WM_COMMAND: id=%d (quit=%d)", id, menuQuitID)
		handleTrayCommand(hwnd, id)
		return 0

	case wmDestroy:
		procPostQuitMessage.Call(0)
		return 0
	}

	ret, _, _ := procDefWindowProc.Call(uintptr(hwnd), uintptr(msg), wParam, lParam)
	return ret
}

func requestTrayMenu(hwnd syscall.Handle) {
	// Shell can emit multiple notifications for one physical click. Suppress
	// reentrant requests while TrackPopupMenu is active and the trailing event
	// that can arrive immediately after the menu closes.
	const reopenDebounce = 300 * time.Millisecond
	lastClosed := trayMenuLastClosed.Load()
	if lastClosed != 0 && time.Since(time.Unix(0, lastClosed)) < reopenDebounce {
		trayDebug("requestTrayMenu: ignored duplicate event after close")
		return
	}
	if !trayMenuOpen.CompareAndSwap(false, true) {
		trayDebug("requestTrayMenu: ignored reentrant event")
		return
	}
	defer func() {
		trayMenuLastClosed.Store(time.Now().UnixNano())
		trayMenuOpen.Store(false)
	}()

	showTrayMenu(hwnd)
}

func showTrayMenu(hwnd syscall.Handle) {
	trayMu.Lock()
	items := make([]trayMenuItem, 0, len(trayItems))
	for _, item := range trayItems {
		items = append(items, *item)
	}
	trayMu.Unlock()

	trayDebug("showTrayMenu: building menu (%d items)", len(items))
	menu, _, _ := procCreatePopupMenu.Call()
	if menu == 0 {
		trayDebug("showTrayMenu: CreatePopupMenu failed")
		return
	}
	defer procDestroyMenu.Call(menu)

	for _, item := range items {
		if item.id == menuSepID {
			procAppendMenu.Call(menu, mfSeparator, 0, 0)
			continue
		}
		flags := uintptr(mfString)
		if !item.enabled {
			flags |= mfGrayed
		}
		label, _ := syscall.UTF16PtrFromString(item.label)
		procAppendMenu.Call(menu, flags, uintptr(item.id), uintptr(unsafe.Pointer(label)))
	}

	procAppendMenu.Call(menu, mfSeparator, 0, 0)
	quitLabel, _ := syscall.UTF16PtrFromString("quit")
	procAppendMenu.Call(menu, mfString, menuQuitID, uintptr(unsafe.Pointer(quitLabel)))

	procSetForegroundWindow.Call(uintptr(hwnd))

	var pt _POINT
	procGetCursorPos.Call(uintptr(unsafe.Pointer(&pt)))
	trayDebug("showTrayMenu: TrackPopupMenu at (%d,%d)", pt.X, pt.Y)

	selected, _, _ := procTrackPopupMenu.Call(
		menu,
		tpmRightButton|tpmNonotify|tpmReturnCmd,
		uintptr(pt.X),
		uintptr(pt.Y),
		0,
		uintptr(hwnd),
		0,
	)

	trayDebug("showTrayMenu: menu dismissed selected=%d", selected)
	procPostMessage.Call(uintptr(hwnd), 0, 0, 0)

	if selected != 0 {
		handleTrayCommand(hwnd, uint32(selected))
	}
}

func handleTrayCommand(hwnd syscall.Handle, id uint32) {
	if id == menuQuitID {
		trayRemoveIcon()
		procDestroyWindow.Call(uintptr(hwnd))
		procPostQuitMessage.Call(0)
		return
	}
	handleMenuClick(id)
}

func handleMenuClick(id uint32) {
	trayMu.Lock()
	var onClick func()
	for _, item := range trayItems {
		if item.id == id && item.onClick != nil {
			trayDebug("handleMenuClick: id=%d label=%s", id, item.label)
			onClick = item.onClick
			break
		}
	}
	trayMu.Unlock()

	if onClick == nil {
		trayDebug("handleMenuClick: id=%d NOT FOUND", id)
		return
	}

	// Menu callbacks may update tray items, which also acquire trayMu.
	// Run the callback only after releasing the mutex to avoid self-deadlock.
	onClick()
}

func trayAddIcon(status string) {
	var icoBytes []byte
	if status == "green" {
		icoBytes = icoGreen
	} else {
		icoBytes = icoGray
	}

	hIcon := createHIcon(icoBytes)
	trayDebug("trayAddIcon: status=%s hIcon=0x%X", status, hIcon)
	if hIcon == 0 {
		trayDebug("trayAddIcon: createHIcon FAILED")
		return
	}

	nid := &_NOTIFYICONDATA{}
	nid.CbSize = uint32(unsafe.Sizeof(*nid))
	nid.HWnd = trayHwnd
	nid.UID = 1
	nid.UFlags = nifIcon | nifMessage | nifTip
	nid.UCallbackMessage = wmAppTray
	nid.HIcon = syscall.Handle(hIcon)

	tip := syscall.StringToUTF16("instrument monitor")
	copy(nid.SzTip[:], tip)

	ret, _, _ := procShellNotifyIcon.Call(uintptr(nimAdd), uintptr(unsafe.Pointer(nid)))
	trayDebug("trayAddIcon: NIM_ADD ret=%d", ret)
	if ret == 0 {
		trayDebug("trayAddIcon: NIM_ADD FAILED")
		return
	}

	// 必须调用 NIM_SETVERSION，否则 Win7+ 不会发送鼠标回调消息！
	nid.UTimeoutOrVersion = 4 // NOTIFYICON_VERSION_4
	procShellNotifyIcon.Call(uintptr(nimSetVersion), uintptr(unsafe.Pointer(nid)))
	trayDebug("trayAddIcon: NIM_SETVERSION version=4")

	trayNid = nid
}

func trayModifyIcon(status string) {
	if trayNid == nil {
		trayAddIcon(status)
		return
	}

	var icoBytes []byte
	if status == "green" {
		icoBytes = icoGreen
	} else {
		icoBytes = icoGray
	}

	hIcon := createHIcon(icoBytes)
	if hIcon == 0 {
		trayDebug("trayModifyIcon: createHIcon FAILED")
		return
	}

	trayNid.HIcon = syscall.Handle(hIcon)
	trayNid.UFlags = nifIcon | nifMessage
	ret, _, _ := procShellNotifyIcon.Call(uintptr(nimModify), uintptr(unsafe.Pointer(trayNid)))
	trayDebug("trayModifyIcon: NIM_MODIFY ret=%d status=%s hIcon=0x%X", ret, status, hIcon)
}

func traySetTooltip(tip string) {
	if trayNid == nil {
		return
	}
	u16 := syscall.StringToUTF16(tip)
	copy(trayNid.SzTip[:], u16)
	trayNid.UFlags = nifTip
	procShellNotifyIcon.Call(uintptr(nimModify), uintptr(unsafe.Pointer(trayNid)))
}

func trayRemoveIcon() {
	if trayNid != nil {
		procShellNotifyIcon.Call(uintptr(nimDelete), uintptr(unsafe.Pointer(trayNid)))
		trayNid = nil
	}
}

func trayQuit() {
	trayRemoveIcon()
	if trayHwnd != 0 {
		procDestroyWindow.Call(uintptr(trayHwnd))
	}
}

func trayAddMenuItem(label string, enabled bool, onClick func()) *trayMenuItem {
	trayMu.Lock()
	defer trayMu.Unlock()
	id := uint32(menuBaseID + len(trayItems))
	item := &trayMenuItem{id: id, label: label, enabled: enabled, onClick: onClick}
	trayItems = append(trayItems, item)
	return item
}

func trayAddSeparator() {
	trayMu.Lock()
	defer trayMu.Unlock()
	trayItems = append(trayItems, &trayMenuItem{id: menuSepID})
}

func trayItemEnable(item *trayMenuItem, enable bool) {
	trayMu.Lock()
	defer trayMu.Unlock()
	item.enabled = enable
}

func trayItemSetTitle(item *trayMenuItem, title string) {
	trayMu.Lock()
	defer trayMu.Unlock()
	item.label = title
}

func createHIcon(data []byte) uintptr {
	if len(data) < 22 {
		return 0
	}
	count := *(*uint16)(unsafe.Pointer(&data[4]))
	if count == 0 {
		return 0
	}
	imgSize := *(*uint32)(unsafe.Pointer(&data[14]))
	imgOffset := *(*uint32)(unsafe.Pointer(&data[18]))
	if int(imgOffset)+int(imgSize) > len(data) {
		return 0
	}

	bmpData := data[imgOffset : imgOffset+imgSize]

	icon, _, _ := procCreateIconFromRes.Call(
		uintptr(unsafe.Pointer(&bmpData[0])),
		uintptr(imgSize),
		1,
		0x00030000,
		0, 0,
		0,
	)
	return icon
}
