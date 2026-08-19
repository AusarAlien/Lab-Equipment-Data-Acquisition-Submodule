package main

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"os/signal"
	"path/filepath"
	"sync"
	"syscall"
	"unsafe"
)

var (
	runCtx    context.Context
	runCancel context.CancelFunc
	runMode   string
	runMu     sync.Mutex

	mHTTP       *trayMenuItem
	mUSBStorage *trayMenuItem
	mUSBSerial  *trayMenuItem
	mUSBAuto    *trayMenuItem
	mStop       *trayMenuItem
	mStatus     *trayMenuItem
)

func main() {
	exeDir := getExeDir()
	setConfigPath(exeDir)

	if err := ensureConfig(); err != nil {
		fmt.Fprintf(os.Stderr, "init config: %v\n", err)
	}
	loadConfig()

	initLogger(exeDir)
	startLogFlusher()

	// 分配控制台窗口（GUI 子系统编译时也能看到终端日志）
	allocConsole()

	logInfo("==== instrument monitor (Go) started ====")
	logInfo("config dir: %s", exeDir)

	trayRun(onReady)
}

// allocConsole 为 GUI 应用分配控制台窗口，使终端日志可见
func allocConsole() {
	kernel32 := syscall.MustLoadDLL("kernel32.dll")

	// AllocConsole 创建控制台
	procAllocConsole := kernel32.MustFindProc("AllocConsole")
	procAllocConsole.Call()

	// 将 stdout/stderr 重定向到新控制台（CONOUT$ 在 AllocConsole 后指向新控制台）
	f, err := os.OpenFile("CONOUT$", os.O_WRONLY, 0)
	if err == nil {
		os.Stdout = f
		os.Stderr = f
	}

	// 设置控制台标题
	procSetTitle := kernel32.MustFindProc("SetConsoleTitleW")
	title, _ := syscall.UTF16PtrFromString("Instrument Monitor - Terminal Log")
	procSetTitle.Call(uintptr(unsafe.Pointer(title)))
}

func onReady() {
	// 设置托盘图标
	trayAddIcon("gray")
	traySetTooltip("instrument monitor - stopped")

	// 状态标签
	mStatus = trayAddMenuItem("status: stopped", false, nil)

	trayAddSeparator()

	// 模式选择
	mHTTP = trayAddMenuItem("start HTTP", true, func() { startMonitor("http") })
	mUSBStorage = trayAddMenuItem("start USB-Storage", true, func() { startMonitor("usb_storage") })
	mUSBSerial = trayAddMenuItem("start USB-Serial", true, func() { startMonitor("usb_serial") })
	mUSBAuto = trayAddMenuItem("start USB-Auto", true, func() { startMonitor("usb_auto") })

	trayAddSeparator()

	// 停止
	mStop = trayAddMenuItem("stop", false, func() { stopMonitor() })

	trayAddSeparator()

	// 工具
	trayAddMenuItem("view log", true, func() { openFile("monitor.log") })
	trayAddMenuItem("edit config", true, func() { openFile("config.ini") })

	logInfo("tray ready")
}

func startMonitor(mode string) {
	runMu.Lock()
	if runCancel != nil {
		runCancel()
	}
	runCtx, runCancel = context.WithCancel(context.Background())
	runMode = mode
	runMu.Unlock()

	loadConfig()

	trayModifyIcon("green")
	traySetTooltip(fmt.Sprintf("instrument monitor - running [%s]", modeLabel(mode)))
	trayItemSetTitle(mStatus, fmt.Sprintf("status: running [%s]", modeLabel(mode)))
	trayItemEnable(mStop, true)
	trayItemEnable(mHTTP, false)
	trayItemEnable(mUSBStorage, false)
	trayItemEnable(mUSBSerial, false)
	trayItemEnable(mUSBAuto, false)

	logInfo("==== start %s ====", modeLabel(mode))
	if mode == "http" {
		go sendClientEvent("CLIENT_START", "INFO", "INFO", "", "HTTP目录监听已启动", 0, 0, "")
	}

	safeRun := func(fn func(context.Context), ctx context.Context, label string) {
		go func() {
			defer func() {
				if r := recover(); r != nil {
					logError("[PANIC] %s 监听异常恢复: %v", label, r)
				}
			}()
			fn(ctx)
		}()
	}

	switch mode {
	case "http":
		safeRun(runHTTPMonitor, runCtx, "HTTP")
	case "usb_storage":
		safeRun(runUSBStorageMonitor, runCtx, "USB-Storage")
	case "usb_serial":
		safeRun(runUSBSerialMonitor, runCtx, "USB-Serial")
	case "usb_auto":
		safeRun(runUSBAutoMonitor, runCtx, "USB-Auto")
	}
}

func stopMonitor() {
	runMu.Lock()
	previousMode := runMode
	if runCancel != nil {
		runCancel()
		runCancel = nil
	}
	runMode = ""
	runMu.Unlock()

	trayModifyIcon("gray")
	traySetTooltip("instrument monitor - stopped")
	trayItemSetTitle(mStatus, "status: stopped")
	trayItemEnable(mStop, false)
	trayItemEnable(mHTTP, true)
	trayItemEnable(mUSBStorage, true)
	trayItemEnable(mUSBSerial, true)
	trayItemEnable(mUSBAuto, true)

	logInfo("stopped")
	if previousMode == "http" {
		go sendClientEvent("CLIENT_STOP", "INFO", "INFO", "", "HTTP目录监听已停止", 0, 0, "")
	}
}

func modeLabel(mode string) string {
	switch mode {
	case "http":
		return "HTTP"
	case "usb_storage":
		return "USB-Storage"
	case "usb_serial":
		return "USB-Serial"
	case "usb_auto":
		return "USB-Auto"
	default:
		return mode
	}
}

func getExeDir() string {
	exe, err := os.Executable()
	if err != nil {
		return "."
	}
	exe, err = filepath.EvalSymlinks(exe)
	if err != nil {
		return filepath.Dir(exe)
	}
	return filepath.Dir(exe)
}

func openFile(name string) {
	path := filepath.Join(getExeDir(), name)
	if _, err := os.Stat(path); os.IsNotExist(err) {
		logInfo("file not found: %s", path)
		return
	}
	exec.Command("rundll32", "url.dll,FileProtocolHandler", path).Start()
}

func init() {
	go func() {
		sigCh := make(chan os.Signal, 1)
		signal.Notify(sigCh, os.Interrupt)
		<-sigCh
		stopMonitor()
		trayQuit()
	}()
}
