(function (global) {
  "use strict";
  var service = global.SyssjcjLogService;
  function el(id) {
    return document.getElementById(id);
  }
  function param(name) {
    return new URLSearchParams(global.location.search).get(name) || "";
  }
  function setText(id, value) {
    var node = el(id),
      text = value == null || value === "" ? "--" : String(value);
    node.textContent = text;
    node.title = text;
  }
  function esc(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c];
    });
  }
  function setTag(id, value, kind) {
    var node = el(id);
    node.textContent = value;
    node.title = value;
    node.className = "tag tag-" + kind;
  }
  function init() {
    if (typeof global.initGlobalParams === "function")
      global.initGlobalParams();
    Promise.all([
      service.loadStrategyLogDetail(param("auditId")),
      service.loadClients({}),
      service.loadDevices({}),
      service.loadDepartments(),
    ])
      .then(function (values) {
        var audit = values[0],
          clients = values[1],
          devices = values[2],
          departments = values[3];
        if (!audit) {
          el("page").classList.add("is-hidden");
          el("error").classList.remove("is-hidden");
          return;
        }
        var device =
          devices.find(function (x) {
            return x.deviceId === audit.deviceId;
          }) || {};
        var department =
          departments.find(function (x) {
            return x.departmentId === device.departmentId;
          }) || {};
        var client =
          clients.find(function (x) {
            return x.clientId === audit.clientId;
          }) || {};
        setText("auditId", audit.auditId);
        setText("strategyId", audit.strategyId);
        setText("strategyName", audit.strategyName);
        setText("department", department.name);
        setText("deviceName", device.name);
        setText("instno", device.instno);
        setText("clientId", client.clientId);
        setTag(
          "operationType",
          audit.operationType,
          audit.operationType === "删除" || audit.operationType === "停用"
            ? "warn"
            : "info",
        );
        setText("operationTime", audit.operationTime);
        setText("operator", audit.operator);
        setText("operationSource", audit.operationSource);
        setTag(
          "syncResult",
          audit.syncResult,
          audit.syncResult === "同步成功"
            ? "success"
            : audit.syncResult === "同步失败"
              ? "error"
              : "muted",
        );
        setText("changeSummary", audit.changeSummary);
        el("changeRows").innerHTML = (audit.changes || [])
          .map(function (change) {
            return (
              '<tr><td title="' +
              esc(change.field) +
              '">' +
              esc(change.field) +
              '</td><td title="' +
              esc(change.before) +
              '">' +
              esc(change.before || "--") +
              '</td><td title="' +
              esc(change.after) +
              '">' +
              esc(change.after || "--") +
              "</td></tr>"
            );
          })
          .join("");
      })
      .catch(function () {
        el("page").classList.add("is-hidden");
        el("error").classList.remove("is-hidden");
      });
  }
  global.addEventListener("load", init);
})(window);
