package main

import (
	"bufio"
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

// runHTTPMonitor HTTP 目录监听模式
// 每隔 frequency 秒扫描 watch_dir，上传新文件到服务端
func runHTTPMonitor(ctx context.Context) {
	watchDir := getCfg("interface", "filepath", "")
	if watchDir == "" || !dirExists(watchDir) {
		logError("HTTP监听: 目录未配置或不存在: %s", watchDir)
		return
	}

	instno := getCfg("interface", "instno", "")
	serviceURL := getCfg("interface", "service", "")
	frequency := getCfgInt("interface", "frequency", 20)
	startRow := getCfg("interface", "startrow", "1")
	sampColFlag := getCfg("interface", "sampcolflag", "样品名称")
	trackMode := getCfg("interface", "track_mode", "0")

	if frequency < 1 {
		frequency = 20
	}

	setTrackerDir(watchDir)
	var processed map[string]FileRecord
	if trackMode == "1" {
		processed = loadProcessed()
	}

	// [2026-08-10] 到达窗口追踪
	pendingTxts := make(map[string]float64)

	logInfo("[HTTP] 开始监听目录: %s (间隔 %ds)", watchDir, frequency)

	ticker := time.NewTicker(time.Duration(frequency) * time.Second)
	defer ticker.Stop()

	scanAndUpload(watchDir, instno, serviceURL, startRow, sampColFlag, trackMode, &processed, pendingTxts)

	for {
		select {
		case <-ctx.Done():
			logInfo("[HTTP] 监听已停止")
			return
		case <-ticker.C:
			scanAndUpload(watchDir, instno, serviceURL, startRow, sampColFlag, trackMode, &processed, pendingTxts)
		}
	}
}

// extractTxtGroupName 读取 TXT 标题行提取组别名，与服务端 AxioImagerZ2.extractTxtGroupName 逻辑一致
func extractTxtGroupName(filepath_ string) string {
	f, err := os.Open(filepath_)
	if err != nil {
		return ""
	}
	defer f.Close()

	// 只读前 512 字节（标题行通常很短）
	buf := make([]byte, 512)
	n, _ := f.Read(buf)
	firstLine := string(buf[:n])
	if idx := strings.IndexByte(firstLine, '\n'); idx >= 0 {
		firstLine = firstLine[:idx]
	}
	if idx := strings.IndexByte(firstLine, '\r'); idx >= 0 {
		firstLine = firstLine[:idx]
	}

	// 尝试 GBK 解码的简化方式：直接搜索 "Metafer" 关键字
	metaIdx := strings.Index(firstLine, "Metafer")
	if metaIdx < 0 {
		// 尝试 UTF-8 读取
		f.Seek(0, 0)
		br := bufio.NewReader(f)
		line, err := br.ReadString('\n')
		if err != nil && err != io.EOF {
			return ""
		}
		line = strings.TrimRight(line, "\r\n")
		metaIdx = strings.Index(line, "Metafer")
		if metaIdx < 0 {
			return ""
		}
		firstLine = line
	}

	group := strings.TrimSpace(firstLine[:metaIdx])
	// 去掉 .3~A 等后缀
	if dotIdx := strings.LastIndex(group, "."); dotIdx >= 0 {
		suffix := group[dotIdx:]
		re := regexp.MustCompile(`^\.[0-9]+~[A-Za-z]`)
		if re.MatchString(suffix) {
			group = strings.TrimSpace(group[:dotIdx])
		}
	}
	return group
}

// isFileStable 检查文件大小在 waitSeconds 内是否不变
func isFileStable(filepath_ string, waitSeconds int) bool {
	fi1, err := os.Stat(filepath_)
	if err != nil {
		return false
	}
	size1 := fi1.Size()
	time.Sleep(time.Duration(waitSeconds) * time.Second)
	fi2, err := os.Stat(filepath_)
	if err != nil {
		return false
	}
	return size1 == fi2.Size()
}

func scanAndUpload(watchDir, instno, serviceURL, startRow, sampColFlag, trackMode string, processed *map[string]FileRecord, pendingTxts map[string]float64) {
	entries, err := os.ReadDir(watchDir)
	if err != nil {
		logError("[HTTP] 读取目录失败: %v", err)
		return
	}

	allowedExts := getCfgList("interface", "allowed_extensions")
	// AXIOIMAGERZ2 需 PDF+TXT 伴生打包，其他仪器不受影响
	batchCompanions := strings.EqualFold(instno, "AXIOIMAGERZ2")
	maxCompanion := getCfgInt("interface", "max_companion_files", 20)
	// [2026-08-10] 新增配置
	arrivalWindow := getCfgInt("interface", "companion_arrival_window", 2)
	stableWait := getCfgInt("interface", "file_stable_wait", 2)
	_ = getCfg("interface", "companion_match_mode", "auto") // matchMode 预留
	retryBackoff := getCfgInt("interface", "upload_retry_backoff", 1)
	maxRetryInterval := getCfgInt("interface", "max_retry_interval", 1800)

	// ---- 收集文件 ----
	type fileInfo struct {
		Name      string
		FullPath  string
		Ext       string
		Size      int64
		Mtime     int64
		IsNew     bool
		GroupName string // [2026-08-10] TXT 组别名
	}
	var pdfs, txts, others []fileInfo

	for _, entry := range entries {
		name := entry.Name()
		if name == "processed_files.json" || entry.IsDir() {
			continue
		}

		ext := strings.ToLower(filepath.Ext(name))
		if len(allowedExts) > 0 && !containsExt(allowedExts, ext) {
			continue
		}

		fullPath := filepath.Join(watchDir, name)
		fi, err := os.Stat(fullPath)
		if err != nil {
			continue
		}

		info := fileInfo{
			Name:     name,
			FullPath: fullPath,
			Ext:      ext,
			Size:     fi.Size(),
			Mtime:    fi.ModTime().UnixNano(),
			IsNew:    true,
		}

		if trackMode == "1" && processed != nil {
			rec, exists := (*processed)[name]
			if exists && rec.Mtime == info.Mtime && rec.Size == info.Size && rec.UploadedAt != "" {
				info.IsNew = false
			}
		}

		// [2026-08-10] 提取 TXT 组别名
		if batchCompanions && ext == ".txt" && info.IsNew {
			info.GroupName = extractTxtGroupName(fullPath)
			if info.GroupName != "" {
				logDebug("TXT组别名: %s → [%s]", name, info.GroupName)
			}
		}

		// 伴生模式：PDF/TXT 单独分类；普通模式：全部归入 others
		if batchCompanions {
			switch ext {
			case ".pdf":
				pdfs = append(pdfs, info)
			case ".txt":
				txts = append(txts, info)
			default:
				others = append(others, info)
			}
		} else {
			others = append(others, info)
		}
	}

	currentFiles := make(map[string]bool)
	var uploaded, skipped, failed int
	ts := time.Now().Format("2006-01-02 15:04:05")
	nowTs := float64(time.Now().Unix())

	markDone := func(name string, info fileInfo) {
		currentFiles[name] = true
		if trackMode == "1" && processed != nil {
			(*processed)[name] = FileRecord{
				Mtime:         info.Mtime,
				Size:          info.Size,
				UploadedAt:    ts,
				FailCount:     0,
				LastFailTime:  "",
				NextRetryTime: "",
			}
		}
	}

	// [2026-08-10] 记录失败退避
	markFailed := func(name string, info fileInfo) {
		if trackMode != "1" || processed == nil {
			return
		}
		rec, exists := (*processed)[name]
		if !exists {
			rec = FileRecord{
				Mtime: info.Mtime,
				Size:  info.Size,
			}
		}
		rec.FailCount++
		rec.LastFailTime = fmt.Sprintf("%.0f", nowTs)
		delay := 0
		if retryBackoff != 0 {
			delay = calcRetryBackoff(rec.FailCount, maxRetryInterval)
		}
		rec.NextRetryTime = fmt.Sprintf("%.0f", nowTs+float64(delay))
		rec.Mtime = info.Mtime
		rec.Size = info.Size
		(*processed)[name] = rec
	}

	// ---- 伴生模式：PDF + TXT 打包上传 ----
	if batchCompanions {
		// [2026-08-10] 到达窗口维护
		if arrivalWindow > 0 {
			// 清理过期 pending（文件已不存在）
			txtNameSet := make(map[string]bool)
			for _, t := range txts {
				txtNameSet[t.Name] = true
			}
			for n := range pendingTxts {
				if !txtNameSet[n] {
					delete(pendingTxts, n)
				}
			}
			// 注册新到达的 TXT
			for _, txt := range txts {
				if txt.IsNew {
					if _, exists := pendingTxts[txt.Name]; !exists {
						pendingTxts[txt.Name] = nowTs
						logDebug("TXT到达窗口开始: %s", txt.Name)
					}
				}
			}
		}

		usedTxts := make(map[string]bool)
		for _, pdf := range pdfs {
			if !pdf.IsNew {
				currentFiles[pdf.Name] = true
				skipped++
				continue
			}

			// [2026-08-10] 退避检查
			if retryBackoff != 0 && processed != nil && shouldSkipBackoff(pdf.Name, *processed, nowTs) {
				currentFiles[pdf.Name] = true
				skipped++
				continue
			}

			// [2026-08-10] 文件稳定性检测
			if stableWait > 0 {
				if !isFileStable(pdf.FullPath, stableWait) {
					logInfo("[%s] PDF文件尚未稳定，推迟: %s", ts, pdf.Name)
					continue
				}
			}

			var batch []string
			batch = append(batch, pdf.FullPath)
			batchNames := []string{pdf.Name}
			var batchInfos []fileInfo
			batchInfos = append(batchInfos, pdf)

			// [2026-08-10] 智能匹配：组别名优先 → 迭代顺序兜底
			txtAdded := 0

			// 收集可用 TXT（未使用且为新文件）
			availableTxts := make([]fileInfo, 0)
			for _, txt := range txts {
				if !usedTxts[txt.Name] && txt.IsNew {
					availableTxts = append(availableTxts, txt)
				}
			}

			// 第1优先：组别名匹配
			for _, txt := range availableTxts {
				if txtAdded >= maxCompanion {
					break
				}
				if txt.GroupName != "" {
					// [2026-08-10] 稳定性检测
					if stableWait > 0 && !isFileStable(txt.FullPath, stableWait) {
						continue
					}
					batch = append(batch, txt.FullPath)
					batchNames = append(batchNames, txt.Name)
					batchInfos = append(batchInfos, txt)
					usedTxts[txt.Name] = true
					txtAdded++
					logDebug("组别名匹配: PDF=%s ← TXT=%s [%s]", pdf.Name, txt.Name, txt.GroupName)
				}
			}

			// 第2优先：迭代顺序补充（未达上限时）
			for _, txt := range availableTxts {
				if usedTxts[txt.Name] {
					continue
				}
				if txtAdded >= maxCompanion {
					break
				}
				// [2026-08-10] 稳定性检测
				if stableWait > 0 && !isFileStable(txt.FullPath, stableWait) {
					continue
				}
				batch = append(batch, txt.FullPath)
				batchNames = append(batchNames, txt.Name)
				batchInfos = append(batchInfos, txt)
				usedTxts[txt.Name] = true
				txtAdded++
			}

			// 超出上限告警
			totalTxtAvail := 0
			for _, txt := range txts {
				if !usedTxts[txt.Name] && txt.IsNew {
					totalTxtAvail++
				}
			}
			if totalTxtAvail > 0 {
				logInfo("[%s] 注意: 目录中有 %d 个TXT超出伴生上限(%d)，本次未打包",
					ts, totalTxtAvail, maxCompanion)
			}

			if len(batch) > 1 {
				logInfo("[%s] 打包上传: %v", ts, batchNames)
			}

			result := uploadFiles(batch, instno, serviceURL, startRow, sampColFlag)
			if result.Success {
				for i, name := range batchNames {
					if i < len(batchInfos) {
						markDone(name, batchInfos[i])
					}
					currentFiles[name] = true
				}
				uploaded++
				logInfo("[%s] 成功: %v", ts, batchNames)
			} else {
				failed++
				logInfo("[%s] 失败: %v - %s", ts, batchNames, result.Error)
				if result.Resp != "" {
					logInfo("  响应: %s", result.Resp)
				}
				// [2026-08-10] 记录失败退避
				if retryBackoff != 0 {
					for i, name := range batchNames {
						if i < len(batchInfos) {
							markFailed(name, batchInfos[i])
						}
					}
				}
			}
		}

		// 孤立 TXT（无 PDF 配对）— [2026-08-10] 加入到达窗口
		orphanCount := 0
		heldCount := 0
		for _, txt := range txts {
			if usedTxts[txt.Name] {
				currentFiles[txt.Name] = true
				continue
			}
			if !txt.IsNew {
				currentFiles[txt.Name] = true
				skipped++
				continue
			}

			// [2026-08-10] 到达窗口内 → 暂缓上传，等待 PDF 到达
			if arrivalWindow > 0 {
				if firstSeen, exists := pendingTxts[txt.Name]; exists && firstSeen > 0 {
					elapsedScans := (nowTs - firstSeen) / float64(max(1, getCfgInt("interface", "frequency", 20)))
					if int(elapsedScans) < arrivalWindow {
						currentFiles[txt.Name] = true
						heldCount++
						continue
					}
					// 窗口过期，移除 pending 记录
					delete(pendingTxts, txt.Name)
				}
			}

			orphanCount++
			// [2026-08-10] 退避检查
			if retryBackoff != 0 && processed != nil && shouldSkipBackoff(txt.Name, *processed, nowTs) {
				currentFiles[txt.Name] = true
				skipped++
				continue
			}
			result := uploadFile(txt.FullPath, instno, serviceURL, startRow, sampColFlag)
			if result.Success {
				markDone(txt.Name, txt)
				uploaded++
			} else {
				failed++
				if retryBackoff != 0 {
					markFailed(txt.Name, txt)
				}
				if orphanCount <= 3 {
					logInfo("[%s] 失败: %s (孤立TXT) - %s", ts, txt.Name, result.Error)
				}
			}
		}
		if orphanCount > 3 {
			logInfo("[%s] 孤立TXT: %d 个已处理 (无配对PDF)", ts, orphanCount)
		}
		if heldCount > 0 {
			logInfo("[%s] 暂缓TXT: %d 个在到达窗口内等待PDF", ts, heldCount)
		}
	}

	// ---- 普通文件（及伴生模式下的其他文件）逐文件上传 ----
	for _, other := range others {
		if !other.IsNew {
			currentFiles[other.Name] = true
			skipped++
			continue
		}

		// [2026-08-10] 退避检查
		if retryBackoff != 0 && processed != nil && shouldSkipBackoff(other.Name, *processed, nowTs) {
			currentFiles[other.Name] = true
			skipped++
			continue
		}

		result := uploadFile(other.FullPath, instno, serviceURL, startRow, sampColFlag)
		if result.Success {
			markDone(other.Name, other)
			uploaded++
			logInfo("[%s] 成功: %s", ts, other.Name)
		} else {
			failed++
			if retryBackoff != 0 {
				markFailed(other.Name, other)
			}
			logInfo("[%s] 失败: %s - %s", ts, other.Name, result.Error)
		}
	}

	// 清理已删除文件记录
	if trackMode == "1" && processed != nil {
		before := len(*processed)
		*processed = cleanStaleRecords(*processed, currentFiles)
		if len(*processed) < before || uploaded > 0 || failed > 0 {
			saveProcessed(*processed)
		}
	}

	fileCount := len(currentFiles)
	logInfo("监听运行中 | 目录 %d 个文件 | 上传 %d 跳过 %d 失败 %d",
		fileCount, uploaded, skipped, failed)

	maybeHeartbeat("http", serviceURL)
}

func dirExists(path string) bool {
	fi, err := os.Stat(path)
	return err == nil && fi.IsDir()
}

func containsExt(allowed []string, ext string) bool {
	for _, a := range allowed {
		if a == ext {
			return true
		}
	}
	return false
}
