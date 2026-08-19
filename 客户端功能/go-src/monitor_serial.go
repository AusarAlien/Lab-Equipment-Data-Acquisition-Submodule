package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	"go.bug.st/serial"
)

// runUSBSerialMonitor USB串口监听模式（指定COM口）
func runUSBSerialMonitor(ctx context.Context) {
	instno := getCfg("interface", "instno", "")
	serviceURL := getCfg("interface", "service", "")
	comPort := getCfg("interface", "com_port", "COM3")
	baudrate := getCfgInt("interface", "com_baudrate", 9600)
	bytesize := getCfgInt("interface", "com_bytesize", 8)
	stopbits := getCfgInt("interface", "com_stopbits", 1)
	parity := getCfg("interface", "com_parity", "N")
	timeout := getCfgFloat("interface", "com_timeout", 0)
	streamFormat := getCfg("interface", "stream_format", "text_line")
	lineTerminator := getCfg("interface", "com_line_terminator", `\r\n`)
	dataMode := getCfg("interface", "data_mode", "file_first")
	outputDir := getCfg("interface", "usb_output_dir", "")
	frameHeader := getCfg("interface", "frame_header", "")
	frameFooter := getCfg("interface", "frame_footer", "")
	frameLength := getCfgInt("interface", "frame_length", 0)
	startRow := getCfg("interface", "startrow", "1")
	sampColFlag := getCfg("interface", "sampcolflag", "样品名称")

	lineTerminator = strings.ReplaceAll(lineTerminator, `\r`, "\r")
	lineTerminator = strings.ReplaceAll(lineTerminator, `\n`, "\n")

	parityMap := map[string]serial.Parity{"N": serial.NoParity, "E": serial.EvenParity, "O": serial.OddParity}
	stopBitsMap := map[int]serial.StopBits{1: serial.OneStopBit, 2: serial.TwoStopBits}

	mode := &serial.Mode{
		BaudRate: baudrate,
		DataBits: bytesize,
		Parity:   parityMap[parity],
		StopBits: stopBitsMap[stopbits],
	}

	port, err := serial.Open(comPort, mode)
	if err != nil {
		logError("[USB-Serial] 无法打开 %s: %v", comPort, err)
		return
	}
	defer port.Close()

	logInfo("[USB-Serial] %s 已连接 @ %d,%d,%s,%d", comPort, baudrate, bytesize, parity, stopbits)

	if outputDir != "" {
		os.MkdirAll(outputDir, 0755)
	}

	go func() {
		<-ctx.Done()
		port.Close()
	}()

	seq := 0
	var lineBuffer []string
	var binaryBuffer []byte

	for ctx.Err() == nil {
		if streamFormat == "text_line" {
			line := readSerialLine(port, lineTerminator, timeout)
			if line == "" {
				continue
			}
			ts := time.Now().Format("2006-01-02 15:04:05")
			display := line
			if len(display) > 100 {
				display = display[:100]
			}
			logInfo("[USB-Serial] [%s] %s: %s", ts, comPort, display)
			lineBuffer = append(lineBuffer, line)

			if len(lineBuffer) >= 50 {
				flushSerialToFile(lineBuffer, seq, instno, serviceURL, outputDir, dataMode, startRow, sampColFlag)
				seq++
				lineBuffer = nil
				// [2026-08-03] send heartbeat to server
				maybeHeartbeat("usb_serial", serviceURL)
			}
		} else {
			buf := make([]byte, 4096)
			n, err := port.Read(buf)
			if err != nil {
				continue
			}
			binaryBuffer = append(binaryBuffer, buf[:n]...)
			frames, remaining := splitFrames(binaryBuffer, frameHeader, frameFooter, frameLength)
			binaryBuffer = remaining

			for _, frame := range frames {
				seq++
				ts := time.Now().Format("2006-01-02 15:04:05")
				logInfo("[USB-Serial] [%s] %s 帧#%d: %d bytes", ts, comPort, seq, len(frame))
				writeAndUpload(frame, seq, instno, serviceURL, outputDir, dataMode, startRow, sampColFlag)
			}
		}
	}

	if len(lineBuffer) > 0 {
		flushSerialToFile(lineBuffer, seq, instno, serviceURL, outputDir, dataMode, startRow, sampColFlag)
	}

	logInfo("[USB-Serial] %s 已关闭", comPort)
}

func readSerialLine(port serial.Port, terminator string, timeout float64) string {
	if timeout > 0 {
		port.SetReadTimeout(time.Duration(timeout * float64(time.Second)))
	} else {
		port.SetReadTimeout(100 * time.Millisecond)
	}

	var line []byte
	term := []byte(terminator)
	for {
		buf := make([]byte, 1)
		n, err := port.Read(buf)
		if err != nil || n == 0 {
			return string(line)
		}
		line = append(line, buf[0])
		if len(line) >= len(term) && string(line[len(line)-len(term):]) == string(term) {
			return strings.TrimSuffix(string(line), string(term))
		}
		if len(line) > 1024*1024 {
			return string(line)
		}
	}
}

func flushSerialToFile(lines []string, seq int, instno, serviceURL, outputDir, dataMode, startRow, sampColFlag string) {
	if len(lines) == 0 {
		return
	}
	ts := time.Now().Format("20060102150405")
	fname := fmt.Sprintf("%s_%s_%d.csv", instno, ts, seq)
	fpath := filepath.Join(os.TempDir(), fname)
	if outputDir != "" {
		fpath = filepath.Join(outputDir, fname)
	}
	os.WriteFile(fpath, []byte(strings.Join(lines, "\n")), 0644)
	logInfo("[USB-Serial] 保存: %s (%d行)", fpath, len(lines))
	if dataMode == "file_first" {
		uploadFile(fpath, instno, serviceURL, startRow, sampColFlag)
	}
}

func writeAndUpload(frame []byte, seq int, instno, serviceURL, outputDir, dataMode, startRow, sampColFlag string) {
	if dataMode == "file_first" && outputDir != "" {
		fname := fmt.Sprintf("%s_%s_%d.bin", instno, time.Now().Format("20060102150405"), seq)
		fpath := filepath.Join(outputDir, fname)
		os.WriteFile(fpath, frame, 0644)
		uploadFile(fpath, instno, serviceURL, startRow, sampColFlag)
	} else {
		fpath := filepath.Join(os.TempDir(), fmt.Sprintf("serial_%d.bin", seq))
		os.WriteFile(fpath, frame, 0644)
		uploadFile(fpath, instno, serviceURL, startRow, sampColFlag)
		os.Remove(fpath)
	}
}

// splitFrames 从二进制缓冲区分割帧，返回帧列表和剩余数据
func splitFrames(buffer []byte, frameHeader, frameFooter string, frameLength int) ([][]byte, []byte) {
	if frameLength > 0 {
		var frames [][]byte
		for len(buffer) >= frameLength {
			frames = append(frames, buffer[:frameLength])
			buffer = buffer[frameLength:]
		}
		return frames, buffer
	}

	hdr := hexToBytes(frameHeader)
	ftr := hexToBytes(frameFooter)

	if len(hdr) > 0 && len(ftr) > 0 {
		var frames [][]byte
		for {
			start := bytesIndex(buffer, hdr)
			if start == -1 {
				break
			}
			end := bytesIndex(buffer[start+len(hdr):], ftr)
			if end == -1 {
				break
			}
			end += start + len(hdr) + len(ftr)
			frame := make([]byte, end-start)
			copy(frame, buffer[start:end])
			frames = append(frames, frame)
			buffer = buffer[end:]
		}
		return frames, buffer
	}

	if len(hdr) > 0 {
		var frames [][]byte
		for {
			start := bytesIndex(buffer, hdr)
			if start == -1 {
				break
			}
			next := bytesIndex(buffer[start+len(hdr):], hdr)
			if next == -1 {
				break
			}
			next += start + len(hdr)
			frame := make([]byte, next-start)
			copy(frame, buffer[start:next])
			frames = append(frames, frame)
			buffer = buffer[next:]
		}
		return frames, buffer
	}

	return nil, buffer
}

func bytesIndex(data, sub []byte) int {
	if len(sub) == 0 {
		return -1
	}
	for i := 0; i <= len(data)-len(sub); i++ {
		if string(data[i:i+len(sub)]) == string(sub) {
			return i
		}
	}
	return -1
}

func hexToBytes(s string) []byte {
	s = strings.TrimSpace(s)
	if s == "" {
		return nil
	}
	// 去掉可能的 0x 前缀
	s = strings.TrimPrefix(s, "0x")
	s = strings.TrimPrefix(s, "0X")
	var result []byte
	for i := 0; i+1 < len(s); i += 2 {
		var b byte
		fmt.Sscanf(s[i:i+2], "%02x", &b)
		result = append(result, b)
	}
	return result
}

// runUSBAutoMonitor USB 自动检测模式
func runUSBAutoMonitor(ctx context.Context) {
	ctx1, cancel1 := context.WithCancel(ctx)
	ctx2, cancel2 := context.WithCancel(ctx)

	go func() { runUSBStorageMonitor(ctx1) }()
	go func() { serialAutoDetect(ctx2) }()

	<-ctx.Done()
	cancel1()
	cancel2()
}

func serialAutoDetect(ctx context.Context) {
	pollInterval := getCfgInt("interface", "usb_poll_interval", 5)
	if pollInterval < 1 {
		pollInterval = 5
	}

	logInfo("[USB-Auto] COM口自动检测已启动, 间隔=%ds", pollInterval)

	knownPorts := make(map[string]bool)
	ports, _ := serial.GetPortsList()
	for _, p := range ports {
		knownPorts[p] = true
	}
	logInfo("[USB-Auto] 初始COM口: %v", mapKeysStr(knownPorts))

	ticker := time.NewTicker(time.Duration(pollInterval) * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			logInfo("[USB-Auto] COM口检测已停止")
			return
		case <-ticker.C:
			ports, err := serial.GetPortsList()
			if err != nil {
				continue
			}
			currentPorts := make(map[string]bool)
			for _, p := range ports {
				currentPorts[p] = true
			}

			for p := range currentPorts {
				if !knownPorts[p] {
					logInfo("[USB-Auto] 检测到新COM口: %s", p)
				}
			}
			for p := range knownPorts {
				if !currentPorts[p] {
					logInfo("[USB-Auto] COM口已移除: %s", p)
				}
			}
			knownPorts = currentPorts
		}
	}
}

func mapKeysStr(m map[string]bool) []string {
	var keys []string
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}