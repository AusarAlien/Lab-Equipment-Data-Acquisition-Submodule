package main

import (
	"context"
	"os"
	"path/filepath"
	"strings"
	"time"

	"golang.org/x/sys/windows"
)

// getRemovableDrives 获取所有可移动磁盘盘符
func getRemovableDrives() []string {
	var drives []string
	bitmask, err := windows.GetLogicalDrives()
	if err != nil {
		return drives
	}
	for i := 0; i < 26; i++ {
		if bitmask&(1<<uint(i)) != 0 {
			letter := string(rune('A'+i)) + `:\`
			dt := windows.GetDriveType(windows.StringToUTF16Ptr(letter))
			if dt == windows.DRIVE_REMOVABLE {
				drives = append(drives, letter[:2])
			}
		}
	}
	return drives
}

type driveFile struct {
	FullPath string
	Name     string
	Size     int64
}

// scanDriveFiles 递归扫描指定盘符下所有文件
func scanDriveFiles(driveLetter string) []driveFile {
	var results []driveFile
	root := driveLetter + `\`

	filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return nil
		}
		if info.IsDir() {
			return nil
		}
		results = append(results, driveFile{
			FullPath: path,
			Name:     info.Name(),
			Size:     info.Size(),
		})
		return nil
	})

	return results
}

// runUSBStorageMonitor USB 大容量存储监听
func runUSBStorageMonitor(ctx context.Context) {
	instno := getCfg("interface", "instno", "")
	serviceURL := getCfg("interface", "service", "")
	trackMode := getCfg("interface", "track_mode", "0")
	pollInterval := getCfgInt("interface", "usb_poll_interval", 5)
	localCopyDir := getCfg("interface", "usb_local_copy_dir", "")
	driveFilter := getCfg("interface", "usb_drive_letters", "")
	startRow := getCfg("interface", "startrow", "1")
	sampColFlag := getCfg("interface", "sampcolflag", "样品名称")

	if pollInterval < 1 {
		pollInterval = 5
	}

	trackDir := localCopyDir
	if trackDir == "" {
		trackDir = "."
	}
	setTrackerDir(trackDir)

	var processed map[string]FileRecord
	if trackMode == "1" {
		processed = loadProcessed()
	}

	knownDrives := make(map[string]bool)
	for _, d := range getRemovableDrives() {
		knownDrives[d] = true
	}

	driveList := make([]string, 0, len(knownDrives))
	for d := range knownDrives {
		driveList = append(driveList, d)
	}
	logInfo("[USB-Storage] 开始监听, 间隔=%ds, 初始磁盘: %v", pollInterval, driveList)

	ticker := time.NewTicker(time.Duration(pollInterval) * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			logInfo("[USB-Storage] 监听已停止")
			return
		case <-ticker.C:
			currentDrives := make(map[string]bool)
			for _, d := range getRemovableDrives() {
				currentDrives[d] = true
			}

			// 盘符过滤
			if driveFilter != "" {
				filterSet := make(map[string]bool)
				for _, f := range strings.Split(driveFilter, ",") {
					f = strings.TrimSpace(f)
					f = strings.TrimSuffix(f, ":") + ":"
					filterSet[f] = true
				}
				for d := range currentDrives {
					if !filterSet[d] {
						delete(currentDrives, d)
					}
				}
			}

			for d := range currentDrives {
				if !knownDrives[d] {
					logInfo("[USB-Storage] 新磁盘: %s", d)
				}
			}
			for d := range knownDrives {
				if !currentDrives[d] {
					logInfo("[USB-Storage] 磁盘已移除: %s", d)
				}
			}

			currentFiles := make(map[string]bool)

			for d := range currentDrives {
				files := scanDriveFiles(d)
				for _, f := range files {
					relPath, _ := filepath.Rel(d+`\`, f.FullPath)
					trackingKey := strings.ReplaceAll(relPath, `\`, "/")
					currentFiles[trackingKey] = true

					if trackMode == "1" && processed != nil {
						fi, _ := os.Stat(f.FullPath)
						if fi != nil {
							mtime := fi.ModTime().UnixNano()
							rec, exists := processed[trackingKey]
							if exists && rec.Mtime == mtime && rec.Size == f.Size {
								continue
							}

							uploadPath := f.FullPath
							if localCopyDir != "" {
								dst := filepath.Join(localCopyDir, f.Name)
								copyFile(f.FullPath, dst)
								uploadPath = dst
							}

							ts := time.Now().Format("2006-01-02 15:04:05")
							result := uploadFile(uploadPath, instno, serviceURL, startRow, sampColFlag)
							if result.Success {
								logInfo("[USB-Storage] 成功: %s", trackingKey)
								processed[trackingKey] = FileRecord{
									Mtime:      mtime,
									Size:       f.Size,
									UploadedAt: ts,
									Source:     d + `\` + relPath,
								}
								saveProcessed(processed)
							} else {
								logInfo("[USB-Storage] 失败: %s - %s", trackingKey, result.Error)
							}
						}
					} else {
						uploadPath := f.FullPath
						if localCopyDir != "" {
							dst := filepath.Join(localCopyDir, f.Name)
							copyFile(f.FullPath, dst)
							uploadPath = dst
						}

						_ = time.Now().Format("2006-01-02 15:04:05")
						result := uploadFile(uploadPath, instno, serviceURL, startRow, sampColFlag)
						if result.Success {
							logInfo("[USB-Storage] 成功: %s", trackingKey)
						} else {
							logInfo("[USB-Storage] 失败: %s - %s", trackingKey, result.Error)
						}
					}
				}
			}

			// 清理已删除文件记录
			if trackMode == "1" && processed != nil {
				before := len(processed)
				processed = cleanStaleRecords(processed, currentFiles)
				if len(processed) < before {
					saveProcessed(processed)
				}
			}

			knownDrives = currentDrives
			// [2026-08-03] send heartbeat to server
			maybeHeartbeat("usb_storage", serviceURL)
		}
	}
}

func copyFile(src, dst string) error {
	data, err := os.ReadFile(src)
	if err != nil {
		return err
	}
	return os.WriteFile(dst, data, 0644)
}

func mapKeys(m map[string]bool) []string {
	var keys []string
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}