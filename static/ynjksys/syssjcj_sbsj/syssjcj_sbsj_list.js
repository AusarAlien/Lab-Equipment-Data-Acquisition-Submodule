(function (global) {
  "use strict";
  var CONFIG = {
    mockMode: false,
    pageSize: 10,
    defaultDbnm: "ynjk",
    qids: {
      dataList: "ynjksys_03001q",
      deviceOptions: "ynjksys_03002q",
      departmentOptions: "ynjksys_03003q",
      templateOptions: "ynjksys_03005q",
      recordList: "ynjksys_03007q",
    },
  };
  var mock = global.SyssjcjMockData;
  var mockDepartments = mock ? mock.getDepartments() : [],
    mockDevices = mock ? mock.getDevices() : [],
    mockData = mock ? mock.getDataRows() : [];
  var departments = CONFIG.mockMode && mock ? mock.getDepartments() : [],
    devices = CONFIG.mockMode && mock ? mock.getDevices() : [],
    documents = mock ? mock.getDocuments() : [],
    templates = mock ? mock.getTemplates() : [],
    allData = CONFIG.mockMode && mock ? mock.getDataRows() : [];
  var state = {
    data: [],
    dataTotal: 0,
    dataPage: 1,
    selected: {},
    records: [],
    recordTotal: 0,
    recordPage: 1,
  };
  function el(id) {
    return document.getElementById(id);
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
  function find(list, key, value) {
    return (
      list.find(function (item) {
        return item[key] === value;
      }) || null
    );
  }
  function option(value, text) {
    return (
      '<option value="' +
      escapeHtml(value) +
      '" title="' +
      escapeHtml(text) +
      '">' +
      escapeHtml(text) +
      "</option>"
    );
  }
  function unique(values) {
    return Array.from(new Set(values));
  }
  function rowsFromResult(result) {
    if (!result || !Array.isArray(result.data)) return [];
    if (!result.data.length || !Array.isArray(result.data[0])) return result.data;
    if (
      global.isqrydata &&
      typeof global.isqrydata.convertDataToObject === "function"
    ) {
      return global.isqrydata.convertDataToObject(
        result.data,
        result.title || [],
      );
    }
    return result.data.map(function (values) {
      var row = {};
      (result.title || []).forEach(function (title, index) {
        row[title] = values[index];
      });
      return row;
    });
  }
  function commonParams() {
    var params =
      typeof global.buildCommonParams === "function"
        ? global.buildCommonParams() || {}
        : {};
    params.hp = params.hp || "ynjksys";
    if (!params.dbnm || /^(none|null|undefined)$/i.test(String(params.dbnm))) {
      params.dbnm = CONFIG.defaultDbnm;
    }
    return params;
  }
  function queryPlatform(qid, businessParams) {
    return new Promise(function (resolve, reject) {
      if (!qid) return reject(new Error("平台查询号尚未配置"));
      if (!global.isqrydata || typeof global.isqrydata.query !== "function") {
        return reject(new Error("平台查询组件 isqrydata.js 未加载"));
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
  function safeDecode(value) {
    var text = String(value == null ? "" : value).replace(/\+/g, "%20");
    try {
      return decodeURIComponent(text);
    } catch (error) {
      return String(value == null ? "" : value);
    }
  }
  function normalizeActualRow(row) {
    return {
      dataId: String(row["数据标识"] || ""),
      fdiseq: String(row["文件序号"] || ""),
      deviceId: String(row["仪器编号"] || ""),
      instno: String(row["仪器编号"] || ""),
      deviceName: row["仪器设备"] || row["仪器编号"] || "--",
      sampleNo: row["样品编号"] || "--",
      sampleSeq: row["样品序号"] || "",
      sampleCategory: "",
      sampleCategoryName: "--",
      sampleName: "--",
      projectCode: row["检测项目编号"] || "",
      projectName: row["检测项目"] || row["检测项目编号"] || "--",
      result: row["结果摘要"] == null ? "--" : row["结果摘要"],
      unit: row["单位"] || "--",
      experimentTime: row["数据入库时间"] || "--",
      collectTime: row["采集时间"] || "--",
      fileName: safeDecode(row["来源文件"] || ""),
      departmentId: String(row["部门编号"] || ""),
      departmentName: row["部门名称"] || "--",
      total: Number(row["总数"] || 0),
    };
  }
  function normalizeActualRecord(row) {
    var modeCode = String(row["生成方式代码"] || ""),
      categoryNames = String(row["样品类别"] || "")
        .split("、")
        .filter(function (value) {
          return value && value !== "--";
        });
    return {
      recordId: String(row["原始记录标识"] || ""),
      recordNo: row["原始记录编号"] || "--",
      name: row["原始记录名称"] || "--",
      status: row["记录状态"] || "--",
      mode: {
        FILE: "来源文件模式",
        SAMPLE: "样品模式",
        ITEM: "项目模式",
      }[modeCode] || modeCode,
      templateId: String(row["模板编号"] || ""),
      templateName: row["模板名称"] || "--",
      templateVersion: row["模板版本"] || "",
      deviceId: String(row["仪器编号"] || ""),
      device: {
        deviceId: String(row["仪器编号"] || ""),
        instno: String(row["仪器编号"] || ""),
        name: row["仪器设备"] || "--",
      },
      departmentId: String(row["部门编号"] || ""),
      departmentName: row["部门名称"] || "--",
      sampleCategoryNames: categoryNames,
      sampleCount: Number(row["样品数量"] || 0),
      projectCount: Number(row["项目数量"] || 0),
      dataCount: Number(row["数据数量"] || 0),
      sourceFileCount: Number(row["来源文件数量"] || 0),
      experimentRange:
        (row["实验开始时间"] || "--") +
        " 至 " +
        (row["实验结束时间"] || "--"),
      createTime: row["生成时间"] || "--",
      creator: row["生成人"] || row["生成人账号"] || "--",
      total: Number(row["总数"] || 0),
    };
  }
  function departmentName(id) {
    var item = find(departments, "departmentId", id);
    return item ? item.name : "--";
  }
  function recordDepartmentName(id) {
    var item = find(mockDepartments, "departmentId", id);
    return item ? item.name : "--";
  }
  function device(id) {
    return find(devices, "deviceId", id) || {};
  }
  function documentItem(id) {
    return find(documents, "fdiseq", id) || {};
  }
  function template(id) {
    return find(templates, "templateId", id) || {};
  }
  function setTitle(id, value) {
    var node = el(id),
      text = value == null || value === "" ? "--" : String(value);
    node.textContent = text;
    node.title = text;
  }
  function showToast(message) {
    var toast = el("toast");
    toast.textContent = message;
    toast.classList.remove("is-hidden");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(function () {
      toast.classList.add("is-hidden");
    }, 2200);
  }
  function populateDepartments() {
    var html = departments
      .map(function (item) {
        return option(item.departmentId, item.name);
      })
      .join("");
    el("departmentSelect").innerHTML =
      '<option value="">全部部门</option>' + html;
    el("departmentSelect").disabled = false;
  }
  function populateDevices() {
    var departmentId = el("departmentSelect").value,
      current = el("deviceSelect").value;
    el("deviceSelect").innerHTML =
      '<option value="">全部设备</option>' +
      devices
        .filter(function (item) {
          return !departmentId || item.departmentId === departmentId;
        })
        .map(function (item) {
          return option(
            item.deviceId,
            item.name +
              (item.brand || item.model
                ? " / " + (item.brand || "") + " " + (item.model || "")
                : "") +
              (item.assetNo ? " / " + item.assetNo : ""),
          );
        })
        .join("");
    if (
      Array.from(el("deviceSelect").options).some(function (item) {
        return item.value === current;
      })
    ) {
      el("deviceSelect").value = current;
    } else {
      el("deviceSelect").value = "";
    }
    renderDeviceContext();
    populateRecordTemplates();
  }
  function populateRecordTemplates() {
    el("recordTemplate").innerHTML =
      '<option value="">全部模板</option>' +
      templates
        .map(function (item) {
          return option(item.templateId, item.name);
        })
        .join("");
  }
  function renderDeviceContext() {
    var item = device(el("deviceSelect").value);
    el("deviceContext").classList.toggle("is-hidden", !item.deviceId);
    if (!item.deviceId) {
      return;
    }
    setTitle("contextModel", item.brand + " / " + item.model);
    setTitle("contextAsset", item.assetNo);
    setTitle("contextLocation", item.location);
    setTitle("contextCollectType", item.collectType);
  }
  function queryData(resetPage) {
    var departmentId = el("departmentSelect").value,
      deviceId = el("deviceSelect").value,
      sample = el("sampleKeyword").value.trim().toLowerCase(),
      project = el("projectKeyword").value.trim().toLowerCase(),
      start = el("startDate").value,
      end = el("endDate").value;
    if (start && end && start > end) {
      showToast("数据入库开始日期不能晚于结束日期");
      return;
    }
    if (!CONFIG.mockMode) {
      if (resetPage !== false) {
        state.dataPage = 1;
        state.selected = {};
      }
      el("queryButton").disabled = true;
      queryPlatform(CONFIG.qids.dataList, {
        department_sql_equal: departmentId,
        instno_sql_equal: deviceId,
        sampno_sql_equal: el("sampleKeyword").value.trim(),
        item_keyword_sql_equal: el("projectKeyword").value.trim(),
        start_date_sql_equal: start,
        end_date_sql_equal: end,
        page_sql_equal: state.dataPage,
        page_size_sql_equal: CONFIG.pageSize,
      })
        .then(function (result) {
          state.data = rowsFromResult(result).map(normalizeActualRow);
          state.dataTotal = state.data.length ? state.data[0].total : 0;
          allData = state.data.slice();
          renderData();
        })
        .catch(function (error) {
          state.data = [];
          state.dataTotal = 0;
          renderData();
          console.error("设备采集数据查询失败：", error);
          showToast("设备采集数据查询失败，请稍后重试");
        })
        .finally(function () {
          el("queryButton").disabled = false;
        });
      return;
    }
    /* 模拟数据查询降级区：恢复 mockMode 后使用。 */
    state.data = allData.filter(function (row) {
      var dev = device(row.deviceId),
        day = row.experimentTime.slice(0, 10);
      return (
        (!departmentId || dev.departmentId === departmentId) &&
        (!deviceId || row.deviceId === deviceId) &&
        (!sample || row.sampleNo.toLowerCase().indexOf(sample) >= 0) &&
        (!project || row.projectName.toLowerCase().indexOf(project) >= 0) &&
        (!start || day >= start) &&
        (!end || day <= end)
      );
    });
    state.data.sort(function (a, b) {
      return (
        a.sampleNo.localeCompare(b.sampleNo) ||
        a.projectName.localeCompare(b.projectName)
      );
    });
    if (resetPage !== false) {
      state.dataPage = 1;
      state.selected = {};
    }
    state.dataTotal = state.data.length;
    renderData();
  }
  function currentDataRows() {
    if (!CONFIG.mockMode) return state.data;
    var start = (state.dataPage - 1) * CONFIG.pageSize;
    return state.data.slice(start, start + CONFIG.pageSize);
  }
  function renderData() {
    var rows = currentDataRows(),
      start = (state.dataPage - 1) * CONFIG.pageSize;
    el("dataRows").innerHTML = rows
      .map(function (row, index) {
        var dev = device(row.deviceId),
          file = CONFIG.mockMode ? documentItem(row.fdiseq) : row;
        return (
          '<tr><td><button class="action-link" data-action="detail" data-id="' +
          escapeHtml(row.dataId) +
          '" type="button">查看数据</button> <button class="action-link" data-action="source" data-id="' +
          escapeHtml(row.dataId) +
          '" type="button">来源文件</button></td><td class="col-check"><input data-action="select" data-id="' +
          escapeHtml(row.dataId) +
          '" type="checkbox"' +
          (state.selected[row.dataId] ? " checked" : "") +
          "></td><td>" +
          (start + index + 1) +
          '</td><td title="' +
          escapeHtml(row.sampleNo) +
          '">' +
          escapeHtml(row.sampleNo) +
          '</td><td title="' +
          escapeHtml(row.projectName) +
          '">' +
          escapeHtml(row.projectName) +
          '</td><td title="' +
          escapeHtml(row.result) +
          '">' +
          escapeHtml(row.result) +
          "</td><td>" +
          escapeHtml(row.unit) +
          '</td><td title="' +
          escapeHtml(dev.name || row.deviceName) +
          '">' +
          escapeHtml(dev.name || row.deviceName) +
          '</td><td title="' +
          escapeHtml(row.experimentTime) +
          '">' +
          escapeHtml(row.experimentTime) +
          '</td><td title="' +
          escapeHtml(file.collectTime) +
          '">' +
          escapeHtml(file.collectTime || row.collectTime) +
          '</td><td title="' +
          escapeHtml(file.fileName || row.fileName) +
          '">' +
          escapeHtml(file.fileName || row.fileName) +
          "</td></tr>"
        );
      })
      .join("");
    var total = CONFIG.mockMode ? state.data.length : state.dataTotal;
    el("dataEmpty").classList.toggle("is-hidden", total !== 0);
    el("dataSummary").textContent = "（当前查询 " + total + " 条）";
    var ids = Object.keys(state.selected).filter(function (id) {
      return state.selected[id];
    });
    el("selectedSummary").textContent = "已选择 " + ids.length + " 条";
    el("generateButton").disabled = !ids.length;
    var pageRows = currentDataRows();
    var selectedOnPage = pageRows.filter(function (row) {
        return state.selected[row.dataId];
      }).length,
      allSelected = pageRows.length > 0 && selectedOnPage === pageRows.length;
    el("selectAll").checked = allSelected;
    el("selectAll").indeterminate = selectedOnPage > 0 && !allSelected;
    renderPagination("data", total, state.dataPage);
  }
  function renderPagination(prefix, total, page) {
    var pages = Math.ceil(total / CONFIG.pageSize),
      host = el(prefix + "Pages");
    host.innerHTML = "";
    for (var index = 1; index <= pages; index += 1) {
      host.insertAdjacentHTML(
        "beforeend",
        '<button class="page-number' +
          (index === page ? " is-active" : "") +
          '" data-page="' +
          index +
          '" type="button">' +
          index +
          "</button>",
      );
    }
    el(prefix + "Previous").disabled = page <= 1;
    el(prefix + "Next").disabled = !pages || page >= pages;
    el(prefix + "PageSummary").textContent = "共 " + pages + " 页，10 条";
  }
  function canSelectTogether(first, row) {
    if (first.deviceId !== row.deviceId) {
      return "生成同一份原始记录时不能混选不同仪器设备的数据";
    }
    return "";
  }
  function toggleSelection(id, checked) {
    var row = find(currentDataRows(), "dataId", id),
      rows = selectedRows(),
      message =
        checked && rows.length && row
          ? canSelectTogether(rows[0], row)
          : "";
    if (!row) {
      showToast("未找到对应的采集数据，请重新查询");
      renderData();
      return;
    }
    if (message) {
      showToast(message);
      renderData();
      return;
    }
    if (checked) {
      state.selected[id] = row;
    } else {
      delete state.selected[id];
    }
    renderData();
  }
  function detailPairs(row) {
    var dev = device(row.deviceId),
      file = CONFIG.mockMode ? documentItem(row.fdiseq) : row;
    return [
      ["样品编号", row.sampleNo],
      ["样品序号", row.sampleSeq || "--"],
      ["检测项目编号", row.projectCode],
      ["检测项目", row.projectName],
      ["检测结果", row.result],
      ["结果单位", row.unit],
      ["仪器编号", row.instno || row.deviceId],
      ["仪器设备", dev.name || row.deviceName],
      [CONFIG.mockMode ? "实验时间" : "数据入库时间", row.experimentTime],
      ["采集时间", file.collectTime || row.collectTime],
      ["来源文件", file.fileName || row.fileName],
      ["文件序号", row.fdiseq],
      ["数据标识", row.dataId],
    ];
  }
  function openDataDetail(id) {
    var row = find(allData, "dataId", id);
    openModal(
      "采集数据详情",
      '<div class="detail-grid">' +
        detailPairs(row)
          .map(function (pair) {
            return (
              "<div><span>" +
              escapeHtml(pair[0]) +
              '</span><strong title="' +
              escapeHtml(pair[1]) +
              '">' +
              escapeHtml(pair[1]) +
              "</strong></div>"
            );
          })
          .join("") +
        "</div>",
      '<button class="button button-primary" data-modal-action="close" type="button">确定</button>',
    );
  }
  function selectedRows() {
    return Object.keys(state.selected)
      .map(function (id) {
        return state.selected[id];
      })
      .filter(Boolean);
  }
  function openPage(hf, params, title, width, height) {
    var common =
      typeof global.buildCommonParams === "function"
        ? global.buildCommonParams() || {}
        : {};
    common.hp = common.hp || "ynjksys";
    common.dbnm =
      common.dbnm && !/^(none|null|undefined)$/i.test(String(common.dbnm))
        ? common.dbnm
        : CONFIG.defaultDbnm;
    Object.keys(params || {}).forEach(function (key) {
      common[key] = params[key];
    });
    if (
      global.isloadpage &&
      typeof global.isloadpage.openModal === "function"
    ) {
      global.isloadpage.openModal({
        hp: common.hp,
        hf: hf,
        params: common,
        title: title,
        width: width,
        height: height,
        successCallback: function () {
          queryRecords();
        },
      });
      return;
    }
    showToast("页面加载组件未就绪");
  }
  function openGenerate() {
    var rows = selectedRows();
    if (!rows.length) {
      return;
    }
    var invalid = rows
      .slice(1)
      .map(function (row) {
        return canSelectTogether(rows[0], row);
      })
      .find(Boolean);
    if (invalid) {
      showToast(invalid);
      return;
    }
    var dev = device(rows[0].deviceId),
      contextKey = mock && mock.keys
        ? mock.keys.generationContext
        : "syssjcj_mock_generation_context_v1";
    global.sessionStorage.setItem(
      contextKey,
      JSON.stringify({
        deviceId: dev.deviceId,
        device: dev,
        rows: rows,
        dataIds: rows.map(function (row) {
          return row.dataId;
        }),
      }),
    );
    openPage("syssjcj_sbsj_record_generate", {}, "生成原始记录", 1380, 860);
  }
  function queryRecords(resetPage) {
    var templateId = el("recordTemplate").value,
      start = el("recordStart").value,
      end = el("recordEnd").value;
    if (resetPage !== false) state.recordPage = 1;
    if (start && end && start > end) {
      showToast("生成开始日期不能晚于结束日期");
      return;
    }
    if (!CONFIG.mockMode) {
      queryPlatform(CONFIG.qids.recordList, {
        template_id_sql_equal: templateId,
        start_date_sql_equal: start,
        end_date_sql_equal: end,
        page_sql_equal: state.recordPage,
        page_size_sql_equal: CONFIG.pageSize,
      })
        .then(function (result) {
          state.records = rowsFromResult(result).map(normalizeActualRecord);
          state.recordTotal = state.records.length ? state.records[0].total : 0;
          renderRecords();
        })
        .catch(function (error) {
          state.records = [];
          state.recordTotal = 0;
          renderRecords();
          console.error("原始记录列表查询失败：", error);
          showToast("原始记录列表查询失败，请稍后重试");
        });
      return;
    }
    /* 模拟记录查询降级区：仅在 CONFIG.mockMode=true 时使用。 */
    state.records = mock.getRecords().filter(function (item) {
      var day = item.createTime.slice(0, 10);
      return (
        (!templateId || item.templateId === templateId) &&
        (!start || day >= start) &&
        (!end || day <= end)
      );
    });
    state.recordTotal = state.records.length;
    renderRecords();
  }
  function modeName(mode) {
    return {
      来源文件模式: "按来源文件生成",
      样品模式: "按样品生成",
      项目模式: "按检测项目生成",
    }[mode] || mode || "--";
  }
  function recordCategoryNames(record) {
    if (record.sampleCategoryNames && record.sampleCategoryNames.length) {
      return record.sampleCategoryNames.join("、");
    }
    return Array.from(
      new Set(
        (record.dataRows || record.dataIds
          .map(function (id) {
            return find(mockData, "dataId", id);
          })
          .filter(Boolean))
          .map(function (row) {
            return row.sampleCategoryName;
          }),
      ),
    ).join("、");
  }
  function renderRecords() {
    var start = (state.recordPage - 1) * CONFIG.pageSize,
      rows = CONFIG.mockMode
        ? state.records.slice(start, start + CONFIG.pageSize)
        : state.records,
      total = CONFIG.mockMode ? state.records.length : state.recordTotal;
    el("recordRows").innerHTML = rows
      .map(function (row, index) {
        var tpl = template(row.templateId),
          dev = row.device || device(row.deviceId) ||
            find(mockDevices, "deviceId", row.deviceId) || {},
          templateName = row.templateName || tpl.name || "--",
          department = row.departmentName || recordDepartmentName(row.departmentId);
        return (
          '<tr><td><button class="action-link" data-action="record" data-id="' +
          escapeHtml(row.recordId) +
          '" type="button">查看</button></td><td>' +
          (start + index + 1) +
          '</td><td title="' +
          escapeHtml(row.name) +
          '">' +
          escapeHtml(row.name) +
          '</td><td title="' +
          escapeHtml(templateName) +
          '">' +
          escapeHtml(templateName) +
          '</td><td title="' +
          modeName(row.mode) +
          '">' +
          modeName(row.mode) +
          '</td><td title="' +
          escapeHtml(recordCategoryNames(row)) +
          '">' +
          escapeHtml(recordCategoryNames(row)) +
          '</td><td title="' +
          escapeHtml(department) +
          '">' +
          escapeHtml(department) +
          '</td><td title="' +
          escapeHtml(dev.name) +
          '">' +
          escapeHtml(dev.name) +
          "</td><td>" +
          row.sampleCount +
          "</td><td>" +
          row.projectCount +
          '</td><td title="' +
          escapeHtml(row.experimentRange) +
          '">' +
          escapeHtml(row.experimentRange) +
          '</td><td title="' +
          escapeHtml(row.createTime) +
          '">' +
          escapeHtml(row.createTime) +
          "</td><td>" +
          escapeHtml(row.creator) +
          "</td></tr>"
        );
      })
      .join("");
    el("recordEmpty").classList.toggle("is-hidden", total !== 0);
    el("recordSummary").textContent =
      "（当前查询 " + total + " 条）";
    renderPagination("record", total, state.recordPage);
  }
  function openRecord(id) {
    openPage(
      "syssjcj_sbsj_record_view",
      { recordId: id },
      "查阅原始记录",
      1380,
      860,
    );
  }
  function openModal(title, body, footer) {
    el("modalTitle").textContent = title;
    el("modalBody").innerHTML = body;
    el("modalFooter").innerHTML = footer;
    el("businessModal").classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
  }
  function closeModal() {
    el("businessModal").classList.add("is-hidden");
    el("modalBody").innerHTML = "";
    el("modalFooter").innerHTML = "";
    document.body.style.overflow = "";
  }
  function switchTab(name) {
    document.querySelectorAll(".business-tab").forEach(function (button) {
      button.classList.toggle("is-active", button.dataset.tab === name);
    });
    el("dataTab").classList.toggle("is-hidden", name !== "data");
    el("recordsTab").classList.toggle("is-hidden", name !== "records");
  }
  function bindPagination(prefix) {
    el(prefix + "Pages").onclick = function (event) {
      var button = event.target.closest("[data-page]");
      if (!button) {
        return;
      }
      state[prefix + "Page"] = Number(button.dataset.page);
      prefix === "data" ? queryData(false) : queryRecords(false);
    };
    el(prefix + "Previous").onclick = function () {
      if (state[prefix + "Page"] > 1) {
        state[prefix + "Page"] -= 1;
        prefix === "data" ? queryData(false) : queryRecords(false);
      }
    };
    el(prefix + "Next").onclick = function () {
      var total =
        prefix === "data"
          ? CONFIG.mockMode
            ? state.data.length
            : state.dataTotal
          : CONFIG.mockMode
            ? state.records.length
            : state.recordTotal;
      if (state[prefix + "Page"] * CONFIG.pageSize < total) {
        state[prefix + "Page"] += 1;
        prefix === "data" ? queryData(false) : queryRecords(false);
      }
    };
    el(prefix + "Jump").onkeydown = function (event) {
      if (event.key !== "Enter") {
        return;
      }
      var total =
          prefix === "data"
            ? CONFIG.mockMode
              ? state.data.length
              : state.dataTotal
            : CONFIG.mockMode
              ? state.records.length
              : state.recordTotal,
        pages = Math.ceil(total / CONFIG.pageSize),
        page = Number(this.value);
      if (page < 1 || page > pages) {
        showToast("请输入有效页码");
        return;
      }
      state[prefix + "Page"] = page;
      this.value = "";
      prefix === "data" ? queryData(false) : queryRecords(false);
    };
  }
  function loadDictionary(qid, label) {
    return queryPlatform(qid, {})
      .then(rowsFromResult)
      .catch(function (error) {
        console.error(label + "加载失败：", error);
        showToast(label + "加载失败");
        return [];
      });
  }
  function loadActualDictionaries() {
    return Promise.all([
      loadDictionary(CONFIG.qids.departmentOptions, "部门词典"),
      loadDictionary(CONFIG.qids.deviceOptions, "仪器设备词典"),
      loadDictionary(CONFIG.qids.templateOptions, "原始记录模板词典"),
    ]).then(function (resultSets) {
      departments = resultSets[0].map(function (row) {
        return {
          departmentId: String(row["部门编号"] || ""),
          name: row["部门名称"] || "--",
        };
      });
      devices = resultSets[1]
        .map(function (row) {
          return {
            deviceId: String(row["仪器编号"] || ""),
            instno: String(row["仪器编号"] || ""),
            name: row["仪器设备"] || row["仪器编号"] || "--",
            departmentId: String(row["部门编号"] || ""),
            departmentName: row["部门名称"] || "--",
            brand: row["品牌"] || "",
            model: row["型号"] || "",
            assetNo: row["固定资产编号"] || "",
            location: row["位置"] || "",
            collectType: "接口监听自动采集",
          };
        })
        .filter(function (item) {
          return item.deviceId;
        });
      templates = resultSets[2].map(function (row) {
        return {
          templateId: String(row["模板编号"] || ""),
          name: row["模板名称"] || "--",
          mode: row["默认组织规则"] || row["组织规则"] || "",
          version: row["模板版本"] || "",
          status: "启用",
        };
      });
      populateDepartments();
      populateDevices();
      populateRecordTemplates();
    });
  }
  function bind() {
    document.querySelector(".business-tabs").onclick = function (event) {
      var button = event.target.closest("[data-tab]");
      if (button) {
        switchTab(button.dataset.tab);
      }
    };
    el("departmentSelect").onchange = function () {
      populateDevices();
    };
    el("deviceSelect").onchange = function () {
      renderDeviceContext();
    };
    el("queryButton").onclick = function () {
      queryData(true);
    };
    el("resetButton").onclick = function () {
      [
        "departmentSelect",
        "deviceSelect",
        "sampleKeyword",
        "projectKeyword",
        "startDate",
        "endDate",
      ].forEach(function (id) {
        el(id).value = "";
      });
      populateDevices();
      queryData(true);
    };
    el("dataRows").onclick = function (event) {
      var target = event.target.closest("[data-action]");
      if (!target) {
        return;
      }
      if (target.dataset.action === "detail") {
        openDataDetail(target.dataset.id);
      }
      if (target.dataset.action === "source") {
        var sourceRow = find(allData, "dataId", target.dataset.id);
        if (sourceRow && sourceRow.fdiseq) {
          openPage(
            "syssjcj_cjwd_detail",
            { fdiseq: sourceRow.fdiseq },
            "采集文件详情",
            1460,
            900,
          );
        }
      }
      if (target.dataset.action === "select") {
        toggleSelection(target.dataset.id, target.checked);
      }
    };
    el("selectAll").onchange = function () {
      var checked = this.checked;
      currentDataRows().forEach(function (row) {
        if (!checked) {
          delete state.selected[row.dataId];
          return;
        }
        var selected = selectedRows();
        if (!selected.length || !canSelectTogether(selected[0], row)) {
          state.selected[row.dataId] = row;
        }
      });
      renderData();
    };
    el("generateButton").onclick = openGenerate;
    ["recordTemplate", "recordStart", "recordEnd"].forEach(function (id) {
      el(id).onchange = queryRecords;
    });
    el("recordResetButton").onclick = function () {
      ["recordTemplate", "recordStart", "recordEnd"].forEach(function (id) {
        el(id).value = "";
      });
      queryRecords();
    };
    el("recordRows").onclick = function (event) {
      var button = event.target.closest('[data-action="record"]');
      if (button) {
        openRecord(button.dataset.id);
      }
    };
    el("modalClose").onclick = closeModal;
    el("businessModal").onclick = function (event) {
      if (event.target === this) {
        closeModal();
      }
    };
    el("modalFooter").onclick = function (event) {
      if (event.target.closest("[data-modal-action]")) {
        closeModal();
      }
    };
    document.addEventListener("keydown", function (event) {
      if (
        event.key === "Escape" &&
        !el("businessModal").classList.contains("is-hidden")
      ) {
        closeModal();
      }
    });
    bindPagination("data");
    bindPagination("record");
  }
  function initialize() {
    if (typeof global.initGlobalParams === "function") {
      global.initGlobalParams();
    }
    if (CONFIG.mockMode && !mock) {
      showToast("标准模拟数据未加载");
      return;
    }
    populateDepartments();
    populateRecordTemplates();
    bind();
    queryRecords();
    if (CONFIG.mockMode) {
      populateDevices();
      queryData(true);
      return;
    }
    el("generateButton").title = "选择采集数据后进入原始记录生成设置";
    loadActualDictionaries().finally(function () {
      queryData(true);
    });
  }
  global.syssjcjSbsjRefresh = function () {
    state.selected = {};
    queryData();
    queryRecords();
    switchTab("records");
    showToast("原始记录生成完成");
  };
  global.addEventListener("load", initialize);
})(window);
