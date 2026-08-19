package main

import (
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"golang.org/x/sys/windows"
	"gopkg.in/ini.v1"
)

// 默认配置模板，与 Python 版完全一致
const defaultConfig = `[interface]
type = http
instno = ICPMS
filepath =
frequency = 20
service =
startrow = 1
sampcolflag = 样品名称
track_mode = 1
usb_mode = mass_storage
usb_drive_letters =
usb_poll_interval = 5
usb_local_copy_dir =
com_port = COM3
com_baudrate = 9600
com_bytesize = 8
com_stopbits = 1
com_parity = N
com_timeout = 0
com_line_terminator = \\r\\n
data_mode = file_first
usb_output_dir =
usb_filename_template = {instno}_{datetime}_{seq}.csv
stream_format = text_line
frame_header =
frame_footer =
frame_length = 0
allowed_extensions = .csv, .txt, .xls, .xlsx, .pdf, .doc
max_companion_files = 20
companion_arrival_window = 2
companion_match_mode = auto
file_stable_wait = 2
upload_retry_backoff = 1
max_retry_interval = 1800

# [2026-08-03] heartbeat
client_id =
client_type = go
client_ver = v1_20260810
lab_id =
heartbeat_interval = 60
client_api_enabled = 1
# 凭证功能停用；以下配置保留为注释，当前运行不要求填写。
# auth_key_id =
# client_secret =
config_pull_interval = 300
`

var (
	cfgFile  string
	cfgMu    sync.RWMutex
	cfgCache *ini.File
)

// 设置配置文件路径（exe 所在目录下的 config.ini）
func setConfigPath(exeDir string) {
	cfgFile = filepath.Join(exeDir, "config.ini")
}

// 首次运行时自动生成 config.ini
func ensureConfig() error {
	if _, err := os.Stat(cfgFile); os.IsNotExist(err) {
		if err := os.WriteFile(cfgFile, []byte(defaultConfig), 0644); err != nil {
			return fmt.Errorf("生成默认配置文件失败: %w", err)
		}
		logInfo("已生成默认配置文件: %s", cfgFile)
	}
	return nil
}

// 加载或重新加载配置文件
func loadConfig() error {
	cfgMu.Lock()
	defer cfgMu.Unlock()

	f, err := ini.Load(cfgFile)
	if err != nil {
		// 如果加载失败，尝试用默认配置
		f = ini.Empty()
		_ = f.Append([]byte(defaultConfig), defaultConfig)
	}
	cfgCache = f
	return nil
}

// getCfg 读取配置值，缺失时返回 fallback
func getCfg(section, key, fallback string) string {
	cfgMu.RLock()
	defer cfgMu.RUnlock()

	if cfgCache == nil {
		return fallback
	}
	sec := cfgCache.Section(section)
	if !sec.HasKey(key) {
		return fallback
	}
	return sec.Key(key).String()
}

// getCfgInt 读取整数配置
func getCfgInt(section, key string, fallback int) int {
	s := getCfg(section, key, strconv.Itoa(fallback))
	v, err := strconv.Atoi(strings.TrimSpace(s))
	if err != nil {
		return fallback
	}
	return v
}

// getCfgList 读取逗号分隔的字符串列表配置
// 例如: ".csv, .txt, .xls" → [".csv", ".txt", ".xls"]
func getCfgList(section, key string) []string {
	s := getCfg(section, key, "")
	if strings.TrimSpace(s) == "" {
		return nil
	}
	parts := strings.Split(s, ",")
	result := make([]string, 0, len(parts))
	for _, p := range parts {
		p = strings.TrimSpace(p)
		if p != "" {
			result = append(result, strings.ToLower(p))
		}
	}
	return result
}

// getCfgFloat 读取浮点配置
func getCfgFloat(section, key string, fallback float64) float64 {
	s := getCfg(section, key, fmt.Sprintf("%v", fallback))
	v, err := strconv.ParseFloat(strings.TrimSpace(s), 64)
	if err != nil {
		return fallback
	}
	return v
}

// applyRemotePolicy writes a validated HTTP policy through a same-directory temp file.
// MoveFileEx(REPLACE_EXISTING|WRITE_THROUGH) gives Windows replacement semantics and a backup is retained.
func applyRemotePolicy(updates map[string]string, version, policyHash string) error {
	cfgMu.Lock()
	defer cfgMu.Unlock()

	f, err := ini.Load(cfgFile)
	if err != nil {
		return fmt.Errorf("读取配置文件失败: %w", err)
	}
	sec := f.Section("interface")
	for key, value := range updates {
		sec.Key(key).SetValue(value)
	}
	remote := f.Section("remote_policy")
	remote.Key("current_version").SetValue(version)
	remote.Key("current_hash").SetValue(policyHash)
	remote.Key("applied_at").SetValue(time.Now().Format("2006-01-02 15:04:05"))

	tmp := cfgFile + ".tmp"
	if err := f.SaveTo(tmp); err != nil {
		return fmt.Errorf("写入临时配置失败: %w", err)
	}
	defer os.Remove(tmp)
	if existing, err := os.ReadFile(cfgFile); err == nil {
		_ = os.WriteFile(cfgFile+".bak", existing, 0600)
	}
	from, err := windows.UTF16PtrFromString(tmp)
	if err != nil {
		return err
	}
	to, err := windows.UTF16PtrFromString(cfgFile)
	if err != nil {
		return err
	}
	if err := windows.MoveFileEx(from, to, windows.MOVEFILE_REPLACE_EXISTING|windows.MOVEFILE_WRITE_THROUGH); err != nil {
		return fmt.Errorf("原子替换配置失败: %w", err)
	}
	cfgCache = f
	return nil
}
