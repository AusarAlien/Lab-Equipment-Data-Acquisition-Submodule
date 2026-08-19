package main

import (
	"bytes"
	"crypto/rand"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

// 上传结果
type uploadResult struct {
	Success bool
	Error   string
	Resp    string
}

// uploadFiles 批量上传文件到服务端（主文件 + 伴生文件一起上传）
// 所有文件落在服务器同一临时目录，解析器可自动发现伴生文件
func uploadFiles(fullPaths []string, instno, serviceURL, startRow, sampColFlag string) uploadResult {
	started := time.Now()
	if len(fullPaths) == 0 {
		return uploadResult{Success: false, Error: "文件列表为空"}
	}
	if len(fullPaths) == 1 {
		return uploadFile(fullPaths[0], instno, serviceURL, startRow, sampColFlag)
	}

	// 构造 dataquote JSON（与单文件一致）
	data := map[string]string{
		"instno":      instno,
		"sessionId":   "FIXEDS11",
		"fguid":       generateGUID(),
		"startrow":    startRow,
		"sampcolflag": sampColFlag,
	}
	var jsonBuffer bytes.Buffer
	jsonEncoder := json.NewEncoder(&jsonBuffer)
	jsonEncoder.SetEscapeHTML(false)
	if err := jsonEncoder.Encode(data); err != nil {
		return uploadResult{Success: false, Error: fmt.Sprintf("序列化上传参数失败: %v", err)}
	}
	jsonStr := strings.TrimSuffix(jsonBuffer.String(), "\n")

	// multipart/form-data
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	if err := writer.WriteField("dataquote", pythonQuote(jsonStr)); err != nil {
		return uploadResult{Success: false, Error: fmt.Sprintf("写入上传参数失败: %v", err)}
	}
	if err := writer.WriteField("sessionId", "FIXEDS11"); err != nil {
		return uploadResult{Success: false, Error: fmt.Sprintf("写入会话参数失败: %v", err)}
	}

	// 添加所有文件（同一 "file" 字段名，服务器 myFiles 可遍历全部）
	for _, fullPath := range fullPaths {
		filename := filepath.Base(fullPath)
		file, err := os.Open(fullPath)
		if err != nil {
			return uploadResult{Success: false, Error: fmt.Sprintf("无法打开文件 %s: %v", filename, err)}
		}

		part, err := writer.CreateFormFile("file", pythonQuote(filename))
		if err != nil {
			file.Close()
			return uploadResult{Success: false, Error: fmt.Sprintf("创建表单字段失败: %v", err)}
		}
		if _, err := io.Copy(part, file); err != nil {
			file.Close()
			return uploadResult{Success: false, Error: fmt.Sprintf("读取文件失败: %v", err)}
		}
		file.Close()
	}

	if err := writer.Close(); err != nil {
		return uploadResult{Success: false, Error: fmt.Sprintf("完成上传表单失败: %v", err)}
	}

	// 发送请求
	uploadURL := serviceURL + "/UploadInstDataFilesNew.m"

	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.Proxy = nil
	client := &http.Client{
		Timeout:   60 * time.Second, // 多文件上传给更多时间
		Transport: transport,
	}
	req, err := http.NewRequest("POST", uploadURL, &body)
	if err != nil {
		return uploadResult{Success: false, Error: fmt.Sprintf("创建请求失败: %v", err)}
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := client.Do(req)
	if err != nil {
		return uploadResult{Success: false, Error: fmt.Sprintf("连接失败: %v", err)}
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 1024*1024))

	var respJSON map[string]interface{}
	if err := json.Unmarshal(respBody, &respJSON); err != nil {
		return uploadResult{
			Success: false,
			Error:   fmt.Sprintf("响应解析失败: %v", err),
			Resp:    responsePreview(respBody),
		}
	}

	result, _ := respJSON["result"].(string)
	if result == "success" {
		recordUpload(true)
		completed := uploadResult{Success: true}
		go reportUploadEvent(fullPaths, completed, started)
		return completed
	}

	recordUpload(false)
	completed := uploadResult{
		Success: false,
		Error:   "服务器返回失败",
		Resp:    responsePreview(respBody),
	}
	go reportUploadEvent(fullPaths, completed, started)
	return completed
}

// uploadFile 上传单个文件到服务端
// 与 Python 版 upload_single_file 行为完全一致
func uploadFile(fullPath, instno, serviceURL, startRow, sampColFlag string) uploadResult {
	started := time.Now()
	filename := filepath.Base(fullPath)

	// 构造 dataquote JSON
	data := map[string]string{
		"instno":      instno,
		"sessionId":   "FIXEDS11",
		"fguid":       generateGUID(),
		"startrow":    startRow,
		"sampcolflag": sampColFlag,
	}
	var jsonBuffer bytes.Buffer
	jsonEncoder := json.NewEncoder(&jsonBuffer)
	jsonEncoder.SetEscapeHTML(false)
	if err := jsonEncoder.Encode(data); err != nil {
		return uploadResult{Success: false, Error: fmt.Sprintf("序列化上传参数失败: %v", err)}
	}
	jsonStr := strings.TrimSuffix(jsonBuffer.String(), "\n")

	// multipart/form-data
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)

	// 与 Python requests 保持一致：普通字段在前，文件字段在后。
	if err := writer.WriteField("dataquote", pythonQuote(jsonStr)); err != nil {
		return uploadResult{Success: false, Error: fmt.Sprintf("写入上传参数失败: %v", err)}
	}
	if err := writer.WriteField("sessionId", "FIXEDS11"); err != nil {
		return uploadResult{Success: false, Error: fmt.Sprintf("写入会话参数失败: %v", err)}
	}

	// 文件字段
	file, err := os.Open(fullPath)
	if err != nil {
		return uploadResult{Success: false, Error: fmt.Sprintf("无法打开文件: %v", err)}
	}
	defer file.Close()

	part, err := writer.CreateFormFile("file", pythonQuote(filename))
	if err != nil {
		return uploadResult{Success: false, Error: fmt.Sprintf("创建表单字段失败: %v", err)}
	}
	if _, err := io.Copy(part, file); err != nil {
		return uploadResult{Success: false, Error: fmt.Sprintf("读取文件失败: %v", err)}
	}

	if err := writer.Close(); err != nil {
		return uploadResult{Success: false, Error: fmt.Sprintf("完成上传表单失败: %v", err)}
	}

	// 发送请求
	uploadURL := serviceURL + "/UploadInstDataFilesNew.m"

	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.Proxy = nil
	client := &http.Client{
		Timeout:   30 * time.Second,
		Transport: transport,
	}
	req, err := http.NewRequest("POST", uploadURL, &body)
	if err != nil {
		return uploadResult{Success: false, Error: fmt.Sprintf("创建请求失败: %v", err)}
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := client.Do(req)
	if err != nil {
		return uploadResult{Success: false, Error: fmt.Sprintf("连接失败: %v", err)}
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 1024*1024))

	// 解析 JSON 响应
	var respJSON map[string]interface{}
	if err := json.Unmarshal(respBody, &respJSON); err != nil {
		return uploadResult{
			Success: false,
			Error:   fmt.Sprintf("响应解析失败: %v", err),
			Resp:    responsePreview(respBody),
		}
	}

	result, _ := respJSON["result"].(string)
	if result == "success" {
		recordUpload(true)
		completed := uploadResult{Success: true}
		go reportUploadEvent([]string{fullPath}, completed, started)
		return completed
	}

	recordUpload(false)
	completed := uploadResult{
		Success: false,
		Error:   "服务器返回失败",
		Resp:    responsePreview(respBody),
	}
	go reportUploadEvent([]string{fullPath}, completed, started)
	return completed
}

// generateGUID 生成 32 位大写 UUID
func generateGUID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		now := time.Now().UnixNano()
		for i := range b {
			b[i] = byte(now>>(uint(i%8)*8)) ^ byte(i*31+17)
		}
	}
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%02X%02X%02X%02X%02X%02X%02X%02X%02X%02X%02X%02X%02X%02X%02X%02X",
		b[0], b[1], b[2], b[3], b[4], b[5], b[6], b[7],
		b[8], b[9], b[10], b[11], b[12], b[13], b[14], b[15])
}

func responsePreview(data []byte) string {
	const limit = 200
	if len(data) > limit {
		data = data[:limit]
	}
	return string(data)
}

// ── [2026-08-03] heartbeat ──

var (
	hbSeq         int64
	hbUploadTotal int64
	hbUploadFail  int64
	hbStartTime   = time.Now()
	hbLastTime    time.Time
	hbMu          sync.Mutex
)

// recordUpload increments heartbeat upload counters (atomic for safe concurrent use)
func recordUpload(success bool) {
	if success {
		atomic.AddInt64(&hbUploadTotal, 1)
	} else {
		atomic.AddInt64(&hbUploadFail, 1)
	}
}

// maybeHeartbeat sends client status to server at the configured interval
func maybeHeartbeat(mode, serviceURL string) {
	interval := getCfgInt("interface", "heartbeat_interval", 60)
	if interval <= 0 || serviceURL == "" || !clientAPIEnabled() {
		return
	}
	hbMu.Lock()
	if time.Since(hbLastTime) < time.Duration(interval)*time.Second {
		hbMu.Unlock()
		return
	}
	hbLastTime = time.Now()
	seq := atomic.AddInt64(&hbSeq, 1)
	hbMu.Unlock()

	data := map[string]interface{}{
		"client_id":     getCfg("interface", "client_id", ""),
		"client_type":   getCfg("interface", "client_type", "go"),
		"client_ver":    getCfg("interface", "client_ver", "1.0.0"),
		"lab_id":        getCfg("interface", "lab_id", ""),
		"instno":        getCfg("interface", "instno", ""),
		"heartbeat_seq": seq,
		"status":        "running",
		"mode":          mode,
		"upload_total":  atomic.LoadInt64(&hbUploadTotal),
		"upload_fail":   atomic.LoadInt64(&hbUploadFail),
		"uptime_sec":    int64(time.Since(hbStartTime).Seconds()),
		"os":            runtime.GOOS + " " + runtime.GOARCH,
		"run_id":        clientRunID,
	}
	if _, err := postClientAPI("UploadClientLog.m", data, 5*time.Second); err != nil {
		logError("客户端心跳未送达: %v", err)
	} else {
		logInfo("心跳上报成功 | 序号=%d 成功=%d 失败=%d", seq, atomic.LoadInt64(&hbUploadTotal), atomic.LoadInt64(&hbUploadFail))
	}
	maybePullClientConfig()
}

// pythonQuote matches urllib.parse.quote(value, safe="/") for UTF-8 input.
func pythonQuote(value string) string {
	const hex = "0123456789ABCDEF"
	var escaped strings.Builder
	escaped.Grow(len(value))
	for i := 0; i < len(value); i++ {
		c := value[i]
		if (c >= 'a' && c <= 'z') ||
			(c >= 'A' && c <= 'Z') ||
			(c >= '0' && c <= '9') ||
			c == '-' || c == '_' || c == '.' || c == '~' || c == '/' {
			escaped.WriteByte(c)
			continue
		}
		escaped.WriteByte('%')
		escaped.WriteByte(hex[c>>4])
		escaped.WriteByte(hex[c&0x0f])
	}
	return escaped.String()
}
