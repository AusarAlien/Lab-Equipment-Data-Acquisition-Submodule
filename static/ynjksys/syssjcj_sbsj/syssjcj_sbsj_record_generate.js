(function (global) {
  "use strict";
  var CONFIG = { mockMode: true, qids: { generateRecord: "" } },
    mock = global.SyssjcjMockData,
    context = null,
    rows = [],
    targetTemplate = null,
    targetDevice = null;
  function el(id) {
    return document.getElementById(id);
  }
  function find(list, key, value) {
    return (
      list.find(function (item) {
        return item[key] === value;
      }) || null
    );
  }
  function text(id, value) {
    var node = el(id),
      content = value == null || value === "" ? "--" : String(value);
    node.textContent = content;
    node.title = content;
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
  function closePage() {
    if (typeof global.closeModalDialog === "function") {
      global.closeModalDialog();
    }
  }
  function showError() {
    el("pageContent").classList.add("is-hidden");
    el("pageError").classList.remove("is-hidden");
  }
  function load() {
    try {
      context = JSON.parse(
        global.sessionStorage.getItem(mock.keys.generationContext) || "null",
      );
    } catch (error) {
      context = null;
    }
    if (!context) return false;
    var data = mock.getDataRows(),
      templates = mock.getTemplates();
    rows = context.dataIds
      .map(function (id) {
        return find(data, "dataId", id);
      })
      .filter(Boolean);
    targetTemplate = find(templates, "templateId", context.templateId);
    targetDevice = mock.getDevice(context.deviceId);
    return !!(rows.length && targetTemplate && targetDevice);
  }
  function render() {
    var department = mock.getDepartment(targetDevice.departmentId),
      documents = mock.getDocuments(),
      times = rows
        .map(function (row) {
          return row.experimentTime;
        })
        .sort(),
      range = times[0] + " 至 " + times[times.length - 1],
      defaultName = rows[0].sampleName + targetTemplate.name;
    text("templateName", targetTemplate.name);
    text(
      "recordMode",
      context.mode === "样品模式" ? "按单一样品生成" : "按检测项目生成",
    );
    var categoryNames = Array.from(
      new Set(
        rows.map(function (row) {
          return row.sampleCategoryName;
        }),
      ),
    ).join("、");
    text("sampleCategoryName", categoryNames);
    text("departmentName", department.name);
    text("deviceName", targetDevice.name);
    text("experimentRange", range);
    text("dataCount", rows.length + " 条");
    el("recordName").value = defaultName;
    text("paperTitle", targetTemplate.name);
    text("paperDepartment", department.name);
    text("paperDevice", targetDevice.name);
    text("paperModel", targetDevice.brand + " / " + targetDevice.model);
    text("paperAsset", targetDevice.assetNo);
    text("paperTime", range);
    text("paperTemplate", targetTemplate.name);
    text("paperSampleCategory", categoryNames);
    el("previewRows").innerHTML = rows
      .map(function (row, index) {
        var file = find(documents, "fdiseq", row.fdiseq) || {};
        return (
          "<tr><td>" +
          (index + 1) +
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
          escapeHtml(file.fileName) +
          '">' +
          escapeHtml(file.fileName) +
          "</td></tr>"
        );
      })
      .join("");
  }
  function submit() {
    var name = el("recordName").value.trim();
    if (!name) {
      el("recordName").focus();
      return;
    }
    el("workingMask").classList.remove("is-hidden");
    el("generateSubmit").disabled = true;
    setTimeout(function () {
      var records = mock.getRecords(),
        times = rows
          .map(function (row) {
            return row.experimentTime;
          })
          .sort(),
        record = {
          recordId: "REC" + Date.now(),
          name: name,
          templateId: targetTemplate.templateId,
          mode: context.mode,
          departmentId: targetDevice.departmentId,
          deviceId: targetDevice.deviceId,
          dataIds: rows.map(function (row) {
            return row.dataId;
          }),
          sampleCategories: Array.from(
            new Set(
              rows.map(function (row) {
                return row.sampleCategory;
              }),
            ),
          ),
          sampleCount: Array.from(
            new Set(
              rows.map(function (row) {
                return row.sampleNo;
              }),
            ),
          ).length,
          projectCount: Array.from(
            new Set(
              rows.map(function (row) {
                return row.projectName;
              }),
            ),
          ).length,
          experimentRange: times[0] + " 至 " + times[times.length - 1],
          createTime: "2026-08-04 " + new Date().toTimeString().slice(0, 8),
          creator: "监*一",
        };
      records.unshift(record);
      mock.setRecords(records);
      global.sessionStorage.removeItem(mock.keys.generationContext);
      try {
        if (
          global.parent &&
          typeof global.parent.syssjcjSbsjRefresh === "function"
        )
          global.parent.syssjcjSbsjRefresh();
      } catch (error) {}
      el("workingMask").classList.add("is-hidden");
      closePage();
    }, 1200);
  }
  function init() {
    if (typeof global.initGlobalParams === "function")
      global.initGlobalParams();
    if (!mock || !load()) {
      showError();
      return;
    }
    render();
    el("generateSubmit").onclick = submit;
  }
  global.addEventListener("load", init);
})(window);
