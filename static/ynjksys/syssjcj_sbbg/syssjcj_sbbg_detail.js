(function (global) {
  "use strict";
  var mock = global.SyssjcjMockData;
  function el(id) {
    return document.getElementById(id);
  }
  function param(n) {
    return new URLSearchParams(global.location.search).get(n) || "";
  }
  function text(id, v) {
    var n = el(id),
      s = v == null || v === "" ? "--" : String(v);
    n.textContent = s;
    n.title = s;
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
  function init() {
    if (typeof global.initGlobalParams === "function")
      global.initGlobalParams();
    var t = mock.getTemplates().find(function (x) {
      return x.templateId === param("templateId");
    });
    if (!t) {
      el("page").classList.add("is-hidden");
      el("error").classList.remove("is-hidden");
      return;
    }
    var deps = mock.getDepartments(),
      devs = mock.getDevices(),
      records = mock.getRecords(),
      names = {
        "ENV-WATER-DRINKING": "生活饮用水",
        "ENV-WATER-SURFACE": "地表水",
        "ENV-WATER-GROUND": "地下水",
        "FOOD-GENERAL": "食品",
        "FOOD-BEVERAGE": "饮料",
        "FOOD-ADDITIVE": "食品添加剂",
        "BIO-SERUM": "血清",
        "BIO-PLASMA": "血浆",
        "BIO-WHOLE-BLOOD": "全血",
        "BIO-THROAT-SWAB": "咽拭子",
        "BIO-NASAL-SWAB": "鼻拭子",
        "BIO-SPUTUM": "痰液",
        "MICRO-VIRUS": "病毒样本",
      };
    text("name", t.name);
    text("fileName", t.fileName);
    text("version", t.version);
    text(
      "department",
      (
        deps.find(function (d) {
          return d.departmentId === t.departmentId;
        }) || {}
      ).name,
    );
    text(
      "devices",
      devs
        .filter(function (d) {
          return t.deviceIds && t.deviceIds.length
            ? t.deviceIds.indexOf(d.deviceId) >= 0
            : t.deviceTypes.indexOf(d.instno) >= 0;
        })
        .map(function (d) {
          return d.name;
        })
        .join("、"),
    );
    text(
      "categories",
      (t.sampleCategories || [])
        .map(function (c) {
          return names[c] || c;
        })
        .join("、"),
    );
    text("rule", t.mode === "样品模式" ? "按单一样品生成" : "按检测项目生成");
    text("status", t.status);
    text("sourceCount", (t.dataSources || []).length + " 个");
    text("updateTime", t.updateTime);
    text("updateUser", t.updateUser);
    text(
      "recordCount",
      records.filter(function (r) {
        return r.templateId === t.templateId;
      }).length + " 份",
    );
    text("description", t.description);
    el("rows").innerHTML = (t.dataSources || [])
      .sort(function (a, b) {
        return a.order - b.order;
      })
      .map(function (s) {
        return (
          "<tr><td>" +
          s.order +
          "</td><td>" +
          esc(s.field) +
          "</td><td>" +
          esc(s.displayName) +
          "</td><td>" +
          esc(s.sourceObject) +
          "</td><td>" +
          esc(s.dataType) +
          "</td><td>" +
          (s.required ? "是" : "否") +
          "</td><td>" +
          (s.visible ? "是" : "否") +
          '</td><td title="' +
          esc(s.format) +
          '">' +
          esc(s.format || "--") +
          "</td></tr>"
        );
      })
      .join("");
    el("download").onclick = function () {
      var toast = el("toast");
      toast.textContent = "已模拟下载 " + t.fileName;
      toast.classList.remove("is-hidden");
      setTimeout(function () {
        toast.classList.add("is-hidden");
      }, 1800);
    };
  }
  global.addEventListener("load", init);
})(window);
