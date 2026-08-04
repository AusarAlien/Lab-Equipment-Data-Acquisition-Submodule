(function (global) {
  "use strict";
  var S = global.SyssjcjConfigService,
    state = { rows: [], departments: [], target: null, mode: "add" };
  function el(id) {
    return document.getElementById(id);
  }
  function param(n) {
    return new URLSearchParams(location.search).get(n) || "";
  }
  function find(a, k, v) {
    return (
      a.find(function (x) {
        return x[k] === v;
      }) || {}
    );
  }
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>"']/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      }[c];
    });
  }
  function toast(m) {
    var n = el("toast");
    n.textContent = m;
    n.classList.remove("is-hidden");
    clearTimeout(toast.t);
    toast.t = setTimeout(function () {
      n.classList.add("is-hidden");
    }, 2200);
  }
  function opts() {
    el("departmentId").innerHTML = state.departments
      .map(function (x) {
        return (
          '<option value="' +
          esc(x.departmentId) +
          '">' +
          esc(x.name) +
          "</option>"
        );
      })
      .join("");
  }
  function fill() {
    var x = state.target || {};
    [
      "sourceName",
      "sourceType",
      "purpose",
      "departmentId",
      "status",
      "sourceId",
      "connectionString",
      "sql",
      "description",
    ].forEach(function (id) {
      el(id).value = x[id] || (id === "status" ? "启用" : "");
    });
    if (state.mode === "copy") {
      el("sourceId").value = "DS-" + Date.now();
      el("sourceName").value = (x.sourceName || "") + "（副本）";
      el("status").value = "停用";
    }
    if (state.mode === "view") {
      document.querySelectorAll("input,select,textarea").forEach(function (n) {
        n.disabled = true;
      });
      el("footer").classList.add("is-hidden");
    }
  }
  function notify() {
    try {
      if (global.parent && global.parent.SyssjcjConfigPage)
        global.parent.SyssjcjConfigPage.refresh();
    } catch (e) {}
  }
  function validate() {
    if (
      !el("sourceName").value.trim() ||
      !el("connectionString").value.trim() ||
      !el("sql").value.trim()
    ) {
      toast("请填写数据源名称、连接字符和执行语句");
      return false;
    }
    return true;
  }
  function save() {
    if (!validate()) return;
    var isNew = state.mode === "add" || state.mode === "copy",
      x = isNew
        ? {
            sourceId: el("sourceId").value || "DS-" + Date.now(),
            references: [],
          }
        : state.target;
    [
      "sourceName",
      "sourceType",
      "purpose",
      "departmentId",
      "status",
      "connectionString",
      "sql",
      "description",
    ].forEach(function (id) {
      x[id] = el(id).value.trim();
    });
    x.updateBy = "监*一";
    x.updateTime = "2026-08-04 16:48:00";
    if (isNew) state.rows.unshift(x);
    S.saveSources(state.rows).then(function () {
      state.target = x;
      state.mode = "edit";
      el("sourceId").value = x.sourceId;
      notify();
      toast("数据源已保存");
    });
  }
  function simulate(kind) {
    if (!validate()) return;
    el("mask").classList.remove("is-hidden");
    setTimeout(function () {
      el("mask").classList.add("is-hidden");
      if (kind === "preview") el("previewCard").classList.remove("is-hidden");
      toast(kind === "preview" ? "查询预览完成" : "连接测试成功");
    }, 700);
  }
  function init() {
    if (typeof global.initGlobalParams === "function")
      global.initGlobalParams();
    state.mode = param("mode") || "add";
    Promise.all([S.loadSources({}), S.loadDepartments()])
      .then(function (v) {
        state.rows = v[0];
        state.departments = v[1];
        state.target = find(state.rows, "sourceId", param("sourceId"));
        if (!state.target.sourceId) state.target = null;
        opts();
        fill();
        el("save").onclick = save;
        el("test").onclick = function () {
          simulate("test");
        };
        el("preview").onclick = function () {
          simulate("preview");
        };
      })
      .catch(function (e) {
        toast(e.message);
      });
  }
  global.addEventListener("load", init);
})(window);
