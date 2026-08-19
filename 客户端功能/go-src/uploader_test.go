package main

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func TestPythonQuote(t *testing.T) {
	const input = `空 格+号/~.csv`
	const want = `%E7%A9%BA%20%E6%A0%BC%2B%E5%8F%B7/~.csv`
	if got := pythonQuote(input); got != want {
		t.Fatalf("pythonQuote() = %q, want %q", got, want)
	}
}

func TestUploadFileMatchesPythonMultipartContract(t *testing.T) {
	const fileContent = "样品名称,测定值\n样品1,1.23\n"
	var handlerError string

	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			handlerError = err.Error()
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		dataPos := strings.Index(string(body), `name="dataquote"`)
		sessionPos := strings.Index(string(body), `name="sessionId"`)
		filePos := strings.Index(string(body), `name="file"`)
		if dataPos < 0 || sessionPos < 0 || filePos < 0 ||
			!(dataPos < sessionPos && sessionPos < filePos) {
			handlerError = "multipart fields are not in Python requests order"
			http.Error(w, handlerError, http.StatusBadRequest)
			return
		}

		r.Body = io.NopCloser(strings.NewReader(string(body)))
		if err := r.ParseMultipartForm(1 << 20); err != nil {
			handlerError = err.Error()
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		encodedJSON := r.FormValue("dataquote")
		jsonText, err := url.QueryUnescape(encodedJSON)
		if err != nil {
			handlerError = err.Error()
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		var params map[string]string
		if err := json.Unmarshal([]byte(jsonText), &params); err != nil {
			handlerError = err.Error()
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		if params["instno"] != "ICPMS" ||
			params["sessionId"] != "FIXEDS11" ||
			params["startrow"] != "1" ||
			params["sampcolflag"] != "样品名称" ||
			len(params["fguid"]) != 32 {
			handlerError = "unexpected dataquote fields"
			http.Error(w, handlerError, http.StatusBadRequest)
			return
		}

		file, header, err := r.FormFile("file")
		if err != nil {
			handlerError = err.Error()
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		defer file.Close()
		if header.Filename != pythonQuote("空 格+号.csv") {
			handlerError = "unexpected encoded filename"
			http.Error(w, handlerError, http.StatusBadRequest)
			return
		}
		uploaded, _ := io.ReadAll(file)
		if string(uploaded) != fileContent {
			handlerError = "uploaded file content mismatch"
			http.Error(w, handlerError, http.StatusBadRequest)
			return
		}

		w.Header().Set("Content-Type", "application/json")
		_, _ = io.WriteString(w, `{"result":"success"}`)
	}))
	defer server.Close()

	tempDir := t.TempDir()
	filePath := filepath.Join(tempDir, "空 格+号.csv")
	if err := os.WriteFile(filePath, []byte(fileContent), 0600); err != nil {
		t.Fatal(err)
	}

	result := uploadFile(filePath, "ICPMS", server.URL, "1", "样品名称")
	if handlerError != "" {
		t.Fatal(handlerError)
	}
	if !result.Success {
		t.Fatalf("uploadFile() failed: %s, response=%s", result.Error, result.Resp)
	}
}
