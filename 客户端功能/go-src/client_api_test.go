package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestPostClientAPIWithoutCredentialAndPolicyValidation(t *testing.T) {
	var handlerErr error
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if err := r.ParseMultipartForm(1024 * 1024); err != nil {
			handlerErr = err
			http.Error(w, err.Error(), 400)
			return
		}
		rawJSON, _ := url.QueryUnescape(r.FormValue("dataquote"))
		var payload map[string]interface{}
		if err := json.Unmarshal([]byte(rawJSON), &payload); err != nil {
			handlerErr = err
			http.Error(w, err.Error(), 400)
			return
		}
		// 原凭证签名校验测试按当前业务要求停用，代码位置保留便于将来恢复。
		// canonical := fmt.Sprint(payload["client_id"]) + "\n" + r.FormValue("auth_timestamp") + "\n" +
		// 	r.FormValue("auth_nonce") + "\n" + rawJSON
		// mac := hmac.New(sha256.New, []byte(secret))
		// _, _ = mac.Write([]byte(canonical))
		// if hex.EncodeToString(mac.Sum(nil)) != r.FormValue("auth_signature") { ... }
		if r.FormValue("auth_signature") != "" {
			http.Error(w, "credential fields must be inactive", 400)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_, _ = w.Write([]byte(`{"result":"success","params":{"changed":false}}`))
	}))
	defer server.Close()

	temp := t.TempDir()
	watch := filepath.Join(temp, "watch")
	if err := os.Mkdir(watch, 0700); err != nil {
		t.Fatal(err)
	}
	cfgFile = filepath.Join(temp, "config.ini")
	configText := "[interface]\nclient_id=TEST-01\ninstno=TEST-01\n" +
		"client_api_enabled=1\nservice=" + server.URL + "\n"
	if err := os.WriteFile(cfgFile, []byte(configText), 0600); err != nil {
		t.Fatal(err)
	}
	if err := loadConfig(); err != nil {
		t.Fatal(err)
	}
	result, err := postClientAPI("UploadClientLog.m", map[string]interface{}{"status": "RUNNING"}, 0)
	if err != nil {
		t.Fatal(err)
	}
	if handlerErr != nil {
		t.Fatal(handlerErr)
	}
	if changed, _ := result["changed"].(bool); changed {
		t.Fatal("unexpected changed=true")
	}

	updates, err := validateRemotePolicy(map[string]interface{}{
		"client_id": "TEST-01", "instno": "TEST-01", "interface_type": "http",
		"file_path": watch, "scan_interval": 10, "service_url": server.URL + "/UploadInstDataFilesNew.m",
		"start_row": 1, "track_mode": 1, "allowed_extensions": ".pdf,.txt",
		"max_companion_files": 2, "heartbeat_interval": 60,
	})
	if err != nil {
		t.Fatal(err)
	}
	if err := applyRemotePolicy(updates, "v1_20260810", strings.Repeat("a", 64)); err != nil {
		t.Fatal(err)
	}
	if got := getCfg("interface", "service", ""); got != server.URL {
		t.Fatalf("service=%q, want %q", got, server.URL)
	}
}
