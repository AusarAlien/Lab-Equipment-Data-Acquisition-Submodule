(function (global) {
  "use strict";

  var PAGE_CONFIG = {
    mockMode: false,
    defaultDbnm: "ynjk",
    storageKey: global.SyssjcjMockData
      ? global.SyssjcjMockData.keys.documents
      : "syssjcj_cjwd_mock_documents_v4",
    filterKey: "syssjcj_cjwd_list_filters_v1",
    qids: {
      documentList: "ynjksys_01001q",
      deviceOptions: "ynjksys_01004q",
      deleteDocument: "ynjksys_01006q",
    },
    pages: {
      detail: "syssjcj_cjwd_detail",
      parseWorkspace: "syssjcj_cjwd_parse_workspace",
      spectrum: "syssjcj_cjwd_spectrum_list",
    },
    developedPages: {
      syssjcj_cjwd_detail: true,
      syssjcj_cjwd_parse_workspace: true,
      syssjcj_cjwd_spectrum_list: true,
    },
  };

  /* 模拟数据降级区：恢复模拟模式时取消本段注释，并将 mockMode 改为 true。
  var initialDocuments = [
    {
      fdiseq: "CJ202608030001",
      fileName: "ICPMS_金属元素批量检测结果.xlsx",
      fileType: "Excel",
      instno: "ICPMS",
      deviceName: "ICP-MS金属元素分析仪",
      parserClass: "ExcelICPMS",
      fileSize: 284672,
      collectTime: "2026-08-03 09:26:18",
      parseStatus: "解析成功",
      dataCount: 128,
      canDelete: true,
    },
    {
      fdiseq: "CJ202608030002",
      fileName: "AllSampleData_FQ_Chromatogram.xlsx",
      fileType: "Excel",
      instno: "ICPMS1",
      deviceName: "ICP-MS单样品多项目分析仪",
      parserClass: "ExcelICPMS1",
      fileSize: 468392,
      collectTime: "2026-08-03 09:18:46",
      parseStatus: "解析成功",
      dataCount: 96,
      canDelete: true,
    },
    {
      fdiseq: "CJ202608030003",
      fileName: "MBY2_酶标仪检测结果.xlsx",
      fileType: "Excel",
      instno: "MBY2",
      deviceName: "酶标仪（珠海疾控2楼）",
      parserClass: "ExcelMBY2",
      fileSize: 198436,
      collectTime: "2026-08-03 08:52:11",
      parseStatus: "解析成功",
      dataCount: 84,
      canDelete: true,
    },
    {
      fdiseq: "CJ202608020014",
      fileName: "6_液相色谱仪.pdf",
      fileType: "PDF",
      instno: "AGILENT-1200",
      deviceName: "安捷伦1200液相色谱仪",
      parserClass: "Agilent1200",
      fileSize: 1852467,
      collectTime: "2026-08-02 16:45:32",
      parseStatus: "解析成功",
      dataCount: 36,
      canDelete: true,
    },
    {
      fdiseq: "CJ202608020013",
      fileName: "70_Microflex菌种鉴定报告.pdf",
      fileType: "PDF",
      instno: "BRUKER-MICROFLEX",
      deviceName: "布鲁克Microflex飞行时间质谱仪",
      parserClass: "BrukerMicroflex",
      fileSize: 2458316,
      collectTime: "2026-08-02 15:21:06",
      parseStatus: "解析成功",
      dataCount: 24,
      canDelete: true,
    },
    {
      fdiseq: "CJ202608020012",
      fileName: "302_维生素检测系统_FLD数据.pdf",
      fileType: "PDF",
      instno: "WATERS-ACQUITY-UPLC",
      deviceName: "Waters Acquity UPLC维生素检测系统",
      parserClass: "WatersAcquityUPLC",
      fileSize: 2154208,
      collectTime: "2026-08-02 14:33:29",
      parseStatus: "解析成功",
      dataCount: 48,
      canDelete: true,
    },
    {
      fdiseq: "CJ202608020011",
      fileName: "1443_GCMS-TQ8050NX农残报告.pdf",
      fileType: "PDF",
      instno: "GCMS-TQ8050NX",
      deviceName: "岛津GCMS-TQ8050NX气质联用仪",
      parserClass: "GCMSTQ8050NX",
      fileSize: 3782190,
      collectTime: "2026-08-02 11:08:57",
      parseStatus: "解析失败",
      dataCount: 0,
      canDelete: true,
    },
    {
      fdiseq: "CJ202608010021",
      fileName: "20250305ReportView.pdf",
      fileType: "PDF",
      instno: "LightCycler480",
      deviceName: "罗氏LightCycler 480 PCR仪",
      parserClass: "LightCycler480",
      fileSize: 975234,
      collectTime: "2026-08-01 17:12:43",
      parseStatus: "解析成功",
      dataCount: 72,
      canDelete: true,
    },
    {
      fdiseq: "CJ202608010020",
      fileName: "ElisaTxt_酶免结果.txt",
      fileType: "TXT",
      instno: "ElisaTxt",
      deviceName: "酶标仪（Elisa文本接口）",
      parserClass: "ElisaTxt",
      fileSize: 89264,
      collectTime: "2026-08-01 15:47:10",
      parseStatus: "解析成功",
      dataCount: 40,
      canDelete: true,
    },
    {
      fdiseq: "CJ202608010019",
      fileName: "DIONEXICS5000_离子色谱结果.xlsx",
      fileType: "Excel",
      instno: "DIONEXICS5000",
      deviceName: "Dionex ICS-5000离子色谱仪",
      parserClass: "ExcelDIONEXICS5000",
      fileSize: 276410,
      collectTime: "2026-08-01 10:22:35",
      parseStatus: "解析失败",
      dataCount: 0,
      canDelete: true,
    },
    {
      fdiseq: "CJ202607310030",
      fileName: "SZJS_水中金属检测数据.xlsx",
      fileType: "Excel",
      instno: "SZJS",
      deviceName: "水中金属检测仪",
      parserClass: "ExcelSZJS",
      fileSize: 412906,
      collectTime: "2026-07-31 16:38:44",
      parseStatus: "解析成功",
      dataCount: 182,
      canDelete: true,
    },
    {
      fdiseq: "CJ202607310029",
      fileName: "849_安捷伦7890A碳管报告.pdf",
      fileType: "PDF",
      instno: "AGILENT-7890A",
      deviceName: "安捷伦7890A气相色谱仪",
      parserClass: "Agilent7890A",
      fileSize: 1690240,
      collectTime: "2026-07-31 13:16:09",
      parseStatus: "解析成功",
      dataCount: 32,
      canDelete: true,
    },
  ];
  if (global.SyssjcjMockData) {
    initialDocuments = global.SyssjcjMockData.getDocuments();
  }
  */
  var initialDocuments = [];

  var state = {
    page: 1,
    pageSize: 10,
    total: 0,
    rows: [],
    pendingDelete: null,
  };

  function el(id) {
    return document.getElementById(id);
  }
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
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
        reject(new Error("平台查询号尚未配置"));
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
  function readMockDocuments() {
    if (global.SyssjcjMockData) {
      return global.SyssjcjMockData.getDocuments();
    }
    try {
      var stored = global.sessionStorage.getItem(PAGE_CONFIG.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.warn("模拟文档读取失败：", error);
    }
    var documents = clone(initialDocuments);
    writeMockDocuments(documents);
    return documents;
  }
  function writeMockDocuments(documents) {
    if (global.SyssjcjMockData) {
      global.SyssjcjMockData.setDocuments(documents);
      return;
    }
    try {
      global.sessionStorage.setItem(
        PAGE_CONFIG.storageKey,
        JSON.stringify(documents),
      );
    } catch (error) {
      console.warn("模拟文档保存失败：", error);
    }
  }
  function getFilters() {
    return {
      fileName: el("fileName").value.trim(),
      deviceCode: el("deviceSelect").value,
      fileType: el("fileType").value,
      parseStatus: el("parseStatus").value,
      startDate: el("startDate").value,
      endDate: el("endDate").value,
    };
  }
  function validateFilters(filters) {
    if (
      filters.startDate &&
      filters.endDate &&
      filters.startDate > filters.endDate
    ) {
      return "采集开始日期不能晚于结束日期";
    }
    return "";
  }
  function saveListState(filters) {
    try {
      global.sessionStorage.setItem(
        PAGE_CONFIG.filterKey,
        JSON.stringify({
          filters: filters,
          page: state.page,
          pageSize: state.pageSize,
        }),
      );
    } catch (error) {
      console.warn("查询状态保存失败：", error);
    }
  }
  function restoreListState() {
    try {
      var saved = JSON.parse(
        global.sessionStorage.getItem(PAGE_CONFIG.filterKey) || "null",
      );
      if (!saved) {
        return;
      }
      Object.keys(saved.filters || {}).forEach(function (key) {
        var target = el(
          {
            fileName: "fileName",
            deviceCode: "deviceSelect",
            fileType: "fileType",
            parseStatus: "parseStatus",
            startDate: "startDate",
            endDate: "endDate",
          }[key],
        );
        if (target) {
          target.value = saved.filters[key] || "";
        }
      });
      state.page = Number(saved.page) || 1;
      state.pageSize = 10;
    } catch (error) {
      console.warn("查询状态恢复失败：", error);
    }
  }
  function mockQueryDocuments(filters, page, pageSize) {
    var filtered = readMockDocuments().filter(function (item) {
      var date = item.collectTime.slice(0, 10);
      return (
        (!filters.fileName ||
          item.fileName.toLowerCase().indexOf(filters.fileName.toLowerCase()) >=
            0) &&
        (!filters.deviceCode || item.instno === filters.deviceCode) &&
        (!filters.fileType || item.fileType === filters.fileType) &&
        (!filters.parseStatus || item.parseStatus === filters.parseStatus) &&
        (!filters.startDate || date >= filters.startDate) &&
        (!filters.endDate || date <= filters.endDate)
      );
    });
    var start = (page - 1) * pageSize;
    return Promise.resolve({
      rows: filtered.slice(start, start + pageSize),
      total: filtered.length,
    });
  }
  function mockDeleteDocument(fdiseq) {
    var documents = readMockDocuments().filter(function (item) {
      return item.fdiseq !== fdiseq;
    });
    writeMockDocuments(documents);
    return Promise.resolve({ success: true });
  }

  var dataService = {
    queryDocuments: function (filters, page, pageSize) {
      if (PAGE_CONFIG.mockMode) {
        return mockQueryDocuments(filters, page, pageSize);
      }
      // 正式查询：HII 文件归档表与 HTLIS 解析结果表按 fdiseq 关联。
      return queryPlatform(PAGE_CONFIG.qids.documentList, {
        file_name_sql_equal: filters.fileName,
        file_name_encoded_sql_equal: filters.fileName
          ? encodeURIComponent(filters.fileName)
          : "",
        instno_sql_equal: filters.deviceCode,
        file_type_sql_equal: filters.fileType,
        parse_status_sql_equal: filters.parseStatus,
        start_date_sql_equal: filters.startDate,
        end_date_sql_equal: filters.endDate,
        page_sql_equal: page,
        page_size_sql_equal: pageSize,
      }).then(function (result) {
        var service = global.SyssjcjDocumentService;
        var rows = rowsFromResult(result).map(service.normalizeDocument);
        return {
          rows: rows,
          total: rows.length ? rows[0].total : 0,
        };
      });
    },
    deleteDocument: function (fdiseq) {
      if (PAGE_CONFIG.mockMode) {
        return mockDeleteDocument(fdiseq);
      }
      return global.SyssjcjDocumentService.deleteDocument(fdiseq);
    },
    downloadDocument: function (item) {
      if (PAGE_CONFIG.mockMode) {
        return Promise.resolve();
      }
      global.SyssjcjDocumentService.triggerDownload(item.fdiseq);
      return Promise.resolve();
    },
  };

  function fillDeviceOptions() {
    queryPlatform(PAGE_CONFIG.qids.deviceOptions, {})
      .then(function (result) {
        return rowsFromResult(result).map(
          global.SyssjcjDocumentService.normalizeDevice,
        );
      })
      .then(function (devices) {
        devices.forEach(function (item) {
        var option = document.createElement("option");
          option.value = item.instno;
          option.textContent = item.deviceName;
          option.title = item.deviceName;
        el("deviceSelect").appendChild(option);
      });
      })
      .catch(function (error) {
        console.error("采集设备选项加载失败：", error);
      });
  }
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
    return status === "解析成功" ? "status-success" : "status-error";
  }
  function renderRows() {
    var tbody = el("documentRows");
    tbody.innerHTML = state.rows
      .map(function (item, index) {
        var number = (state.page - 1) * state.pageSize + index + 1;
        return (
          '<tr data-fdiseq="' +
          escapeHtml(item.fdiseq) +
          '">' +
          '<td class="col-actions">' +
          '<button class="action-link" data-action="detail" type="button">查看</button>' +
          '<button class="action-link" data-action="download" type="button">下载</button>' +
          '<button class="action-link" data-action="parse" type="button">解析数据</button>' +
          '<button class="action-link danger" data-action="delete" type="button"' +
          (item.canDelete ? "" : ' disabled title="当前文件不可删除"') +
          ">删除</button>" +
          "</td>" +
          '<td class="col-index">' +
          number +
          "</td>" +
          '<td class="col-name"><span class="file-name" title="' +
          escapeHtml(item.fileName) +
          '">' +
          escapeHtml(item.fileName) +
          "</span></td>" +
          '<td title="' +
          escapeHtml(item.fileType) +
          '">' +
          escapeHtml(item.fileType) +
          "</td>" +
          '<td title="' +
          escapeHtml(item.deviceName) +
          '">' +
          escapeHtml(item.deviceName) +
          "</td>" +
          '<td title="' +
          escapeHtml(formatFileSize(item.fileSize)) +
          '">' +
          formatFileSize(item.fileSize) +
          "</td>" +
          '<td title="' +
          escapeHtml(item.collectTime) +
          '">' +
          escapeHtml(item.collectTime) +
          "</td>" +
          '<td title="' +
          escapeHtml(item.parseStatus) +
          '"><span class="status ' +
          statusClass(item.parseStatus) +
          '">' +
          escapeHtml(item.parseStatus) +
          "</span></td>" +
          '<td title="' +
          Number(item.dataCount || 0).toLocaleString("zh-CN") +
          ' 条">' +
          Number(item.dataCount || 0).toLocaleString("zh-CN") +
          " 条</td></tr>"
        );
      })
      .join("");
    el("emptyState").classList.toggle("is-hidden", state.rows.length > 0);
  }
  function renderPagination() {
    var totalPages = Math.max(1, Math.ceil(state.total / state.pageSize));
    if (state.page > totalPages) {
      state.page = totalPages;
      queryList();
      return;
    }
    el("pageSummary").textContent =
      "共 " + (state.total ? totalPages : 0) + " 页，10 条";
    el("resultSummary").textContent = state.total
      ? "（当前查询 " + state.total + " 条）"
      : "";
    el("previousPage").disabled = state.page <= 1;
    el("nextPage").disabled = state.page >= totalPages;
    var start = Math.max(1, state.page - 2),
      end = Math.min(totalPages, start + 4);
    start = Math.max(1, end - 4);
    var html = "";
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
  function setLoading(loading) {
    el("loadingState").classList.toggle("is-hidden", !loading);
    el("queryButton").disabled = loading;
    el("resetButton").disabled = loading;
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
  function showPlatformMessage(message, type) {
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
  function queryList() {
    var filters = getFilters(),
      message = validateFilters(filters);
    if (message) {
      showPlatformMessage(message, "info");
      return;
    }
    saveListState(filters);
    setLoading(true);
    el("emptyState").classList.add("is-hidden");
    dataService
      .queryDocuments(filters, state.page, state.pageSize)
      .then(function (result) {
        state.rows = result.rows || [];
        state.total = Number(result.total) || 0;
        renderRows();
        renderPagination();
      })
      .catch(function (error) {
        state.rows = [];
        state.total = 0;
        renderRows();
        renderPagination();
        console.error("采集文档列表查询失败：", error);
        showPlatformMessage("采集文档列表加载失败，请稍后重试", "error");
      })
      .finally(function () {
        setLoading(false);
      });
  }
  function resetQuery() {
    [
      "fileName",
      "deviceSelect",
      "fileType",
      "parseStatus",
      "startDate",
      "endDate",
    ].forEach(function (id) {
      el(id).value = "";
    });
    state.page = 1;
    state.pageSize = 10;
    el("jumpPage").value = "";
    queryList();
  }
  function findItem(fdiseq) {
    return state.rows.find(function (item) {
      return item.fdiseq === fdiseq;
    });
  }
  function openBusinessPage(hf, fdiseq, sourcePage) {
    var params = commonParams();
    params.fdiseq = fdiseq || "";
    params.sourcePage = sourcePage || "syssjcj_cjwd_list";
    if (PAGE_CONFIG.mockMode && !PAGE_CONFIG.developedPages[hf]) {
      showPlatformMessage("目标页面将在后续步骤开发：" + hf, "info");
      return;
    }
    if (
      global.isloadpage &&
      typeof global.isloadpage.openModal === "function"
    ) {
      var title =
        hf === PAGE_CONFIG.pages.detail
          ? "采集文件详情"
          : hf === PAGE_CONFIG.pages.parseWorkspace
            ? "解析工作页"
            : "图谱查询";
      global.isloadpage.openModal({
        hp: params.hp,
        hf: hf,
        params: params,
        title: title,
        width: 1500,
        height: 900,
        successCallback: queryList,
      });
      return;
    }
    showPlatformMessage("目标页面将在下一步开发：" + hf, "info");
  }
  function handleDownload(item) {
    dataService
      .downloadDocument(item)
      .then(function () {
        showPlatformMessage("文件下载已触发：" + item.fileName, "success");
      })
      .catch(function (error) {
        console.error(error);
        showPlatformMessage(error.message || "文件下载失败", "error");
      });
  }
  function openDeleteConfirm(item) {
    if (!item.canDelete) {
      showPlatformMessage("文件正在解析，暂时不能删除", "info");
      return;
    }
    if (!PAGE_CONFIG.mockMode) {
      var params = commonParams();
      params.hp = "common";
      params.message = encodeURIComponent(
        "确认删除归档文件“" + item.fileName + "”吗？该文件的解析数据将一并删除。",
      );
      params.qid = PAGE_CONFIG.qids.deleteDocument;
      params.data = encodeURIComponent(JSON.stringify({ fdiseq: Number(item.fdiseq) }));
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
          if (!result || result.success !== true) return;
          dataService
            .deleteDocument(item.fdiseq)
            .then(function () {
              showPlatformMessage("文件删除成功", "success");
              queryList();
            })
            .catch(function (error) {
              console.error("文件删除失败：", error);
              showPlatformMessage(error.message || "文件删除失败", "error");
            });
        },
      });
      return;
    }
    state.pendingDelete = item;
    el("confirmMessage").textContent =
      "确认删除归档文件“" + item.fileName + "”吗？该文件的解析数据将一并删除。";
    el("mockConfirm").classList.remove("is-hidden");
    el("confirmSubmit").focus();
  }
  function closeDeleteConfirm() {
    state.pendingDelete = null;
    el("mockConfirm").classList.add("is-hidden");
  }
  function submitDelete() {
    var item = state.pendingDelete;
    if (!item) {
      return;
    }
    el("confirmSubmit").disabled = true;
    dataService
      .deleteDocument(item.fdiseq)
      .then(function () {
        closeDeleteConfirm();
        showPlatformMessage("文件删除成功", "success");
        queryList();
      })
      .catch(function (error) {
        console.error("文件删除失败：", error);
        showPlatformMessage(error.message || "文件删除失败", "error");
      })
      .finally(function () {
        el("confirmSubmit").disabled = false;
      });
  }
  function handleTableClick(event) {
    var action = event.target.closest("[data-action]");
    if (!action || action.disabled) {
      return;
    }
    var row = action.closest("tr[data-fdiseq]"),
      item = row && findItem(row.dataset.fdiseq);
    if (!item) {
      return;
    }
    if (action.dataset.action === "detail") {
      openBusinessPage(PAGE_CONFIG.pages.detail, item.fdiseq);
    }
    if (action.dataset.action === "download") {
      handleDownload(item);
    }
    if (action.dataset.action === "parse") {
      openBusinessPage(PAGE_CONFIG.pages.parseWorkspace, item.fdiseq);
    }
    if (action.dataset.action === "delete") {
      openDeleteConfirm(item);
    }
  }
  function bindEvents() {
    el("queryButton").addEventListener("click", function () {
      state.page = 1;
      queryList();
    });
    el("resetButton").addEventListener("click", resetQuery);
    el("spectrumButton").addEventListener("click", function () {
      openBusinessPage(PAGE_CONFIG.pages.spectrum, "", "syssjcj_cjwd_list");
    });
    el("documentRows").addEventListener("click", handleTableClick);
    el("previousPage").addEventListener("click", function () {
      if (state.page > 1) {
        state.page -= 1;
        queryList();
      }
    });
    el("nextPage").addEventListener("click", function () {
      if (state.page * state.pageSize < state.total) {
        state.page += 1;
        queryList();
      }
    });
    el("pageNumbers").addEventListener("click", function (event) {
      var button = event.target.closest("[data-page]");
      if (button) {
        state.page = Number(button.dataset.page);
        queryList();
      }
    });
    el("jumpPage").addEventListener("keydown", function (event) {
      if (event.key !== "Enter") {
        return;
      }
      var totalPages = Math.max(1, Math.ceil(state.total / state.pageSize));
      var targetPage = Number(this.value);
      if (
        !Number.isInteger(targetPage) ||
        targetPage < 1 ||
        targetPage > totalPages
      ) {
        showPlatformMessage("请输入有效页码", "info");
        return;
      }
      state.page = targetPage;
      queryList();
      this.value = "";
    });
    el("confirmClose").addEventListener("click", closeDeleteConfirm);
    el("confirmCancel").addEventListener("click", closeDeleteConfirm);
    el("confirmSubmit").addEventListener("click", submitDelete);
    el("mockConfirm").addEventListener("click", function (event) {
      if (event.target === this) {
        closeDeleteConfirm();
      }
    });
    global.addEventListener("keydown", function (event) {
      if (
        event.key === "Escape" &&
        !el("mockConfirm").classList.contains("is-hidden")
      ) {
        closeDeleteConfirm();
      }
    });
  }
  function initialize() {
    if (typeof global.initGlobalParams === "function") {
      global.initGlobalParams();
    }
    fillDeviceOptions();
    restoreListState();
    bindEvents();
    queryList();
  }
  global.addEventListener("load", initialize);
})(window);
