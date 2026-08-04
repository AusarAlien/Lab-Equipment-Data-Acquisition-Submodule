(function (global) {
  "use strict";
  var S = global.SyssjcjConfigService,
    state = {
      rows: [],
      departments: [],
      devices: [],
      target: null,
      mode: "add",
    };
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
    }, 2000);
  }
  function opts(id, rows, key, text) {
    el(id).innerHTML = rows
      .map(function (x) {
        return (
          '<option value="' + esc(x[key]) + '">' + esc(x[text]) + "</option>"
        );
      })
      .join("");
  }
  function fill() {
    var x = state.target || {};
    [
      "departmentId",
      "deviceId",
      "sourceCode",
      "sourceName",
      "standardCode",
      "standardName",
      "unit",
      "status",
    ].forEach(function (id) {
      el(id).value = x[id] || (id === "status" ? "启用" : "");
    });
    if (state.mode === "view") {
      document.querySelectorAll("input,select").forEach(function (n) {
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
  function save() {
    var required = [
      "departmentId",
      "deviceId",
      "sourceCode",
      "sourceName",
      "standardCode",
      "standardName",
    ];
    if (
      required.some(function (id) {
        return !el(id).value.trim();
      })
    ) {
      toast("请完整填写必填项");
      return;
    }
    var duplicate = state.rows.some(function (x) {
      return (
        x.mappingId !== (state.target || {}).mappingId &&
        x.deviceId === el("deviceId").value &&
        x.sourceCode === el("sourceCode").value.trim() &&
        x.status === "启用"
      );
    });
    if (duplicate) {
      toast("该仪器项目已存在有效对照");
      return;
    }
    var x = state.target || { mappingId: "MAP-" + Date.now() };
    [
      "departmentId",
      "deviceId",
      "sourceCode",
      "sourceName",
      "standardCode",
      "standardName",
      "unit",
      "status",
    ].forEach(function (id) {
      x[id] = el(id).value.trim();
    });
    x.updateBy = "监*一";
    x.updateTime = "2026-08-04 16:40:00";
    if (!state.target) state.rows.unshift(x);
    S.saveMappings(state.rows).then(function () {
      state.target = x;
      notify();
      toast("项目对照已保存");
    });
  }
  function init() {
    if (typeof global.initGlobalParams === "function")
      global.initGlobalParams();
    state.mode = param("mode") || "add";
    Promise.all([S.loadMappings({}), S.loadDepartments(), S.loadDevices()])
      .then(function (v) {
        state.rows = v[0];
        state.departments = v[1];
        state.devices = v[2];
        state.target = find(state.rows, "mappingId", param("mappingId"));
        if (!state.target.mappingId) state.target = null;
        opts("departmentId", state.departments, "departmentId", "name");
        opts("deviceId", state.devices, "deviceId", "name");
        fill();
        el("save").onclick = save;
      })
      .catch(function (e) {
        toast(e.message);
      });
  }
  global.addEventListener("load", init);
})(window);
