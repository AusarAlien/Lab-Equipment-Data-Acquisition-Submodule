(function (global) {
  "use strict";
  var mock = global.SyssjcjMockData;
  function el(id) {
    return document.getElementById(id);
  }
  function param(name) {
    return new URLSearchParams(global.location.search).get(name) || "";
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
  function showError() {
    el("recordPage").classList.add("is-hidden");
    el("pageError").classList.remove("is-hidden");
  }
  function render(record) {
    var template = find(mock.getTemplates(), "templateId", record.templateId),
      device = mock.getDevice(record.deviceId),
      department = mock.getDepartment(record.departmentId),
      data = mock.getDataRows(),
      documents = mock.getDocuments(),
      rows = record.dataIds
        .map(function (id) {
          return find(data, "dataId", id);
        })
        .filter(Boolean);
    text("recordId", record.recordId);
    text("templateName", template.name);
    text("createTime", record.createTime);
    text("creator", record.creator);
    text("recordTitle", record.name);
    text("departmentName", department.name);
    text("deviceName", device.name);
    text("deviceModel", device.brand + " / " + device.model);
    text("assetNo", device.assetNo);
    text(
      "recordMode",
      record.mode === "样品模式" ? "按单一样品生成" : "按检测项目生成",
    );
    text(
      "sampleCategoryName",
      Array.from(
        new Set(
          rows.map(function (row) {
            return row.sampleCategoryName;
          }),
        ),
      ).join("、"),
    );
    text("experimentRange", record.experimentRange);
    text("footerCreator", "记录生成：" + record.creator);
    text("footerTime", "生成时间：" + record.createTime);
    el("recordDataRows").innerHTML = rows
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
          '</td><td title="' +
          escapeHtml(file.collectTime) +
          '">' +
          escapeHtml(file.collectTime) +
          "</td></tr>"
        );
      })
      .join("");
  }
  function init() {
    if (typeof global.initGlobalParams === "function")
      global.initGlobalParams();
    if (!mock) {
      showError();
      return;
    }
    var record = find(mock.getRecords(), "recordId", param("recordId"));
    if (!record) {
      showError();
      return;
    }
    render(record);
  }
  global.addEventListener("load", init);
})(window);
