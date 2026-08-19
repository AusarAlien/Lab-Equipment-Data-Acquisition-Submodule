package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sync"
)

// FileRecord 追踪文件处理记录
type FileRecord struct {
	Mtime         int64  `json:"mtime"`           // st_mtime_ns
	Size          int64  `json:"size"`            // 文件大小
	UploadedAt    string `json:"uploaded_at"`     // 上传时间
	Source        string `json:"source,omitempty"`
	FailCount     int    `json:"fail_count"`      // 连续失败次数
	LastFailTime  string `json:"last_fail_time"`  // 最后失败时间
	NextRetryTime string `json:"next_retry_time"` // 下次可重试时间
}

var (
	trackerMu   sync.Mutex
	trackerPath string // 追踪文件存储目录
)

func setTrackerDir(dir string) {
	trackerPath = filepath.Join(dir, "processed_files.json")
}

// loadProcessed 加载已处理文件记录
func loadProcessed() map[string]FileRecord {
	trackerMu.Lock()
	defer trackerMu.Unlock()

	records := make(map[string]FileRecord)
	data, err := os.ReadFile(trackerPath)
	if err != nil {
		return records
	}
	json.Unmarshal(data, &records)
	return records
}

// saveProcessed 原子写入已处理文件记录
func saveProcessed(records map[string]FileRecord) {
	trackerMu.Lock()
	defer trackerMu.Unlock()

	data, err := json.MarshalIndent(records, "", "  ")
	if err != nil {
		logError("序列化追踪文件失败: %v", err)
		return
	}
	tmpPath := trackerPath + ".tmp"
	if err := os.WriteFile(tmpPath, data, 0644); err != nil {
		logError("写入追踪文件失败: %v", err)
		return
	}
	if err := os.Rename(tmpPath, trackerPath); err != nil {
		logError("追踪文件原子重命名失败: %v", err)
	}
}

// cleanStaleRecords 清理已不存在文件的记录
func cleanStaleRecords(records map[string]FileRecord, currentFiles map[string]bool) map[string]FileRecord {
	removed := 0
	for name := range records {
		if !currentFiles[name] {
			delete(records, name)
			removed++
		}
	}
	if removed > 0 {
		logInfo("清理已删除记录: %d 条", removed)
	}
	return records
}

// calcRetryBackoff 计算指数退避延迟（秒）：1→0, 2→60, 3→120, 4→240, ... 上限 maxInterval
func calcRetryBackoff(failCount, maxInterval int) int {
	if failCount <= 1 {
		return 0
	}
	delay := 60
	for i := 2; i < failCount; i++ {
		delay *= 2
	}
	if delay > maxInterval {
		return maxInterval
	}
	return delay
}

// shouldSkipBackoff 检查文件是否处于退避等待期
func shouldSkipBackoff(name string, processed map[string]FileRecord, now float64) bool {
	rec, ok := processed[name]
	if !ok || rec.NextRetryTime == "" {
		return false
	}
	var next float64
	if _, err := fmt.Sscanf(rec.NextRetryTime, "%f", &next); err == nil && next > now {
		return true
	}
	return false
}
