package main

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

var (
	clientRunID    = generateGUID()
	policyPullMu   sync.Mutex
	lastPolicyPull time.Time
)

func normalizeAPIResponse(value map[string]interface{}) map[string]interface{} {
	result := make(map[string]interface{}, len(value)+8)
	for k, v := range value {
		result[k] = v
	}
	for _, key := range []string{"params", "outParams", "data"} {
		if nested, ok := value[key].(map[string]interface{}); ok {
			for k, v := range nested {
				result[k] = v
			}
		}
	}
	return result
}

func clientAPIEnabled() bool {
	value := strings.TrimSpace(getCfg("interface", "client_api_enabled", "1"))
	return !strings.EqualFold(value, "0") &&
		!strings.EqualFold(value, "false") &&
		!strings.EqualFold(value, "no") &&
		value != "否"
}

func postClientAPI(endpoint string, payload map[string]interface{}, timeout time.Duration) (map[string]interface{}, error) {
	if !clientAPIEnabled() {
		return nil, fmt.Errorf("客户端运行接口已禁用")
	}
	clientID := strings.TrimSpace(getCfg("interface", "client_id", ""))
	instno := strings.TrimSpace(getCfg("interface", "instno", ""))
	// 凭证配置读取停用；保留代码便于将来恢复签名调用。
	// keyID := strings.TrimSpace(getCfg("interface", "auth_key_id", ""))
	// secret := getCfg("interface", "client_secret", "")
	service := strings.TrimRight(strings.TrimSpace(getCfg("interface", "service", "")), "/")
	// 客户端凭证功能当前停用；原必填判断保留为注释，便于将来恢复。
	// if clientID == "" || instno == "" || keyID == "" || secret == "" || service == "" {
	// 	return nil, fmt.Errorf("客户端接口配置不完整(client_id/instno/auth_key_id/client_secret/service)")
	// }
	if clientID == "" || instno == "" || service == "" {
		return nil, fmt.Errorf("客户端接口配置不完整(client_id/instno/service)")
	}
	if payload == nil {
		payload = make(map[string]interface{})
	}
	payload["client_id"] = clientID
	if _, ok := payload["instno"]; !ok {
		payload["instno"] = instno
	}
	raw, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("序列化客户端请求失败: %w", err)
	}
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	_ = writer.WriteField("dataquote", pythonQuote(string(raw)))
	// 凭证字段生成与签名代码保留在 writeCredentialFields 中，当前不写入请求。
	// writeCredentialFields(writer, clientID, keyID, secret, raw)
	part, _ := writer.CreateFormFile("dummy", "")
	_, _ = part.Write(nil)
	if err := writer.Close(); err != nil {
		return nil, err
	}

	transport := http.DefaultTransport.(*http.Transport).Clone()
	transport.Proxy = nil
	client := &http.Client{Timeout: timeout, Transport: transport}
	req, err := http.NewRequest("POST", service+"/"+strings.TrimLeft(endpoint, "/"), &body)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", writer.FormDataContentType())
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()
	responseBody, err := io.ReadAll(io.LimitReader(resp.Body, 2*1024*1024))
	if err != nil {
		return nil, err
	}
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return nil, fmt.Errorf("HTTP %d: %s", resp.StatusCode, responsePreview(responseBody))
	}
	var decoded map[string]interface{}
	if err := json.Unmarshal(responseBody, &decoded); err != nil {
		return nil, fmt.Errorf("响应解析失败: %w", err)
	}
	result := normalizeAPIResponse(decoded)
	status := strings.ToLower(fmt.Sprint(result["result"]))
	if status != "success" && status != "ok" {
		message := fmt.Sprint(result["message"])
		if message == "<nil>" || message == "" {
			message = fmt.Sprint(result["code"])
		}
		return nil, fmt.Errorf("%s", message)
	}
	return result, nil
}

// writeCredentialFields 保留原客户端凭证签名实现。
// 当前业务已取消凭证必要性，因此 postClientAPI 不调用本函数。
func writeCredentialFields(writer *multipart.Writer, clientID, keyID, secret string, raw []byte) {
	timestamp := strconv.FormatInt(time.Now().Unix(), 10)
	nonce := generateGUID()
	canonical := clientID + "\n" + timestamp + "\n" + nonce + "\n" + string(raw)
	mac := hmac.New(sha256.New, []byte(secret))
	_, _ = mac.Write([]byte(canonical))
	signature := hex.EncodeToString(mac.Sum(nil))
	_ = writer.WriteField("auth_key_id", keyID)
	_ = writer.WriteField("auth_timestamp", timestamp)
	_ = writer.WriteField("auth_nonce", nonce)
	_ = writer.WriteField("auth_signature", signature)
}

func sendClientEvent(logType, level, resultStatus, fileName, message string, fileSize, durationMS int64, rawDetail string) {
	if !clientAPIEnabled() {
		return
	}
	payload := map[string]interface{}{
		"event_id":      generateGUID(),
		"event_time":    time.Now().Unix(),
		"mode":          "http",
		"run_id":        clientRunID,
		"log_type":      logType,
		"log_level":     level,
		"result_status": resultStatus,
		"file_name":     fileName,
		"file_size":     fileSize,
		"message":       message,
		"duration_ms":   durationMS,
		"retry_count":   0,
		"raw_detail":    rawDetail,
	}
	if _, err := postClientAPI("UploadClientEvent.m", payload, 6*time.Second); err != nil {
		logError("客户端事件未送达: %v", err)
	}
}

func reportUploadEvent(paths []string, result uploadResult, started time.Time) {
	var total int64
	var names []string
	for _, path := range paths {
		names = append(names, filepathBase(path))
		if info, err := os.Stat(path); err == nil {
			total += info.Size()
		}
	}
	name := strings.Join(names, "; ")
	if len(name) > 500 {
		name = name[:500]
	}
	if result.Success {
		sendClientEvent("UPLOAD_SUCCESS", "INFO", "SUCCESS", name, "文件上传成功",
			total, time.Since(started).Milliseconds(), result.Resp)
	} else {
		sendClientEvent("UPLOAD_FAIL", "ERROR", "FAILED", name, result.Error,
			total, time.Since(started).Milliseconds(), result.Resp)
	}
}

func filepathBase(path string) string {
	path = strings.ReplaceAll(path, "\\", "/")
	if pos := strings.LastIndex(path, "/"); pos >= 0 {
		return path[pos+1:]
	}
	return path
}

func valueString(config map[string]interface{}, key string) string {
	if config[key] == nil {
		return ""
	}
	return strings.TrimSpace(fmt.Sprint(config[key]))
}

func positivePolicyInt(config map[string]interface{}, key string, allowZero bool) (string, error) {
	value := valueString(config, key)
	number, err := strconv.Atoi(value)
	if err != nil || number < 0 || (!allowZero && number == 0) {
		return "", fmt.Errorf("策略字段%s取值无效", key)
	}
	return strconv.Itoa(number), nil
}

func validateRemotePolicy(config map[string]interface{}) (map[string]string, error) {
	clientID := strings.TrimSpace(getCfg("interface", "client_id", ""))
	instno := strings.TrimSpace(getCfg("interface", "instno", ""))
	if valueString(config, "client_id") != clientID {
		return nil, fmt.Errorf("策略客户端编号不匹配")
	}
	if !strings.EqualFold(valueString(config, "instno"), instno) {
		return nil, fmt.Errorf("策略仪器编号不匹配")
	}
	if !strings.EqualFold(valueString(config, "interface_type"), "http") {
		return nil, fmt.Errorf("当前客户端只允许HTTP采集策略")
	}
	filePath := valueString(config, "file_path")
	if info, err := os.Stat(filePath); err != nil || !info.IsDir() {
		return nil, fmt.Errorf("策略监听目录不存在: %s", filePath)
	}
	service := strings.TrimRight(valueString(config, "service_url"), "/")
	service = strings.TrimSuffix(service, "/UploadInstDataFilesNew.m")
	if !strings.HasPrefix(strings.ToLower(service), "http://") && !strings.HasPrefix(strings.ToLower(service), "https://") {
		return nil, fmt.Errorf("策略服务地址无效")
	}
	frequency, err := positivePolicyInt(config, "scan_interval", false)
	if err != nil {
		return nil, err
	}
	startRow, err := positivePolicyInt(config, "start_row", true)
	if err != nil {
		return nil, err
	}
	maxCompanion, err := positivePolicyInt(config, "max_companion_files", true)
	if err != nil {
		return nil, err
	}
	heartbeat, err := positivePolicyInt(config, "heartbeat_interval", false)
	if err != nil {
		return nil, err
	}
	extensions := valueString(config, "allowed_extensions")
	if extensions == "" {
		return nil, fmt.Errorf("策略允许扩展名不能为空")
	}
	trackMode := "0"
	if valueString(config, "track_mode") == "1" {
		trackMode = "1"
	}
	return map[string]string{
		"type": "http", "filepath": filePath, "frequency": frequency,
		"service": service, "startrow": startRow,
		"sampcolflag": valueString(config, "samp_col_flag"), "track_mode": trackMode,
		"allowed_extensions": extensions, "max_companion_files": maxCompanion,
		"heartbeat_interval": heartbeat, "archive_mode": valueString(config, "archive_mode"),
		"data_mode":             valueString(config, "data_mode"),
		"usb_output_dir":        valueString(config, "output_dir"),
		"usb_filename_template": valueString(config, "file_name_template"),
	}, nil
}

func pullAndApplyConfig() (bool, error) {
	result, err := postClientAPI("GetClientConfig.m", map[string]interface{}{
		"mode":                "http",
		"current_policy_ver":  getCfg("remote_policy", "current_version", ""),
		"current_policy_hash": getCfg("remote_policy", "current_hash", ""),
	}, 8*time.Second)
	if err != nil {
		return false, err
	}
	changed, _ := result["changed"].(bool)
	if !changed {
		return false, nil
	}
	version := strings.TrimSpace(fmt.Sprint(result["policy_ver"]))
	policyHash := strings.ToLower(strings.TrimSpace(fmt.Sprint(result["policy_hash"])))
	config, ok := result["config"].(map[string]interface{})
	if !ok || version == "" || len(policyHash) != 64 {
		return false, fmt.Errorf("服务端策略版本、摘要或内容无效")
	}
	updates, applyErr := validateRemotePolicy(config)
	if applyErr == nil {
		applyErr = applyRemotePolicy(updates, version, policyHash)
	}
	status, message := "SUCCESS", "客户端已原子应用HTTP采集策略"
	if applyErr != nil {
		status, message = "FAILED", applyErr.Error()
	}
	_, ackErr := postClientAPI("UploadClientConfigAck.m", map[string]interface{}{
		"policy_ver": version, "policy_hash": policyHash,
		"apply_status": status, "apply_message": message,
	}, 8*time.Second)
	if ackErr != nil {
		logError("策略应用回执未送达: %v", ackErr)
	}
	if applyErr != nil {
		return false, applyErr
	}
	logInfo("已应用远程策略: %s", version)
	return true, nil
}

func maybePullClientConfig() {
	policyPullMu.Lock()
	defer policyPullMu.Unlock()
	interval := getCfgInt("interface", "config_pull_interval", 300)
	if interval <= 0 || (!lastPolicyPull.IsZero() && time.Since(lastPolicyPull) < time.Duration(interval)*time.Second) {
		return
	}
	lastPolicyPull = time.Now()
	changed, err := pullAndApplyConfig()
	if err != nil {
		logError("远程策略同步失败: %v", err)
	} else if !changed {
		logInfo("策略检查完成: 当前已是最新版本")
	}
}
