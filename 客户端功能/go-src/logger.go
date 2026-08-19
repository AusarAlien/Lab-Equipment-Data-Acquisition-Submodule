package main

import (
	"fmt"
	"io"
	"os"
	"path/filepath"
	"sync"
	"time"
)

var (
	logFile   *os.File
	logMu     sync.Mutex
	logDir    string
	rotateDay string // 当前日志日期，用于午夜切换
)

const maxBackups = 3

// 初始化日志：写入 exe 同目录的 monitor.log
func initLogger(exeDir string) {
	logDir = exeDir

	// 打开日志文件
	if err := openLogFile(); err != nil {
		fmt.Fprintf(os.Stderr, "打开日志文件失败: %v\n", err)
		return
	}

	// 清理旧备份
	cleanOldLogs()

	// 每小时检查一次是否需要轮转
	go func() {
		for {
			now := time.Now()
			next := now.Truncate(24*time.Hour).Add(24 * time.Hour)
			time.Sleep(next.Sub(now) + time.Second)

			logMu.Lock()
			today := time.Now().Format("2006-01-02")
			if today != rotateDay {
				if logFile != nil {
					logFile.Close()
				}
				openLogFile()
				cleanOldLogs()
			}
			logMu.Unlock()
		}
	}()
}

func openLogFile() error {
	today := time.Now().Format("2006-01-02")
	logPath := filepath.Join(logDir, "monitor.log")

	f, err := os.OpenFile(logPath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
	if err != nil {
		return err
	}

	// 检查是否需要轮转（通过文件修改日期）
	fi, err := f.Stat()
	if err == nil {
		modDay := fi.ModTime().Format("2006-01-02")
		if modDay != today && fi.Size() > 0 {
			// 轮转旧文件
			f.Close()
			backup := filepath.Join(logDir, fmt.Sprintf("monitor.%s.log", modDay))
			os.Rename(logPath, backup)
			f, err = os.OpenFile(logPath, os.O_CREATE|os.O_APPEND|os.O_WRONLY, 0644)
			if err != nil {
				return err
			}
		}
	}

	logFile = f
	rotateDay = today
	return nil
}

func cleanOldLogs() {
	// 保留当天 + 最近 3 个备份
	entries, err := os.ReadDir(logDir)
	if err != nil {
		return
	}

	var backups []string
	for _, e := range entries {
		name := e.Name()
		if len(name) > 10 && name[:8] == "monitor." && filepath.Ext(name) == ".log" {
			backups = append(backups, name)
		}
	}

	// 超过 maxBackups 个备份时删除最旧的
	if len(backups) > maxBackups {
		// 按文件名排序（日期格式天然可排序）
		for i := 0; i < len(backups)-maxBackups; i++ {
			os.Remove(filepath.Join(logDir, backups[i]))
		}
	}
}

// logInfo 写入日志（文件 + 控制台）
func logInfo(format string, args ...interface{}) {
	logMu.Lock()
	defer logMu.Unlock()

	msg := fmt.Sprintf(format, args...)
	line := time.Now().Format("2006-01-02 15:04:05") + " | " + msg

	// 控制台
	fmt.Fprintln(os.Stdout, line)

	// 文件
	if logFile != nil {
		fmt.Fprintln(logFile, line)
		// 不立即 Sync，性能好；每分钟刷一次
	}
}

// logDebug 调试日志，仅在详细模式下输出
func logDebug(format string, args ...interface{}) {
	logInfo("DEBUG " + format, args...)
}

// logError 同 logInfo，带 ERROR 标记
func logError(format string, args ...interface{}) {
	logInfo("ERROR " + format, args...)
}

// 刷新日志缓冲（定期调用）
func flushLog() {
	logMu.Lock()
	defer logMu.Unlock()
	if logFile != nil {
		logFile.Sync()
	}
}

// 定期刷日志
func startLogFlusher() {
	go func() {
		for {
			time.Sleep(60 * time.Second)
			flushLog()
		}
	}()
}

// 创建多输出 writer（非轮转场景用）
func newMultiWriter(writers ...io.Writer) io.Writer {
	return io.MultiWriter(writers...)
}
