(function (global) {
  "use strict";

  var QUERY_IDS = {
    documentList: "ynjksys_02001q",
    documentDetail: "ynjksys_02002q",
    parseRows: "ynjksys_02003q",
    deviceOptions: "ynjksys_02004q",
    spectrumList: "ynjksys_02005q",
    documentDelete: "ynjksys_02006q",
    parseRowsDelete: "ynjksys_02007q",
    axioSummary: "ynjksys_02008q",
    axioCells: "ynjksys_02009q",
    reparseInfo: "ynjksys_02011q",
  };

  function commonParams() {
    var params =
      typeof global.buildCommonParams === "function"
        ? global.buildCommonParams() || {}
        : {};
    params.hp = params.hp || "ynjksys";
    if (!params.dbnm || /^(none|null|undefined)$/i.test(String(params.dbnm))) {
      params.dbnm = "ynjk";
    }
    return params;
  }

  function rowsFromResult(result) {
    if (!result || !Array.isArray(result.data)) return [];
    if (!result.data.length || !Array.isArray(result.data[0])) return result.data;
    if (
      global.isqrydata &&
      typeof global.isqrydata.convertDataToObject === "function"
    ) {
      return global.isqrydata.convertDataToObject(result.data, result.title || []);
    }
    return result.data.map(function (row) {
      var item = {};
      (result.title || []).forEach(function (title, index) {
        item[title] = row[index];
      });
      return item;
    });
  }

  function query(qid, businessParams) {
    return new Promise(function (resolve, reject) {
      if (!global.isqrydata || typeof global.isqrydata.query !== "function") {
        reject(new Error("平台查询组件 isqrydata.js 未加载"));
        return;
      }
      var data = commonParams();
      Object.keys(businessParams || {}).forEach(function (key) {
        data[key] = businessParams[key];
      });
      global.isqrydata.query({
        qid: qid,
        data: data,
        successCallback: resolve,
        errorCallback: reject,
      });
    });
  }

  function value(row, aliases, fallback) {
    var keys = Object.keys(row || {});
    for (var i = 0; i < aliases.length; i += 1) {
      var wanted = String(aliases[i]).toLowerCase();
      for (var j = 0; j < keys.length; j += 1) {
        if (String(keys[j]).toLowerCase() === wanted) return row[keys[j]];
      }
    }
    return fallback;
  }

  function decodeFileName(name) {
    var text = String(name == null ? "" : name).replace(/\+/g, "%20");
    try {
      return decodeURIComponent(text);
    } catch (error) {
      return String(name == null ? "" : name);
    }
  }

  function normalizeDocument(row) {
    return {
      fdiseq: String(value(row, ["文件序号", "FDISEQ", "fdiseq"], "")),
      fileName: decodeFileName(value(row, ["文件名称", "FFILENM", "fileName"], "")),
      fileType: value(row, ["文件类型", "fileType"], "其他"),
      instno: value(row, ["仪器编号", "FINSTNO", "instno"], ""),
      deviceName: value(row, ["仪器设备", "设备名称", "deviceName"], "--"),
      parserClass: value(row, ["处理接口", "parserClass", "parserName"], "--"),
      fileSize: Number(value(row, ["文件大小", "fileSize"], 0)) || 0,
      collectTime: value(row, ["采集时间", "collectTime"], "--"),
      parseStatus: value(row, ["解析状态", "parseStatus"], "解析失败"),
      dataCount: Number(value(row, ["解析数据量", "dataCount"], 0)) || 0,
      sampleCount: Number(value(row, ["样品数量", "sampleCount"], 0)) || 0,
      firstParseTime: value(row, ["首次解析时间", "firstParseTime"], "--"),
      lastParseTime: value(row, ["最近解析时间", "lastParseTime"], "--"),
      collectMode: "接口监听自动采集",
      parseMessage: value(row, ["解析信息", "parseMessage"], ""),
      canDelete: true,
      total: Number(value(row, ["总数", "TOTAL_COUNT", "total"], 0)) || 0,
    };
  }

  function normalizeDevice(row) {
    return {
      instno: value(row, ["仪器编号", "FINSTNO", "instno"], ""),
      deviceName: value(row, ["仪器设备", "设备名称", "deviceName"], "--"),
    };
  }

  function normalizeParseRow(row) {
    return {
      fguid: value(row, ["唯一标识", "FGUID"], ""),
      instno: value(row, ["仪器编号", "FINSTNO"], ""),
      sampleNo: value(row, ["样品编号", "SAMPNO"], ""),
      itemSeq: value(row, ["检测项目编号", "ITEMSEQ"], ""),
      result: value(row, ["主结果", "RSLT"], ""),
      result1: value(row, ["结果1", "RSLT1"], ""),
      result2: value(row, ["结果2", "RSLT2"], ""),
      result3: value(row, ["结果3", "RSLT3"], ""),
      result4: value(row, ["结果4", "RSLT4"], ""),
      result5: value(row, ["结果5", "RSLT5"], ""),
      result6: value(row, ["结果6", "RSLT6"], ""),
      unit: value(row, ["单位", "MW"], ""),
      parseTime: value(row, ["解析时间", "FOPDT"], ""),
      operator: value(row, ["操作人", "FEMPID"], ""),
    };
  }

  function normalizeSpectrum(row) {
    var documentItem = normalizeDocument(row);
    return {
      spectrumId: "TP" + documentItem.fdiseq,
      fdiseq: documentItem.fdiseq,
      name: value(row, ["图谱名称"], documentItem.fileName),
      sampleNo: value(row, ["样品编号"], "--"),
      project: value(row, ["检测项目"], "色谱分析"),
      type: value(row, ["图谱类型"], "色谱图"),
      instno: documentItem.instno,
      device: documentItem.deviceName,
      time: documentItem.collectTime,
      file: documentItem.fileName,
      page: Number(value(row, ["原图页码"], 1)) || 1,
      total: documentItem.total,
    };
  }

  function controllerBase() {
    var configured = global.SYSSJCJ_COLLECTION_SERVICE_BASE || "/yncdc";
    return String(configured).replace(/\/$/, "");
  }

  function appendSessionId(url) {
    var sessionId = commonParams().sessionId;
    if (!sessionId || /^(none|null|undefined)$/i.test(String(sessionId))) {
      return url;
    }
    return url + (url.indexOf("?") >= 0 ? "&" : "?") +
      "sessionId=" + encodeURIComponent(sessionId);
  }

  function remove(qid, data) {
    return new Promise(function (resolve, reject) {
      if (!global.issubmit || typeof global.issubmit.remove !== "function") {
        reject(new Error("平台提交组件 issubmit.js 未加载"));
        return;
      }
      global.issubmit.remove({
        qid: qid,
        data: data,
        successCallback: function (result) {
          var normalized = normalizeSubmitResult(result);
          if (normalized && normalized.success === true) {
            resolve(normalized);
            return;
          }
          reject(new Error((normalized && normalized.message) || "数据库删除失败"));
        },
        errorCallback: function (error) {
          reject(error instanceof Error ? error : new Error("数据库删除失败"));
        },
      });
    });
  }

  function normalizeSubmitResult(result) {
    var target = result;
    for (var depth = 0; depth < 4; depth += 1) {
      if (typeof target === "string") {
        try {
          target = JSON.parse(target);
          continue;
        } catch (error) {
          return { success: false, message: target };
        }
      }
      if (target && target["处理结果"]) {
        target = target["处理结果"];
        continue;
      }
      if (target && Array.isArray(target.data) && target.data.length) {
        var row = target.data[0];
        target = Array.isArray(row) ? row[0] : row;
        continue;
      }
      if (target && typeof target.message === "string" && /^\s*\{/.test(target.message)) {
        try {
          var inner = JSON.parse(target.message);
          if (inner && typeof inner === "object") target = inner;
        } catch (ignored) {}
      }
      break;
    }
    return target || { success: false, message: "数据库未返回处理结果" };
  }

  function deleteDocument(fdiseq) {
    return remove(QUERY_IDS.documentDelete, { fdiseq: Number(fdiseq) });
  }

  function deleteParseRows(fdiseq, fguids) {
    return remove(QUERY_IDS.parseRowsDelete, {
      fdiseq: Number(fdiseq),
      fguids: (fguids || []).slice(),
    });
  }

  function reparseDocument(fdiseq, reason) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      var url = appendSessionId(controllerBase() + "/InstFileReparse.m");
      xhr.open("POST", url, true);
      xhr.withCredentials = true;
      xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
      xhr.setRequestHeader("X-Requested-With", "XMLHttpRequest");
      xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;
        var result;
        try {
          result = JSON.parse(xhr.responseText || "{}");
        } catch (error) {
          reject(new Error("重新解析服务未返回有效结果"));
          return;
        }
        if (xhr.status >= 200 && xhr.status < 300 && result.success === true) {
          resolve(result);
          return;
        }
        reject(new Error(result.message || "重新解析失败"));
      };
      xhr.onerror = function () {
        reject(new Error("重新解析服务连接失败"));
      };
      xhr.send(
        "fdiseq=" + encodeURIComponent(fdiseq) +
        "&reason=" + encodeURIComponent(reason)
      );
    });
  }

  function loadAxioDocument(fdiseq) {
    var params = { fdiseq_sql_equal: Number(fdiseq) };
    return Promise.all([
      query(QUERY_IDS.axioSummary, params),
      query(QUERY_IDS.axioCells, params),
    ]).then(function (results) {
      return {
        summaries: rowsFromResult(results[0]),
        cells: rowsFromResult(results[1]),
      };
    });
  }

  function blobUrl(fdiseq, mode) {
    return appendSessionId(
      controllerBase() +
      "/PdfView.m?fdiseq=" +
      encodeURIComponent(fdiseq) +
      (mode === "download" ? "&mode=download" : "")
    );
  }

  function downloadUrl(fdiseq) {
    return appendSessionId(
      controllerBase() +
      "/InstFileDownload.m?fdiseq=" +
      encodeURIComponent(fdiseq)
    );
  }

  function triggerDownload(fdiseq) {
    var frame = global.document.createElement("iframe");
    frame.style.display = "none";
    frame.setAttribute("aria-hidden", "true");
    frame.src = downloadUrl(fdiseq);
    global.document.body.appendChild(frame);
    global.setTimeout(function () {
      if (frame.parentNode) frame.parentNode.removeChild(frame);
    }, 60000);
  }

  function pageImageUrl(fdiseq, page, dpi) {
    return appendSessionId(
      controllerBase() +
      "/PdfPageImage.m?fdiseq=" +
      encodeURIComponent(fdiseq) +
      "&page=" +
      encodeURIComponent(page || 1) +
      "&dpi=" +
      encodeURIComponent(dpi || 150)
    );
  }

  global.SyssjcjDocumentService = {
    qids: QUERY_IDS,
    commonParams: commonParams,
    rowsFromResult: rowsFromResult,
    query: query,
    value: value,
    normalizeDocument: normalizeDocument,
    normalizeDevice: normalizeDevice,
    normalizeParseRow: normalizeParseRow,
    normalizeSpectrum: normalizeSpectrum,
    blobUrl: blobUrl,
    downloadUrl: downloadUrl,
    triggerDownload: triggerDownload,
    pageImageUrl: pageImageUrl,
    remove: remove,
    normalizeSubmitResult: normalizeSubmitResult,
    deleteDocument: deleteDocument,
    deleteParseRows: deleteParseRows,
    reparseDocument: reparseDocument,
    loadAxioDocument: loadAxioDocument,
  };
})(window);
