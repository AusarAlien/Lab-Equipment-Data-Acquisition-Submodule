(function (global) {
  "use strict";

  var CONFIG = {
    mockMode: false,
    defaultDbnm: "ynjk",
    documentKey: global.SyssjcjMockData
      ? global.SyssjcjMockData.keys.documents
      : "syssjcj_cjwd_mock_documents_v4",
    parseDataKey: "syssjcj_cjwd_mock_parse_data_v1",
    parseInfoKey: "syssjcj_cjwd_mock_parse_info_v1",
    qids: {
      document: "ynjksys_01002q",
      parseRows: "ynjksys_01003q",
      parseInfo: "",
      deleteRows: "ynjksys_01007q",
      reparse: "",
      reparseStatus: "",
    },
  };
  /* 模拟数据降级区：恢复模拟模式时取消本段注释。
  var fallbackDocument = {
    fdiseq: "CJ202608030001",
    fileName: "ICPMS_金属元素批量检测结果.xlsx",
    fileType: "Excel",
    instno: "ICPMS",
    deviceName: "ICP-MS金属元素分析仪",
    parserClass: "ExcelICPMS",
    collectTime: "2026-08-03 09:26:18",
    parseStatus: "解析成功",
    dataCount: 128,
  };
  */
  var fallbackDocument = { fdiseq: "" };
  var profiles = {
    "AGILENT-1200": {
      parser: "Agilent1200",
      sampleFlag: "样品名称",
      fields: [
        ["sampno", "样品编号"], ["item", "组分名称"], ["rt", "保留时间"],
        ["type", "类型"], ["rslt", "峰面积"], ["ratio", "含量/峰面积"],
        ["content", "含量"]
      ],
      items: []
    },
    "BRUKER-MICROFLEX": {
      parser: "BrukerMicroflex",
      sampleFlag: "Analyte ID",
      fields: [
        ["sampno", "样品编号"], ["organism1", "最佳匹配菌种"],
        ["rslt", "最佳Score"], ["ncbi", "NCBI ID"], ["confidence", "置信度"],
        ["organism2", "第二匹配菌种"], ["score2", "第二Score"]
      ],
      items: []
    }
  };
  /* 以下为旧版多仪器模拟字段及模拟行，保留用于降级。
  var profiles = {
    ICPMS: {
      parser: "ExcelICPMS",
      sampleFlag: "样品名称",
      fields: [
        ["sampno", "样品编号"],
        ["item", "检测项目"],
        ["rslt", "结果"],
        ["mw", "单位"],
      ],
      items: [
        ["铅(Pb)", "0.012", "mg/L"],
        ["镉(Cd)", "0.002", "mg/L"],
        ["砷(As)", "0.008", "mg/L"],
        ["汞(Hg)", "0.0004", "mg/L"],
      ],
    },
    ICPMS1: {
      parser: "ExcelICPMS1",
      sampleFlag: "Sample Name",
      fields: [
        ["sampno", "样品编号"],
        ["compound", "化合物"],
        ["rt", "保留时间"],
        ["mass", "质量数"],
        ["conc", "浓度"],
        ["units", "单位"],
        ["area", "峰面积"],
        ["height", "峰高"],
        ["det", "检出标识"],
        ["ratio", "比率"],
        ["istd", "内标"],
      ],
      items: [
        [
          "Pb",
          "2.431",
          "208",
          "0.012",
          "μg/L",
          "18542",
          "6241",
          "Y",
          "0.982",
          "Bi",
        ],
        [
          "Cd",
          "3.106",
          "111",
          "0.003",
          "μg/L",
          "9216",
          "3185",
          "Y",
          "0.976",
          "In",
        ],
        [
          "As",
          "4.528",
          "75",
          "0.008",
          "μg/L",
          "12453",
          "4028",
          "Y",
          "0.991",
          "Ge",
        ],
      ],
    },
    MBY2: {
      parser: "ExcelMBY2",
      sampleFlag: "SampleBarcode",
      fields: [
        ["kwell", "孔位"],
        ["sampno", "样品编号"],
        ["item", "检测项目"],
        ["raw", "原始读数"],
        ["fcutoff", "Cutoff"],
        ["rslt", "结果"],
      ],
      items: [
        ["A1", "NC", "阴性对照", "0.041", "0.147", "阴性对照"],
        ["B1", "PC", "阳性对照", "1.864", "0.147", "阳性对照"],
        ["C1", "26S0803021", "抗体检测", "0.082", "0.147", "阴性"],
        ["D1", "26S0803022", "抗体检测", "0.764", "0.147", "阳性"],
      ],
    },
    "AGILENT-1200": {
      parser: "Agilent1200",
      sampleFlag: "样品名称",
      fields: [
        ["sampno", "样品编号"],
        ["item", "组分名称"],
        ["rt", "保留时间"],
        ["type", "类型"],
        ["rslt", "峰面积"],
        ["ratio", "含量/峰面积"],
        ["content", "含量"],
      ],
      items: [
        ["山梨酸", "3.216", "MM", "18245.6", "0.00382", "12.41"],
        ["苯甲酸", "4.528", "MM", "9642.3", "0.00204", "6.82"],
        ["糖精钠", "6.107", "BB", "7318.8", "0.00156", "5.17"],
      ],
    },
    "BRUKER-MICROFLEX": {
      parser: "BrukerMicroflex",
      sampleFlag: "Sample ID",
      fields: [
        ["sampno", "样品编号"],
        ["organism1", "最佳匹配菌种"],
        ["rslt", "最佳Score"],
        ["ncbi", "NCBI ID"],
        ["confidence", "置信度"],
        ["organism2", "第二匹配菌种"],
        ["score2", "第二Score"],
      ],
      items: [
        [
          "Escherichia coli",
          "2.246",
          "562",
          "+++",
          "Shigella flexneri",
          "1.812",
        ],
        [
          "Staphylococcus aureus",
          "2.118",
          "1280",
          "+++",
          "Staphylococcus epidermidis",
          "1.674",
        ],
      ],
    },
    "WATERS-ACQUITY-UPLC": {
      parser: "WatersAcquityUPLC",
      sampleFlag: "样品名称/样品ID",
      fields: [
        ["sampno", "样品编号"],
        ["item", "化合物"],
        ["rt", "保留时间"],
        ["area", "面积"],
        ["rslt", "浓度"],
        ["height", "高度"],
        ["sourceFile", "数据文件"],
      ],
      items: [
        ["维生素B1", "2.418", "186452", "8.42", "25418", "302_VB_FLD_01"],
        ["维生素B2", "3.762", "243861", "12.37", "31804", "302_VB_FLD_01"],
        ["维生素B6", "5.109", "96524", "4.16", "12863", "302_VB_FLD_01"],
      ],
    },
    "GCMS-TQ8050NX": {
      parser: "GCMSTQ8050NX",
      sampleFlag: "样品名称",
      fields: [
        ["sampno", "样品编号"],
        ["id", "ID"],
        ["item", "名称"],
        ["rslt", "保留时间"],
        ["mz", "m/z"],
        ["area", "峰面积"],
        ["height", "峰高"],
        ["conc", "浓度"],
        ["mw", "单位"],
      ],
      items: [
        [
          "1",
          "五氯硝基苯",
          "-",
          "294.80 > 236.80",
          "---",
          "---",
          "N.D.",
          "μg/L",
        ],
        [
          "2",
          "腐霉利",
          "8.529",
          "283.00 > 96.00",
          "741",
          "555",
          "1.502",
          "μg/L",
        ],
        [
          "3",
          "联苯菊酯",
          "10.317",
          "181.00 > 166.00",
          "1284",
          "906",
          "2.184",
          "μg/L",
        ],
      ],
    },
    LightCycler480: {
      parser: "LightCycler480",
      sampleFlag: "Sample Name",
      fields: [
        ["kwell", "孔位"],
        ["sampno", "样品编号"],
        ["item", "检测目标"],
        ["ct", "Cp/Ct"],
        ["quantity", "浓度"],
        ["rslt", "结果"],
      ],
      items: [
        ["A1", "26S0803061", "Influenza A", "22.48", "3.72E+05", "阳性"],
        ["A2", "26S0803062", "Influenza A", "-", "-", "阴性"],
        ["B1", "26S0803063", "Influenza B", "28.16", "8.41E+03", "阳性"],
      ],
    },
    ElisaTxt: {
      parser: "ElisaTxt",
      sampleFlag: "布局",
      fields: [
        ["board", "板号"],
        ["kwell", "孔位"],
        ["sampno", "样品编号"],
        ["item", "检测项目"],
        ["od", "OD值"],
        ["sco", "S/CO"],
        ["rslt", "结果"],
      ],
      items: [
        ["1", "1", "26S0803071", "抗体检测", "0.086", "0.42", "阴性"],
        ["1", "2", "26S0803072", "抗体检测", "1.263", "6.15", "阳性"],
        ["1", "3", "26S0803073", "抗体检测", "0.104", "0.51", "阴性"],
      ],
    },
    DIONEXICS5000: {
      parser: "ExcelDIONEXICS5000",
      sampleFlag: "样品编号",
      fields: [
        ["sampno", "样品编号"],
        ["item", "离子项目"],
        ["rt", "保留时间"],
        ["rslt", "结果"],
        ["mw", "单位"],
      ],
      items: [
        ["Cl-", "4.152", "12.48", "mg/L"],
        ["NO3-", "6.328", "4.16", "mg/L"],
        ["SO4²-", "8.742", "18.63", "mg/L"],
      ],
    },
    SZJS: {
      parser: "ExcelSZJS",
      sampleFlag: "Sample Id",
      fields: [
        ["sampno", "样品编号"],
        ["item", "元素"],
        ["rslt", "结果"],
        ["mw", "单位"],
      ],
      items: [
        ["Pb", "0.012", "mg/L"],
        ["Cd", "0.002", "mg/L"],
        ["As", "0.008", "mg/L"],
      ],
    },
    "AGILENT-7890A": {
      parser: "Agilent7890A",
      sampleFlag: "样品名称",
      fields: [
        ["sampno", "样品编号"],
        ["item", "名称"],
        ["rt", "保留时间"],
        ["type", "类型"],
        ["rslt", "峰面积"],
        ["ratio", "含量/峰面积"],
        ["content", "含量"],
      ],
      items: [
        ["苯", "2.865", "MM", "16842", "0.00412", "8.63"],
        ["甲苯", "4.217", "MM", "12458", "0.00306", "6.41"],
      ],
    },
  };
  */
  var state = {
    document: null,
    profile: null,
    allRows: [],
    filteredRows: [],
    selected: {},
    page: 1,
    pageSize: 10,
    pendingSingle: "",
  };

  function el(id) {
    return document.getElementById(id);
  }
  function queryParam(name) {
    return new URLSearchParams(global.location.search).get(name) || "";
  }
  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>'"]/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      }[c];
    });
  }
  function setText(id, value) {
    var text = value == null || value === "" ? "--" : String(value);
    el(id).textContent = text;
    el(id).setAttribute("title", text);
  }
  function readStore(key, fallback) {
    try {
      return JSON.parse(
        global.sessionStorage.getItem(key) || JSON.stringify(fallback),
      );
    } catch (error) {
      return fallback;
    }
  }
  function writeStore(key, value) {
    try {
      global.sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn("会话数据保存失败：", error);
    }
  }
  function nowText() {
    return "2026-08-03 " + new Date().toTimeString().slice(0, 8);
  }
  function profileFor(instno) {
    return (
      profiles[instno] || {
        parser: "CommonInst",
        sampleFlag: "样品编号",
        fields: [
          ["sampno", "样品编号"],
          ["item", "检测项目"],
          ["rslt", "结果"],
        ],
        items: [["检测项目", "--"]],
      }
    );
  }
  function adaptLiveRow(row, instno) {
    var raw = global.SyssjcjDocumentService.normalizeParseRow(row);
    var common = { fguid: raw.fguid, sampno: raw.sampleNo };
    if (instno === "AGILENT-1200") {
      common.item = raw.result6 || raw.itemSeq;
      common.rt = raw.result1;
      common.type = raw.result2;
      common.rslt = raw.result3 || raw.result;
      common.ratio = raw.result4;
      common.content = raw.result5;
      return common;
    }
    if (instno === "BRUKER-MICROFLEX") {
      common.organism1 = raw.result1;
      common.rslt = raw.result2 || raw.result;
      common.ncbi = raw.result3;
      common.confidence = raw.result4;
      common.organism2 = raw.result5;
      common.score2 = raw.result6;
      return common;
    }
    common.item = raw.itemSeq;
    common.rslt = raw.result;
    return common;
  }
  function loadLiveData(fdiseq) {
    var service = global.SyssjcjDocumentService;
    return service
      .query(CONFIG.qids.document, { fdiseq_sql_equal: fdiseq })
      .then(function (detailResult) {
        var detailRow = service.rowsFromResult(detailResult)[0];
        if (!detailRow) return null;
        var documentItem = service.normalizeDocument(detailRow);
        return service
          .query(CONFIG.qids.parseRows, { fdiseq_sql_equal: fdiseq })
          .then(function (rowsResult) {
            var rawRows = service.rowsFromResult(rowsResult);
            var rows = rawRows.map(function (row) {
              return adaptLiveRow(row, documentItem.instno);
            });
            return {
              document: documentItem,
              rows: rows,
              info: {
                startTime: documentItem.firstParseTime,
                endTime: documentItem.lastParseTime,
                result: documentItem.parseStatus,
                rawCount: rows.length,
                successCount: rows.length,
                skipCount: 0,
                error:
                  documentItem.parseStatus === "解析成功"
                    ? "--"
                    : documentItem.parseMessage || "未生成解析入库数据",
                reason: "--",
                operator: rawRows.length
                  ? service.normalizeParseRow(rawRows[0]).operator || "系统自动采集"
                  : "系统自动采集",
              },
            };
          });
      });
  }
  function makeRows(documentItem, forceParse) {
    var profile = profileFor(documentItem.instno),
      sampleSeed = documentItem.fdiseq.slice(-4),
      rows = [];
    var noData = documentItem.parseStatus === "解析失败";
    var targetCount =
      noData && !forceParse
        ? 0
        : Math.max(profile.items.length, Number(documentItem.dataCount) || 0);
    for (var index = 0; index < targetCount; index += 1) {
      var values = profile.items[index % profile.items.length];
      var row = {
        fguid: documentItem.fdiseq + "-R" + String(index + 1).padStart(3, "0"),
      };
      var valueOffset = profile.fields[0][0] === "sampno" ? 1 : 0;
      profile.fields.forEach(function (field, fieldIndex) {
        if (
          field[0] === "sampno" &&
          values.length === profile.fields.length - 1
        ) {
          row[field[0]] =
            "26S" + sampleSeed + String(index + 1).padStart(3, "0");
        } else {
          row[field[0]] =
            values[fieldIndex - valueOffset] == null
              ? ""
              : values[fieldIndex - valueOffset];
        }
      });
      rows.push(row);
    }
    return rows;
  }
  function loadDocument(fdiseq) {
    var docs = global.SyssjcjMockData
      ? global.SyssjcjMockData.getDocuments()
      : readStore(CONFIG.documentKey, []);
    return (
      docs.find(function (item) {
        return item.fdiseq === fdiseq;
      }) ||
      (fdiseq === fallbackDocument.fdiseq || !fdiseq ? fallbackDocument : null)
    );
  }
  function loadMockData(documentItem) {
    var all = readStore(CONFIG.parseDataKey, {});
    if (!all[documentItem.fdiseq]) {
      all[documentItem.fdiseq] = makeRows(documentItem);
      writeStore(CONFIG.parseDataKey, all);
    }
    var infos = readStore(CONFIG.parseInfoKey, {});
    if (!infos[documentItem.fdiseq]) {
      infos[documentItem.fdiseq] = {
        startTime: documentItem.collectTime,
        endTime: documentItem.collectTime,
        result: documentItem.parseStatus,
        rawCount: Math.max(
          documentItem.dataCount,
          all[documentItem.fdiseq].length,
        ),
        successCount: documentItem.dataCount,
        skipCount: 0,
        error:
          documentItem.parseStatus === "解析失败"
            ? "未识别到有效的样品编号或项目映射"
            : "--",
        reason: "--",
        operator: "系统自动采集",
      };
      writeStore(CONFIG.parseInfoKey, infos);
    }
    return { rows: all[documentItem.fdiseq], info: infos[documentItem.fdiseq] };
  }
  function saveRows() {
    var all = readStore(CONFIG.parseDataKey, {});
    all[state.document.fdiseq] = state.allRows;
    writeStore(CONFIG.parseDataKey, all);
  }
  function saveInfo(info) {
    var all = readStore(CONFIG.parseInfoKey, {});
    all[state.document.fdiseq] = info;
    writeStore(CONFIG.parseInfoKey, all);
  }
  function updateDocument(count, status, parseTime) {
    var docs = readStore(CONFIG.documentKey, []),
      found = false;
    docs.forEach(function (item) {
      if (item.fdiseq === state.document.fdiseq) {
        item.dataCount = count;
        item.parseStatus = status;
        item.lastParseTime = parseTime;
        found = true;
      }
    });
    if (found) {
      if (global.SyssjcjMockData) {
        global.SyssjcjMockData.setDocuments(docs);
      } else {
        writeStore(CONFIG.documentKey, docs);
      }
    }
    state.document.dataCount = count;
    state.document.parseStatus = status;
    state.document.lastParseTime = parseTime;
  }
  function renderSummary() {
    setText("fileName", state.document.fileName);
    setText("fileId", "文件标识：" + state.document.fdiseq);
    setText("deviceName", state.document.deviceName);
    setText("instno", state.document.instno);
    setText("parserName", state.profile.parser);
    setText("parseStatus", state.document.parseStatus);
    setText("dataCount", state.allRows.length + " 条");
    setText(
      "lastParseTime",
      state.document.lastParseTime || state.document.collectTime,
    );
  }
  function renderHead() {
    var html =
      '<tr><th class="operation-column"><input id="selectAll" class="row-check" type="checkbox" aria-label="全选">&nbsp;操作</th>';
    state.profile.fields.forEach(function (field) {
      html +=
        '<th title="' +
        escapeHtml(field[1]) +
        '">' +
        escapeHtml(field[1]) +
        "</th>";
    });
    el("resultHead").innerHTML = html + "</tr>";
    el("resultTable").style.minWidth =
      Math.max(1180, (state.profile.fields.length + 1) * 150) + "px";
    el("selectAll").addEventListener("change", function () {
      var checked = this.checked;
      currentPageRows().forEach(function (row) {
        state.selected[row.fguid] = checked;
      });
      renderRows();
    });
  }
  function currentPageRows() {
    return state.filteredRows.slice(
      (state.page - 1) * state.pageSize,
      state.page * state.pageSize,
    );
  }
  function renderRows() {
    el("resultRows").innerHTML = currentPageRows()
      .map(function (row) {
        var html =
          '<tr><td class="operation-column"><input class="row-check" data-select="' +
          escapeHtml(row.fguid) +
          '" type="checkbox"' +
          (state.selected[row.fguid] ? " checked" : "") +
          '><button class="delete-row" data-delete="' +
          escapeHtml(row.fguid) +
          '" type="button">删除</button></td>';
        state.profile.fields.forEach(function (field) {
          var value = row[field[0]] == null ? "" : row[field[0]];
          html +=
            '<td title="' +
            escapeHtml(value) +
            '">' +
            escapeHtml(value) +
            "</td>";
        });
        return html + "</tr>";
      })
      .join("");
    el("emptyState").classList.toggle(
      "is-hidden",
      state.filteredRows.length > 0,
    );
    el("deleteSelectedButton").disabled = !Object.keys(state.selected).some(
      function (key) {
        return state.selected[key];
      },
    );
    var selectAll = el("selectAll"),
      pageRows = currentPageRows();
    if (selectAll) {
      selectAll.checked =
        pageRows.length > 0 &&
        pageRows.every(function (row) {
          return state.selected[row.fguid];
        });
    }
  }
  function renderPagination() {
    var pages = Math.max(
      1,
      Math.ceil(state.filteredRows.length / state.pageSize),
    );
    if (state.page > pages) {
      state.page = pages;
    }
    el("previousPage").disabled = state.page <= 1;
    el("nextPage").disabled = state.page >= pages;
    el("pageSummary").textContent =
      "共 " + (state.filteredRows.length ? pages : 0) + " 页，10 条";
    var start = Math.max(1, state.page - 2),
      end = Math.min(pages, start + 4),
      html = "";
    start = Math.max(1, end - 4);
    for (var page = start; page <= end; page += 1) {
      html +=
        '<button class="page-number' +
        (page === state.page ? " is-active" : "") +
        '" data-page="' +
        page +
        '" type="button">' +
        page +
        "</button>";
    }
    el("pageNumbers").innerHTML = html;
  }
  function applyQuery() {
    var sample = el("sampleQuery").value.trim().toLowerCase(),
      item = el("itemQuery").value.trim().toLowerCase();
    state.selected = {};
    state.page = 1;
    state.filteredRows = state.allRows.filter(function (row) {
      var sampleValue = String(row.sampno || "").toLowerCase();
      var itemValue = state.profile.fields
        .filter(function (field) {
          return /item|compound|organism|target/.test(field[0]);
        })
        .map(function (field) {
          return row[field[0]] || "";
        })
        .join(" ")
        .toLowerCase();
      return (
        (!sample || sampleValue.indexOf(sample) >= 0) &&
        (!item || itemValue.indexOf(item) >= 0)
      );
    });
    renderRows();
    renderPagination();
  }
  function renderInfo(info) {
    setText("infoInstno", state.document.instno);
    setText("infoParser", state.profile.parser);
    setText("infoFileType", state.document.fileType);
    setText("infoSampleFlag", state.profile.sampleFlag);
    setText("infoStartTime", info.startTime);
    setText("infoEndTime", info.endTime);
    setText("infoResult", info.result);
    setText("infoRawCount", info.rawCount + " 条");
    setText("infoSuccessCount", info.successCount + " 条");
    setText("infoSkipCount", info.skipCount + " 条");
    setText("infoError", info.error);
    setText("infoReason", info.reason);
    setText("infoOperator", info.operator);
  }
  function showToast(message) {
    var toast = el("toast");
    toast.textContent = message;
    toast.classList.remove("is-hidden");
    global.clearTimeout(showToast.timer);
    showToast.timer = global.setTimeout(function () {
      toast.classList.add("is-hidden");
    }, 2400);
  }
  function closeDialog(id) {
    el(id).classList.add("is-hidden");
  }
  function openReason() {
    el("reparseReason").value = "";
    el("reasonError").classList.add("is-hidden");
    el("reasonDialog").classList.remove("is-hidden");
    el("reparseReason").focus();
  }
  function selectedIds() {
    return Object.keys(state.selected).filter(function (key) {
      return state.selected[key];
    });
  }
  function openDelete(ids) {
    ids = ids || [];
    if (!ids.length) {
      showToast("请先选择需要删除的解析数据");
      return;
    }
    if (!CONFIG.mockMode) {
      var params = global.SyssjcjDocumentService.commonParams();
      params.hp = "common";
      params.message = encodeURIComponent(
        "确认删除选中的" + ids.length + "条解析数据吗？删除后不可恢复。",
      );
      params.qid = CONFIG.qids.deleteRows;
      params.data = encodeURIComponent(
        JSON.stringify({ fdiseq: Number(state.document.fdiseq), fguids: ids }),
      );
      params.action = "custom";
      global.isloadpage.openModal({
        hp: "common",
        hf: "common_confirm",
        params: params,
        title: "确认删除",
        width: 400,
        height: 250,
        showCloseBtn: false,
        successCallback: function (result) {
          if (result && result.success === true) deleteLiveRows(ids);
        },
      });
      return;
    }
    state.pendingSingle = ids && ids.length === 1 ? ids[0] : "";
    el("deleteDialog").classList.remove("is-hidden");
  }
  function deleteLiveRows(ids) {
    global.SyssjcjDocumentService
      .deleteParseRows(state.document.fdiseq, ids)
      .then(function () {
        return loadLiveData(state.document.fdiseq);
      })
      .then(function (payload) {
        if (!payload) throw new Error("删除后未找到采集文件");
        state.document = payload.document;
        state.profile = profileFor(state.document.instno);
        state.allRows = payload.rows.slice();
        state.filteredRows = state.allRows.slice();
        state.selected = {};
        state.page = 1;
        renderSummary();
        renderHead();
        renderRows();
        renderPagination();
        renderInfo(payload.info);
        showToast("解析数据删除成功");
      })
      .catch(function (error) {
        console.error("解析数据删除失败：", error);
        showToast(error.message || "解析数据删除失败");
      });
  }
  function submitDelete() {
    var ids = state.pendingSingle ? [state.pendingSingle] : selectedIds();
    if (!ids.length) {
      closeDialog("deleteDialog");
      return;
    }
    state.allRows = state.allRows.filter(function (row) {
      return ids.indexOf(row.fguid) < 0;
    });
    state.selected = {};
    saveRows();
    updateDocument(
      state.allRows.length,
      "解析成功",
      state.document.lastParseTime || state.document.collectTime,
    );
    var info = loadMockData(state.document).info;
    info.successCount = state.allRows.length;
    info.result = "解析成功";
    saveInfo(info);
    state.filteredRows = state.allRows.slice();
    closeDialog("deleteDialog");
    renderSummary();
    renderRows();
    renderPagination();
    renderInfo(info);
    showToast("解析数据删除成功");
  }
  function setProcessing(show) {
    var parentDoc = null;
    try {
      if (global.parent && global.parent !== global) {
        parentDoc = global.parent.document;
      }
    } catch (error) {
      parentDoc = null;
    }
    if (parentDoc) {
      var parentMask = parentDoc.getElementById("syssjcjReparseParentMask");
      if (show && !parentMask) {
        parentMask = parentDoc.createElement("div");
        parentMask.id = "syssjcjReparseParentMask";
        parentMask.style.cssText =
          "position:fixed;inset:0;z-index:10050;display:flex;align-items:center;justify-content:center;background:rgba(245,247,250,.9);font-family:Microsoft YaHei;color:#333";
        parentMask.innerHTML =
          '<div style="min-width:320px;padding:30px;background:#fff;border:1px solid #dfe5ed;border-radius:5px;text-align:center;box-shadow:0 10px 30px rgba(40,55,80,.16)"><div style="font-size:17px;font-weight:600">正在重新解析</div><div style="margin-top:8px;color:#888">请稍候，当前页面暂不可操作</div></div>';
        parentDoc.body.appendChild(parentMask);
      }
      if (!show && parentMask) {
        parentMask.remove();
      }
    }
    el("processingMask").classList.toggle("is-hidden", !show || !!parentDoc);
  }
  function submitReparse() {
    var reason = el("reparseReason").value.trim();
    if (!reason) {
      el("reasonError").classList.remove("is-hidden");
      return;
    }
    if (!CONFIG.mockMode) {
      closeDialog("reasonDialog");
      showToast("重新解析服务端接口尚未配置，当前未执行解析操作");
      return;
    }
    closeDialog("reasonDialog");
    setProcessing(true);
    global.setTimeout(function () {
      state.allRows = makeRows(state.document, true).map(function (row, index) {
        row.fguid =
          state.document.fdiseq + "-N" + String(index + 1).padStart(3, "0");
        return row;
      });
      state.filteredRows = state.allRows.slice();
      state.selected = {};
      state.page = 1;
      saveRows();
      var endTime = nowText(),
        info = {
          startTime: endTime,
          endTime: endTime,
          result: "解析成功",
          rawCount: state.allRows.length,
          successCount: state.allRows.length,
          skipCount: 0,
          error: "--",
          reason: reason,
          operator: "当前用户",
        };
      saveInfo(info);
      updateDocument(state.allRows.length, "解析成功", endTime);
      renderSummary();
      renderRows();
      renderPagination();
      renderInfo(info);
      setProcessing(false);
      showToast("重新解析完成");
    }, 1800);
  }
  function switchTab(tab) {
    document.querySelectorAll(".tab-button").forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.tab === tab);
    });
    el("dataTab").classList.toggle("is-hidden", tab !== "data");
    el("infoTab").classList.toggle("is-hidden", tab !== "info");
  }
  function bindEvents() {
    document.querySelectorAll(".tab-button").forEach(function (button) {
      button.addEventListener("click", function () {
        switchTab(button.dataset.tab);
      });
    });
    el("queryButton").addEventListener("click", applyQuery);
    el("resetButton").addEventListener("click", function () {
      el("sampleQuery").value = "";
      el("itemQuery").value = "";
      applyQuery();
    });
    el("reparseButton").addEventListener("click", openReason);
    el("deleteSelectedButton").addEventListener("click", function () {
      openDelete(selectedIds());
    });
    el("resultRows").addEventListener("change", function (event) {
      if (event.target.dataset.select) {
        state.selected[event.target.dataset.select] = event.target.checked;
        renderRows();
      }
    });
    el("resultRows").addEventListener("click", function (event) {
      var button = event.target.closest("[data-delete]");
      if (button) {
        openDelete([button.dataset.delete]);
      }
    });
    el("previousPage").addEventListener("click", function () {
      if (state.page > 1) {
        state.page -= 1;
        renderRows();
        renderPagination();
      }
    });
    el("nextPage").addEventListener("click", function () {
      if (state.page * state.pageSize < state.filteredRows.length) {
        state.page += 1;
        renderRows();
        renderPagination();
      }
    });
    el("pageNumbers").addEventListener("click", function (event) {
      var button = event.target.closest("[data-page]");
      if (button) {
        state.page = Number(button.dataset.page);
        renderRows();
        renderPagination();
      }
    });
    el("jumpPage").addEventListener("keydown", function (event) {
      if (event.key !== "Enter") {
        return;
      }
      var pages = Math.max(
          1,
          Math.ceil(state.filteredRows.length / state.pageSize),
        ),
        page = Number(this.value);
      if (!Number.isInteger(page) || page < 1 || page > pages) {
        showToast("请输入有效页码");
        return;
      }
      state.page = page;
      this.value = "";
      renderRows();
      renderPagination();
    });
    el("reasonClose").addEventListener("click", function () {
      closeDialog("reasonDialog");
    });
    el("reasonCancel").addEventListener("click", function () {
      closeDialog("reasonDialog");
    });
    el("reasonSubmit").addEventListener("click", submitReparse);
    el("deleteClose").addEventListener("click", function () {
      closeDialog("deleteDialog");
    });
    el("deleteCancel").addEventListener("click", function () {
      closeDialog("deleteDialog");
    });
    el("deleteSubmit").addEventListener("click", submitDelete);
  }
  function initialize() {
    if (typeof global.initGlobalParams === "function") {
      global.initGlobalParams();
    }
    bindEvents();
    var fdiseq = queryParam("fdiseq");
    if (!fdiseq) { showToast("缺少采集文件标识"); return; }
    var loader = CONFIG.mockMode
      ? Promise.resolve((function () {
          var documentItem = loadDocument(fdiseq);
          if (!documentItem) return null;
          var mock = loadMockData(documentItem);
          return { document: documentItem, rows: mock.rows, info: mock.info };
        })())
      : loadLiveData(fdiseq);
    loader.then(function (payload) {
      if (!payload) { showToast("未找到对应的采集文件"); return; }
      state.document = payload.document;
      state.profile = profileFor(state.document.instno);
      state.allRows = payload.rows.slice();
      state.filteredRows = state.allRows.slice();
      state.document.lastParseTime = state.document.lastParseTime || state.document.collectTime;
      renderSummary(); renderHead(); renderRows(); renderPagination(); renderInfo(payload.info);
    }).catch(function (error) {
      console.error("解析工作页加载失败：", error);
      showToast("解析数据加载失败，请返回列表后重试");
    });
  }
  global.addEventListener("load", initialize);
})(window);
