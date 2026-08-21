(function (global) {
  "use strict";

  var PAGE_CONFIG = {
    mockMode: false,
    defaultDbnm: "ynjk",
    storageKey: global.SyssjcjMockData
      ? global.SyssjcjMockData.keys.documents
      : "syssjcj_cjwd_mock_documents_v4",
    qids: { documentDetail: "ynjksys_02002q" },
  };
  /* 模拟数据降级区：恢复模拟模式时取消本段注释。
    var fallbackDocument = {
        fdiseq: 'CJ202608030001', fileName: 'ICPMS_金属元素批量检测结果.xlsx', fileType: 'Excel',
        instno: 'ICPMS', deviceName: 'ICP-MS金属元素分析仪', parserClass: 'ExcelICPMS', fileSize: 284672,
        collectTime: '2026-08-03 09:26:18', parseStatus: '解析成功', dataCount: 128
    };
    var interfaceProfiles = {
        ICPMS: {
            parserClass: 'ExcelICPMS', sheetName: '批量检测数据',
            columns: ['样品名称', '铅(Pb)', '镉(Cd)', '砷(As)', '汞(Hg)'],
            rows: [['26S0803001', '0.012', '0.001', '0.006', '0.0003'], ['26S0803002', '0.019', '0.002', '0.008', '0.0004'], ['26S0803003', '0.026', '0.001', '0.011', '0.0005'], ['26S0803004', '0.033', '0.003', '0.009', '0.0004']]
        },
        ICPMS1: {
            parserClass: 'ExcelICPMS1', sheetName: '定量检测结果',
            columns: ['Sample Name', 'RT', 'Compound', 'Mass', 'Conc', 'Units', 'Area', 'Height', 'Det', 'Ratio', 'ISTD'],
            rows: [['26S0803011', '2.431', 'Pb', '208', '0.012', 'μg/L', '18542', '6241', 'Y', '0.982', 'Bi'], ['26S0803011', '3.106', 'Cd', '111', '0.003', 'μg/L', '9216', '3185', 'Y', '0.976', 'In'], ['26S0803011', '4.528', 'As', '75', '0.008', 'μg/L', '12453', '4028', 'Y', '0.991', 'Ge']]
        },
        MBY2: {
            parserClass: 'ExcelMBY2', sheetName: '原始读数',
            columns: ['孔位', 'SampleBarcode', 'RawValues', 'Cutoff', '结果'],
            rows: [['A1', 'NC', '0.041', '0.147', '阴性对照'], ['B1', 'PC', '1.864', '0.147', '阳性对照'], ['C1', '26S0803021', '0.082', '0.147', '阴性'], ['D1', '26S0803022', '0.764', '0.147', '阳性']]
        },
        'AGILENT-1200': {
            parserClass: 'Agilent1200', reportTitle: '安捷伦1200液相色谱分析报告',
            columns: ['样品编号', '保留时间', '类型', '峰面积', '含量/峰面积', '含量', '组分名称'],
            rows: [['26S0803031', '3.216', 'MM', '18245.6', '0.00382', '12.41', '山梨酸'], ['26S0803031', '4.528', 'MM', '9642.3', '0.00204', '6.82', '苯甲酸'], ['26S0803031', '6.107', 'BB', '7318.8', '0.00156', '5.17', '糖精钠']]
        },
        'BRUKER-MICROFLEX': {
            parserClass: 'BrukerMicroflex', reportTitle: 'Microflex微生物鉴定报告',
            columns: ['样品编号', '最佳匹配菌种', '最佳Score', 'NCBI ID', '置信度', '第二匹配菌种', '第二Score'],
            rows: [['26S0803041', 'Escherichia coli', '2.246', '562', '+++', 'Shigella flexneri', '1.812'], ['26S0803042', 'Staphylococcus aureus', '2.118', '1280', '+++', 'Staphylococcus epidermidis', '1.674']]
        },
        'WATERS-ACQUITY-UPLC': {
            parserClass: 'WatersAcquityUPLC', reportTitle: 'Waters Acquity UPLC FLD数据报告',
            columns: ['样品编号', '化合物', '保留时间', '面积', '浓度', '高度', '文件名'],
            rows: [['26S0803051', '维生素B1', '2.418', '186452', '8.42', '25418', '302_VB_FLD_01'], ['26S0803051', '维生素B2', '3.762', '243861', '12.37', '31804', '302_VB_FLD_01'], ['26S0803051', '维生素B6', '5.109', '96524', '4.16', '12863', '302_VB_FLD_01']]
        },
        'GCMS-TQ8050NX': {
            parserClass: 'GCMSTQ8050NX', reportTitle: '岛津GCMS-TQ8050NX农残分析报告',
            columns: ['ID', '名称', '保留时间', 'm/z', '峰面积', '峰高', '浓度', '单位'],
            rows: [['1', '五氯硝基苯', '-', '294.80 > 236.80', '---', '---', 'N.D.', 'μg/L'], ['2', '腐霉利', '8.529', '283.00 > 96.00', '741', '555', '1.502', 'μg/L'], ['3', '联苯菊酯', '10.317', '181.00 > 166.00', '1284', '906', '2.184', 'μg/L']]
        },
        LightCycler480: {
            parserClass: 'LightCycler480', reportTitle: 'LightCycler 480实时荧光PCR报告',
            columns: ['孔位', '样品编号', '检测目标', 'Cp/Ct', '浓度', '结果'],
            rows: [['A1', '26S0803061', 'Influenza A', '22.48', '3.72E+05', '阳性'], ['A2', '26S0803062', 'Influenza A', '-', '-', '阴性'], ['B1', '26S0803063', 'Influenza B', '28.16', '8.41E+03', '阳性']]
        },
        ElisaTxt: {
            parserClass: 'ElisaTxt', encoding: 'GBK → UTF-8',
            columns: ['板号', '孔位', '样品编号', 'OD值', 'S/CO', '结果'],
            rows: [['1', '1', '26S0803071', '0.086', '0.42', '阴性'], ['1', '2', '26S0803072', '1.263', '6.15', '阳性'], ['1', '3', '26S0803073', '0.104', '0.51', '阴性']]
        },
        DIONEXICS5000: { parserClass: 'ExcelDIONEXICS5000', sheetName: '检测结果', columns: ['样品编号', '离子项目', '保留时间', '结果', '单位'], rows: [['26S0803081', 'Cl-', '4.152', '12.48', 'mg/L'], ['26S0803081', 'NO3-', '6.328', '4.16', 'mg/L']] },
        SZJS: { parserClass: 'ExcelSZJS', sheetName: '检测数据', columns: ['Sample Id', '元素', '结果', '单位'], rows: [['26S0803091', 'Pb', '0.012', 'mg/L'], ['26S0803091', 'Cd', '0.002', 'mg/L'], ['26S0803091', 'As', '0.008', 'mg/L']] },
        'AGILENT-7890A': { parserClass: 'Agilent7890A', reportTitle: '安捷伦7890A气相色谱分析报告', columns: ['样品编号', '保留时间', '类型', '峰面积', '含量/峰面积', '含量', '名称'], rows: [['26S0803101', '2.865', 'MM', '16842', '0.00412', '8.63', '苯'], ['26S0803101', '4.217', 'MM', '12458', '0.00306', '6.41', '甲苯']] }
    };
    */
  var fallbackDocument = { fdiseq: "" };
  var interfaceProfiles = {
    "AGILENT-1200": {
      parserClass: "Agilent1200",
      reportTitle: "安捷伦1200液相色谱分析报告",
      columns: [],
      rows: [],
    },
    "BRUKER-MICROFLEX": {
      parserClass: "BrukerMicroflex",
      reportTitle: "Microflex微生物鉴定报告",
      columns: [],
      rows: [],
    },
    AXIOIMAGERZ2: {
      parserClass: "AxioImagerZ2",
      reportTitle: "体外染色体畸变分析合并记录",
      columns: [],
      rows: [],
    },
    "ICAP-TQ": {
      parserClass: "ICAP_TQ",
      reportTitle: "iCAP TQ电感耦合等离子体质谱检测数据",
      columns: [],
      rows: [],
    },
    SYNERGYH1: {
      parserClass: "ExcelSYNERGYH1",
      reportTitle: "Synergy H1多功能酶标仪检测数据",
      columns: [],
      rows: [],
    },
  };
  var currentDocument = null,
    currentAxioModel = null,
    pdfPage = 1,
    imageScale = 1;

  function el(id) {
    return document.getElementById(id);
  }
  function queryParam(name) {
    return new URLSearchParams(global.location.search).get(name) || "";
  }
  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(
      /[&<>'"]/g,
      function (char) {
        return {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          "'": "&#39;",
          '"': "&quot;",
        }[char];
      },
    );
  }
  function commonParams() {
    var params =
      typeof global.buildCommonParams === "function"
        ? global.buildCommonParams() || {}
        : {};
    if (!params.dbnm || /^(none|null|undefined)$/i.test(String(params.dbnm))) {
      params.dbnm = PAGE_CONFIG.defaultDbnm;
    }
    if (!params.hp) {
      params.hp = "ynjksys";
    }
    return params;
  }
  function rowsFromResult(result) {
    if (!result || !Array.isArray(result.data)) {
      return [];
    }
    if (!result.data.length || !Array.isArray(result.data[0])) {
      return result.data;
    }
    if (
      global.isqrydata &&
      typeof global.isqrydata.convertDataToObject === "function"
    ) {
      return global.isqrydata.convertDataToObject(
        result.data,
        result.title || [],
      );
    }
    return result.data.map(function (row) {
      var item = {};
      (result.title || []).forEach(function (title, index) {
        item[title] = row[index];
      });
      return item;
    });
  }
  function queryPlatform(qid, businessParams) {
    return new Promise(function (resolve, reject) {
      if (!qid) {
        reject(new Error("文件详情查询号尚未配置"));
        return;
      }
      if (!global.isqrydata || typeof global.isqrydata.query !== "function") {
        reject(new Error("isqrydata.js 未加载"));
        return;
      }
      var params = commonParams();
      Object.keys(businessParams || {}).forEach(function (key) {
        params[key] = businessParams[key];
      });
      global.isqrydata.query({
        qid: qid,
        data: params,
        successCallback: resolve,
        errorCallback: reject,
      });
    });
  }
  function enrichDocument(item) {
    if (!item) {
      return null;
    }
    var documentItem = Object.assign({}, item);
    var profile = interfaceProfiles[documentItem.instno] || {};
    documentItem.collectMode = documentItem.collectMode || "接口监听自动采集";
    documentItem.lastParseTime =
      documentItem.lastParseTime || documentItem.collectTime;
    documentItem.parserName =
      documentItem.parserClass || profile.parserClass || "待识别";
    if (documentItem.parseStatus === "解析失败") {
      documentItem.parseMessage =
        documentItem.parseMessage ||
        "客户端已上传文件，但当前归档文件未查询到解析入库数据，请进入解析工作页核对或重新解析。";
    }
    return documentItem;
  }
  function mockLoadDetail(fdiseq) {
    if (global.SyssjcjMockData) {
      var linked = global.SyssjcjMockData.getDocument(fdiseq);
      return Promise.resolve(linked ? enrichDocument(linked) : null);
    }
    var documents = [];
    try {
      documents = JSON.parse(
        global.sessionStorage.getItem(PAGE_CONFIG.storageKey) || "[]",
      );
    } catch (error) {
      console.warn("模拟文件信息读取失败：", error);
    }
    var item = documents.find(function (record) {
      return record.fdiseq === fdiseq;
    });
    if (!item && (!fdiseq || fdiseq === fallbackDocument.fdiseq)) {
      item = fallbackDocument;
    }
    return Promise.resolve(item ? enrichDocument(item) : null);
  }
  var dataService = {
    loadDetail: function (fdiseq) {
      if (PAGE_CONFIG.mockMode) {
        return mockLoadDetail(fdiseq);
      }
      // 正式对接位置：按 fdiseq 查询文件头、采集信息和 lis_instdata_new 汇总，不按文件名定位。
      return queryPlatform(PAGE_CONFIG.qids.documentDetail, {
        fdiseq_sql_equal: fdiseq,
      }).then(function (result) {
        var row = rowsFromResult(result)[0];
        return enrichDocument(
          row ? global.SyssjcjDocumentService.normalizeDocument(row) : null,
        );
      });
    },
    download: function (item) {
      if (PAGE_CONFIG.mockMode) {
        return Promise.resolve();
      }
      global.SyssjcjDocumentService.triggerDownload(item.fdiseq);
      return Promise.resolve();
    },
  };
  function formatFileSize(bytes) {
    var value = Number(bytes) || 0;
    if (value >= 1048576) {
      return (value / 1048576).toFixed(2) + " MB";
    }
    if (value >= 1024) {
      return (value / 1024).toFixed(1) + " KB";
    }
    return value + " B";
  }
  function statusClass(status) {
    return status === "解析成功" ? "success" : "error";
  }
  function setText(id, value) {
    var text = value == null || value === "" ? "--" : String(value);
    el(id).textContent = text;
    el(id).setAttribute("title", text);
  }
  function renderInfo(item) {
    setText("headerFileName", item.fileName);
    setText("headerFileId", "文件标识：" + item.fdiseq);
    setText("fileName", item.fileName);
    setText("fileType", item.fileType);
    setText("fileSize", formatFileSize(item.fileSize));
    setText("fileId", item.fdiseq);
    setText("deviceName", item.deviceName);
    setText("instno", item.instno);
    setText("collectTime", item.collectTime);
    setText("collectMode", item.collectMode);
    setText("parseStatus", item.parseStatus);
    el("parseStatus").className =
      "status-text " + statusClass(item.parseStatus);
    setText(
      "dataCount",
      Number(item.dataCount || 0).toLocaleString("zh-CN") + " 条",
    );
    setText("lastParseTime", item.lastParseTime);
    setText("parserName", item.parserName);
    el("parseMessageRow").classList.toggle("is-hidden", !item.parseMessage);
    setText("parseMessage", item.parseMessage);
    var isAxio = item.instno === "AXIOIMAGERZ2";
    el("previewType").textContent = isAxio ? "动态合并文档" : item.fileType + " 文件";
    el("downloadButton").textContent = isAxio ? "下载合并文档" : "下载";
  }
  function profileFor(item) {
    return (
      interfaceProfiles[item.instno] || {
        parserClass: item.parserClass || "待识别",
        columns: ["样品编号", "检测项目", "结果"],
        rows: [],
      }
    );
  }
  function renderTabularPreview(profile) {
    var table = document.querySelector(".preview-table");
    table.style.minWidth =
      Math.max(900, (profile.columns.length + 1) * 140) + "px";
    el("excelHead").innerHTML =
      "<tr><th>序号</th>" +
      profile.columns
        .map(function (column) {
          return (
            '<th title="' +
            escapeHtml(column) +
            '">' +
            escapeHtml(column) +
            "</th>"
          );
        })
        .join("") +
      "</tr>";
    el("excelRows").innerHTML = profile.rows
      .map(function (row, index) {
        return (
          "<tr><td>" +
          (index + 1) +
          "</td>" +
          row
            .map(function (value) {
              return (
                '<td title="' +
                escapeHtml(value) +
                '">' +
                escapeHtml(value) +
                "</td>"
              );
            })
            .join("") +
          "</tr>"
        );
      })
      .join("");
    var tab = document.querySelector(".sheet-tab");
    tab.textContent = profile.sheetName || "检测结果";
    tab.setAttribute("title", tab.textContent);
  }
  function renderPdfPage() {
    if (!PAGE_CONFIG.mockMode) {
      el("pdfPaper").innerHTML =
        '<iframe title="PDF文件预览" src="' +
        escapeHtml(
          global.SyssjcjDocumentService.blobUrl(currentDocument.fdiseq),
        ) +
        '" style="width:100%;height:680px;border:0;background:#fff"></iframe>';
      el("pdfPage").textContent = "1";
      el("pdfTotal").textContent = "1";
      el("pdfPrevious").disabled = true;
      el("pdfNext").disabled = true;
      return;
    }
    var profile = profileFor(currentDocument);
    var resultTable =
      "<table><tr>" +
      profile.columns
        .map(function (column) {
          return "<td><strong>" + escapeHtml(column) + "</strong></td>";
        })
        .join("") +
      "</tr>" +
      profile.rows
        .map(function (row) {
          return (
            "<tr>" +
            row
              .map(function (value) {
                return "<td>" + escapeHtml(value) + "</td>";
              })
              .join("") +
            "</tr>"
          );
        })
        .join("") +
      "</table>";
    var pages = [
      "<h3>" +
        escapeHtml(profile.reportTitle || "仪器检测分析报告") +
        "</h3><p>文件序号：" +
        escapeHtml(currentDocument.fdiseq) +
        "</p><p>仪器编号：" +
        escapeHtml(currentDocument.instno) +
        "</p><p>仪器设备：" +
        escapeHtml(currentDocument.deviceName) +
        "</p><p>检测日期：" +
        escapeHtml(currentDocument.collectTime.slice(0, 10)) +
        "</p><table><tr><td>解析程序</td><td>" +
        escapeHtml(currentDocument.parserName) +
        "</td><td>解析数据量</td><td>" +
        escapeHtml(currentDocument.dataCount) +
        " 条</td></tr></table>",
      "<h3>检测结果</h3>" + resultTable,
    ];
    el("pdfPaper").innerHTML = pages[pdfPage - 1];
    el("pdfPage").textContent = pdfPage;
    el("pdfTotal").textContent = pages.length;
    el("pdfPrevious").disabled = pdfPage <= 1;
    el("pdfNext").disabled = pdfPage >= pages.length;
  }
  function renderPreview(item) {
    var profile = profileFor(item);
    [
      "axioPreview",
      "excelPreview",
      "csvPreview",
      "pdfPreview",
      "imagePreview",
      "unsupportedPreview",
    ].forEach(function (id) {
      el(id).classList.add("is-hidden");
    });
    if (item.instno === "AXIOIMAGERZ2") {
      renderAxioPreview(item);
      return;
    }
    if (item.fileType === "Excel") {
      renderTabularPreview(profile);
      el("excelPreview").classList.remove("is-hidden");
      return;
    }
    if (item.fileType === "CSV" || item.fileType === "TXT") {
      el("textPreviewTitle").textContent = item.fileType + " 数据预览";
      el("textPreviewEncoding").textContent =
        profile.encoding ||
        (item.fileType === "CSV" ? "UTF-8 · 逗号分隔" : "UTF-8");
      el("csvText").textContent =
        profile.columns.join("\t") +
        "\n" +
        profile.rows
          .map(function (row) {
            return row.join("\t");
          })
          .join("\n");
      el("csvPreview").classList.remove("is-hidden");
      return;
    }
    if (item.fileType === "PDF") {
      pdfPage = 1;
      renderPdfPage();
      el("pdfPreview").classList.remove("is-hidden");
      return;
    }
    if (item.fileType === "图像") {
      imageScale = 1;
      updateImageScale();
      el("imagePreview").classList.remove("is-hidden");
      return;
    }
    el("unsupportedPreview").classList.remove("is-hidden");
  }

  function renderAxioPreview(item) {
    currentAxioModel = null;
    el("axioPreview").classList.remove("is-hidden");
    el("axioLoading").classList.remove("is-hidden");
    el("axioError").classList.add("is-hidden");
    el("axioDocument").innerHTML = "";
    el("downloadButton").disabled = true;
    if (!global.SyssjcjAxioDocument) {
      el("axioLoading").classList.add("is-hidden");
      el("axioError").textContent = "AXIO合并文档组件未加载";
      el("axioError").classList.remove("is-hidden");
      return;
    }
    global.SyssjcjAxioDocument
      .load(item)
      .then(function (model) {
        if (!model.summaries.length || !model.cells.length) {
          throw new Error("未查询到完整的玻片汇总或逐细胞数据");
        }
        currentAxioModel = model;
        global.SyssjcjAxioDocument.render(el("axioDocument"), model);
        el("axioLoading").classList.add("is-hidden");
        el("downloadButton").disabled = false;
      })
      .catch(function (error) {
        console.error("AXIO合并文档加载失败：", error);
        el("axioLoading").classList.add("is-hidden");
        el("axioError").textContent = error.message || "合并数据加载失败";
        el("axioError").classList.remove("is-hidden");
      });
  }
  function updateImageScale() {
    el("spectrumImage").style.transform = "scale(" + imageScale + ")";
    el("imageScale").textContent = Math.round(imageScale * 100) + "%";
  }
  function showToast(message) {
    var toast = el("toast");
    toast.textContent = message;
    toast.classList.remove("is-hidden");
    global.clearTimeout(showToast.timer);
    showToast.timer = global.setTimeout(function () {
      toast.classList.add("is-hidden");
    }, 2200);
  }
  function showMessage(message, type) {
    if (
      !PAGE_CONFIG.mockMode &&
      global.isloadpage &&
      typeof global.isloadpage.openModal === "function"
    ) {
      var params = commonParams();
      params.hp = "common";
      params.message = encodeURIComponent(message);
      params.type = type || "info";
      global.isloadpage.openModal({
        hp: "common",
        hf: "common_msg",
        params: params,
        title: "提示",
        width: 400,
        height: 250,
      });
      return;
    }
    showToast(message);
  }
  function downloadCurrent() {
    if (!currentDocument) {
      return;
    }
    if (currentDocument.instno === "AXIOIMAGERZ2") {
      if (!currentAxioModel) {
        showMessage("合并数据尚未加载完成，请稍后重试", "error");
        return;
      }
      el("downloadButton").disabled = true;
      global.SyssjcjAxioDocument
        .download(currentAxioModel)
        .then(function (fileName) {
          showMessage("合并文档已生成：" + fileName, "success");
        })
        .catch(function (error) {
          console.error(error);
          showMessage(error.message || "合并文档生成失败", "error");
        })
        .then(function () {
          el("downloadButton").disabled = false;
        });
      return;
    }
    dataService
      .download(currentDocument)
      .then(function () {
        showMessage("文件下载已触发：" + currentDocument.fileName, "success");
      })
      .catch(function (error) {
        console.error(error);
        showMessage(error.message || "文件下载失败", "error");
      });
  }
  function returnToSource() {
    if (typeof global.closeModalDialog === "function") {
      global.closeModalDialog();
      return;
    }
    if (global.history.length > 1) {
      global.history.back();
      return;
    }
    var params = commonParams(),
      query = new URLSearchParams({
        act: "hf",
        hp: params.hp,
        hf: queryParam("sourcePage") || "syssjcj_cjwd_list",
        dbnm: params.dbnm,
      });
    if (
      params.sessionId &&
      !/^(none|null|undefined)$/i.test(String(params.sessionId))
    ) {
      query.set("sessionId", params.sessionId);
    }
    global.location.href = "/isimpxls/?" + query.toString();
  }
  function showError(message) {
    el("pageLoading").classList.add("is-hidden");
    el("detailContent").classList.add("is-hidden");
    el("pageError").classList.remove("is-hidden");
    setText("errorText", message);
    el("downloadButton").disabled = true;
  }
  function loadPage() {
    var fdiseq = queryParam("fdiseq");
    if (!fdiseq) {
      showError("缺少采集文件标识，请返回列表后重新进入");
      return;
    }
    dataService
      .loadDetail(fdiseq)
      .then(function (item) {
        if (!item) {
          showError("未找到对应的采集文件，文件可能已被删除");
          return;
        }
        currentDocument = item;
        renderInfo(item);
        renderPreview(item);
        el("pageLoading").classList.add("is-hidden");
        el("detailContent").classList.remove("is-hidden");
      })
      .catch(function (error) {
        console.error("文件详情加载失败：", error);
        showError("文件信息加载失败，请返回列表后重试");
      });
  }
  function bindEvents() {
    el("errorBackButton").addEventListener("click", returnToSource);
    el("downloadButton").addEventListener("click", downloadCurrent);
    el("unsupportedDownload").addEventListener("click", downloadCurrent);
    el("pdfPrevious").addEventListener("click", function () {
      if (pdfPage > 1) {
        pdfPage -= 1;
        renderPdfPage();
      }
    });
    el("pdfNext").addEventListener("click", function () {
      if (pdfPage < 2) {
        pdfPage += 1;
        renderPdfPage();
      }
    });
    el("imageZoomOut").addEventListener("click", function () {
      imageScale = Math.max(0.6, imageScale - 0.2);
      updateImageScale();
    });
    el("imageZoomIn").addEventListener("click", function () {
      imageScale = Math.min(1.8, imageScale + 0.2);
      updateImageScale();
    });
    el("imageReset").addEventListener("click", function () {
      imageScale = 1;
      updateImageScale();
    });
  }
  function initialize() {
    if (typeof global.initGlobalParams === "function") {
      global.initGlobalParams();
    }
    bindEvents();
    loadPage();
  }
  global.addEventListener("load", initialize);
})(window);
