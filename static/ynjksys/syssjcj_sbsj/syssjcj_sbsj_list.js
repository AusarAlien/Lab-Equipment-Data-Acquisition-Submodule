(function (global) {
  "use strict";
  var CONFIG = {
    mockMode: true,
    pageSize: 10,
    defaultDbnm: "ynjk",
    qids: { dataList: "", recordList: "", generateRecord: "" },
  };
  var mock = global.SyssjcjMockData;
  var departments = mock ? mock.getDepartments() : [],
    devices = mock ? mock.getDevices() : [],
    documents = mock ? mock.getDocuments() : [],
    templates = mock ? mock.getTemplates() : [],
    allData = mock ? mock.getDataRows() : [];
  var state = {
    data: [],
    dataPage: 1,
    selected: {},
    records: [],
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
  function departmentName(id) {
    var item = find(departments, "departmentId", id);
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
    el("departmentSelect").insertAdjacentHTML("beforeend", html);
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
              " / " +
              item.brand +
              " " +
              item.model +
              " / " +
              item.assetNo,
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
    populateTemplates();
  }
  function populateTemplates() {
    var departmentId = el("departmentSelect").value,
      deviceId = el("deviceSelect").value,
      sampleCategory = el("sampleCategory").value,
      selected = el("templateSelect").value,
      instno = deviceId ? device(deviceId).instno : "";
    var list = templates.filter(function (item) {
      return (
        item.status === "启用" &&
        (!departmentId || item.departmentId === departmentId) &&
        (!deviceId ||
          (item.deviceIds && item.deviceIds.length
            ? item.deviceIds.indexOf(deviceId) >= 0
            : item.deviceTypes.indexOf(instno) >= 0)) &&
        (!sampleCategory ||
          (item.sampleCategories || []).indexOf(sampleCategory) >= 0)
      );
    });
    el("templateSelect").innerHTML =
      '<option value="">请选择模板</option>' +
      list
        .map(function (item) {
          return option(item.templateId, item.name);
        })
        .join("");
    if (
      list.some(function (item) {
        return item.templateId === selected;
      })
    ) {
      el("templateSelect").value = selected;
    }
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
    setTitle("contextOwner", item.owner);
    setTitle("contextCollectType", item.collectType);
  }
  function updateSampleCategories() {
    var departmentId = el("departmentSelect").value,
      deviceId = el("deviceSelect").value,
      available = {};
    allData.forEach(function (row) {
      var dev = device(row.deviceId);
      if (
        (!departmentId || dev.departmentId === departmentId) &&
        (!deviceId || row.deviceId === deviceId)
      ) {
        available[row.sampleCategory] = true;
      }
    });
    Array.from(el("sampleCategory").options).forEach(function (item) {
      if (item.value) {
        item.disabled = !available[item.value];
      }
    });
    if (
      el("sampleCategory").selectedOptions[0] &&
      el("sampleCategory").selectedOptions[0].disabled
    ) {
      el("sampleCategory").value = "";
    }
  }
  function queryData() {
    var sampleCategory = el("sampleCategory").value,
      departmentId = el("departmentSelect").value,
      deviceId = el("deviceSelect").value,
      sample = el("sampleKeyword").value.trim().toLowerCase(),
      project = el("projectKeyword").value.trim().toLowerCase(),
      start = el("startDate").value,
      end = el("endDate").value;
    if (start && end && start > end) {
      showToast("实验开始日期不能晚于结束日期");
      return;
    }
    state.data = allData.filter(function (row) {
      var dev = device(row.deviceId),
        day = row.experimentTime.slice(0, 10);
      return (
        (!sampleCategory || row.sampleCategory === sampleCategory) &&
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
    state.dataPage = 1;
    state.selected = {};
    renderData();
  }
  function currentDataRows() {
    var start = (state.dataPage - 1) * CONFIG.pageSize;
    return state.data.slice(start, start + CONFIG.pageSize);
  }
  function renderData() {
    var rows = currentDataRows(),
      start = (state.dataPage - 1) * CONFIG.pageSize;
    el("dataRows").innerHTML = rows
      .map(function (row, index) {
        var dev = device(row.deviceId),
          dep = departmentName(dev.departmentId),
          file = documentItem(row.fdiseq);
        return (
          '<tr><td><button class="action-link" data-action="detail" data-id="' +
          escapeHtml(row.dataId) +
          '" type="button">查看数据</button></td><td class="col-check"><input data-action="select" data-id="' +
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
          escapeHtml(row.sampleCategoryName) +
          '">' +
          escapeHtml(row.sampleCategoryName) +
          '</td><td title="' +
          escapeHtml(row.sampleName) +
          '">' +
          escapeHtml(row.sampleName) +
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
          escapeHtml(dev.name) +
          '">' +
          escapeHtml(dev.name) +
          '</td><td title="' +
          escapeHtml(dep) +
          '">' +
          escapeHtml(dep) +
          '</td><td title="' +
          escapeHtml(row.experimentTime) +
          '">' +
          escapeHtml(row.experimentTime) +
          '</td><td title="' +
          escapeHtml(file.collectTime) +
          '">' +
          escapeHtml(file.collectTime) +
          '</td><td title="' +
          escapeHtml(file.fileName) +
          '">' +
          escapeHtml(file.fileName) +
          "</td></tr>"
        );
      })
      .join("");
    el("dataEmpty").classList.toggle("is-hidden", state.data.length !== 0);
    el("dataSummary").textContent = "（当前查询 " + state.data.length + " 条）";
    var ids = Object.keys(state.selected).filter(function (id) {
      return state.selected[id];
    });
    el("selectedSummary").textContent = "已选择 " + ids.length + " 条";
    el("generateButton").disabled = !ids.length;
    var pageRows = currentDataRows();
    el("selectAll").checked =
      pageRows.length > 0 &&
      pageRows.every(function (row) {
        return state.selected[row.dataId];
      });
    renderPagination("data", state.data.length, state.dataPage);
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
    var selectedTemplate = template(el("templateSelect").value),
      mode = selectedTemplate.mode;
    if (first.deviceId !== row.deviceId) {
      return "生成同一份原始记录时不能混选不同仪器设备的数据";
    }
    if (first.sampleCategory !== row.sampleCategory) {
      return "生成同一份原始记录时不能混选不同样品类别的数据";
    }
    if (mode === "样品模式" && first.sampleNo !== row.sampleNo) {
      return "按单一样品生成时，只能选择同一样品编号的数据";
    }
    if (mode === "项目模式" && first.projectName !== row.projectName) {
      return "按检测项目生成时，只能选择同一检测项目的数据";
    }
    return "";
  }
  function toggleSelection(id, checked) {
    var row = find(allData, "dataId", id),
      selectedRows = Object.keys(state.selected)
        .filter(function (key) {
          return state.selected[key];
        })
        .map(function (key) {
          return find(allData, "dataId", key);
        })
        .filter(Boolean),
      message =
        checked && selectedRows.length
          ? canSelectTogether(selectedRows[0], row)
          : "";
    if (message) {
      showToast(message);
      renderData();
      return;
    }
    state.selected[id] = checked;
    renderData();
  }
  function detailPairs(row) {
    var dev = device(row.deviceId),
      dep = departmentName(dev.departmentId),
      file = documentItem(row.fdiseq);
    return [
      ["样品编号", row.sampleNo],
      ["样品类别", row.sampleCategoryName],
      ["样品名称", row.sampleName],
      ["检测项目", row.projectName],
      ["检测结果", row.result],
      ["结果单位", row.unit],
      ["所属部门", dep],
      ["仪器设备", dev.name],
      ["品牌型号", dev.brand + " / " + dev.model],
      ["实验时间", row.experimentTime],
      ["采集时间", file.collectTime],
      ["来源文件", file.fileName],
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
      .filter(function (id) {
        return state.selected[id];
      })
      .map(function (id) {
        return find(allData, "dataId", id);
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
    var templateId = el("templateSelect").value,
      target = template(templateId),
      dev = device(rows[0].deviceId);
    if (!templateId) {
      showToast("请先选择项目模板");
      return;
    }
    if (target.deviceTypes.indexOf(dev.instno) < 0) {
      showToast("所选模板不适用于当前仪器设备");
      return;
    }
    global.sessionStorage.setItem(
      mock.keys.generationContext,
      JSON.stringify({
        templateId: templateId,
        mode: target.mode,
        deviceId: dev.deviceId,
        dataIds: rows.map(function (row) {
          return row.dataId;
        }),
      }),
    );
    openPage("syssjcj_sbsj_record_generate", {}, "生成原始记录", 1380, 860);
  }
  function queryRecords() {
    var templateId = el("recordTemplate").value,
      start = el("recordStart").value,
      end = el("recordEnd").value;
    if (start && end && start > end) {
      showToast("生成开始日期不能晚于结束日期");
      return;
    }
    state.records = mock.getRecords().filter(function (item) {
      var day = item.createTime.slice(0, 10);
      return (
        (!templateId || item.templateId === templateId) &&
        (!start || day >= start) &&
        (!end || day <= end)
      );
    });
    state.recordPage = 1;
    renderRecords();
  }
  function modeName(mode) {
    return mode === "样品模式" ? "按单一样品生成" : "按检测项目生成";
  }
  function recordCategoryNames(record) {
    return Array.from(
      new Set(
        record.dataIds
          .map(function (id) {
            return find(allData, "dataId", id);
          })
          .filter(Boolean)
          .map(function (row) {
            return row.sampleCategoryName;
          }),
      ),
    ).join("、");
  }
  function renderRecords() {
    var start = (state.recordPage - 1) * CONFIG.pageSize,
      rows = state.records.slice(start, start + CONFIG.pageSize);
    el("recordRows").innerHTML = rows
      .map(function (row, index) {
        var tpl = template(row.templateId),
          dev = device(row.deviceId);
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
          escapeHtml(tpl.name) +
          '">' +
          escapeHtml(tpl.name) +
          '</td><td title="' +
          modeName(row.mode) +
          '">' +
          modeName(row.mode) +
          '</td><td title="' +
          escapeHtml(recordCategoryNames(row)) +
          '">' +
          escapeHtml(recordCategoryNames(row)) +
          '</td><td title="' +
          escapeHtml(departmentName(row.departmentId)) +
          '">' +
          escapeHtml(departmentName(row.departmentId)) +
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
    el("recordEmpty").classList.toggle("is-hidden", state.records.length !== 0);
    el("recordSummary").textContent =
      "（当前查询 " + state.records.length + " 条）";
    renderPagination("record", state.records.length, state.recordPage);
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
      prefix === "data" ? renderData() : renderRecords();
    };
    el(prefix + "Previous").onclick = function () {
      if (state[prefix + "Page"] > 1) {
        state[prefix + "Page"] -= 1;
        prefix === "data" ? renderData() : renderRecords();
      }
    };
    el(prefix + "Next").onclick = function () {
      var total = prefix === "data" ? state.data.length : state.records.length;
      if (state[prefix + "Page"] * CONFIG.pageSize < total) {
        state[prefix + "Page"] += 1;
        prefix === "data" ? renderData() : renderRecords();
      }
    };
    el(prefix + "Jump").onkeydown = function (event) {
      if (event.key !== "Enter") {
        return;
      }
      var total = prefix === "data" ? state.data.length : state.records.length,
        pages = Math.ceil(total / CONFIG.pageSize),
        page = Number(this.value);
      if (page < 1 || page > pages) {
        showToast("请输入有效页码");
        return;
      }
      state[prefix + "Page"] = page;
      this.value = "";
      prefix === "data" ? renderData() : renderRecords();
    };
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
      updateSampleCategories();
    };
    el("deviceSelect").onchange = function () {
      renderDeviceContext();
      populateTemplates();
      updateSampleCategories();
    };
    el("templateSelect").onchange = function () {
      state.selected = {};
      renderData();
    };
    el("sampleCategory").onchange = function () {
      populateTemplates();
      state.selected = {};
      queryData();
    };
    el("queryButton").onclick = queryData;
    el("resetButton").onclick = function () {
      [
        "departmentSelect",
        "deviceSelect",
        "templateSelect",
        "sampleCategory",
        "sampleKeyword",
        "projectKeyword",
        "startDate",
        "endDate",
      ].forEach(function (id) {
        el(id).value = "";
      });
      populateDevices();
      populateTemplates();
      updateSampleCategories();
      queryData();
    };
    el("dataRows").onclick = function (event) {
      var target = event.target.closest("[data-action]");
      if (!target) {
        return;
      }
      if (target.dataset.action === "detail") {
        openDataDetail(target.dataset.id);
      }
      if (target.dataset.action === "select") {
        toggleSelection(target.dataset.id, target.checked);
      }
    };
    el("selectAll").onchange = function () {
      var checked = this.checked;
      currentDataRows().forEach(function (row) {
        if (!checked) {
          state.selected[row.dataId] = false;
          return;
        }
        var selected = selectedRows();
        if (!selected.length || !canSelectTogether(selected[0], row)) {
          state.selected[row.dataId] = true;
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
    if (!mock) {
      showToast("标准模拟数据未加载");
      return;
    }
    populateDepartments();
    populateDevices();
    populateTemplates();
    updateSampleCategories();
    bind();
    queryData();
    queryRecords();
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
