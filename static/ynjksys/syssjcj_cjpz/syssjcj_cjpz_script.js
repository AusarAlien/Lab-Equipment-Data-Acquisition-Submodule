(function (global) {
  "use strict";
  var S = global.SyssjcjConfigService,
    state = { scripts: [], records: [], script: null };
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
  function render() {
    var s = state.script;
    el("scriptMeta").innerHTML = [
      ["脚本名称", s.scriptName],
      ["脚本类型", s.scriptType],
      ["脚本版本", s.version],
      ["脚本状态", s.status],
      ["修改人员", s.updateBy],
      ["修改时间", s.updateTime],
    ]
      .map(function (x) {
        return (
          '<div class="info-box"><span>' +
          esc(x[0]) +
          "</span><strong>" +
          esc(x[1]) +
          "</strong></div>"
        );
      })
      .join("");
    el("content").value = s.content;
    var rows = state.records
      .filter(function (x) {
        return x.scriptId === s.scriptId;
      })
      .sort(function (a, b) {
        return b.debugTime.localeCompare(a.debugTime);
      });
    el("debugRows").innerHTML =
      rows
        .map(function (x) {
          return (
            '<tr><td title="' +
            esc(x.debugTime) +
            '">' +
            esc(x.debugTime) +
            '</td><td title="' +
            esc(x.inputFile) +
            '">' +
            esc(x.inputFile) +
            "</td><td>" +
            esc(x.result) +
            "</td><td>" +
            esc(x.operator) +
            '</td><td title="' +
            esc(x.output) +
            '">' +
            esc(x.output) +
            "</td></tr>"
          );
        })
        .join("") ||
      '<tr><td colspan="5" style="text-align:center;color:#9098a5">暂无调试记录</td></tr>';
  }
  function save() {
    var content = el("content").value.trim();
    if (!content) {
      toast("脚本内容不能为空");
      return;
    }
    state.script.content = content;
    state.script.updateTime = "2026-08-04 16:30:00";
    state.script.version =
      "V" +
      (Number(String(state.script.version).replace(/^V/, "")) + 0.1).toFixed(1);
    S.saveScripts(state.scripts).then(function () {
      el("content").disabled = true;
      el("saveScript").classList.add("is-hidden");
      el("editScript").classList.remove("is-hidden");
      render();
      toast("脚本已保存");
    });
  }
  function run() {
    var file = el("inputFile").value.trim();
    if (!file) {
      toast("请选择或输入模拟文件");
      return;
    }
    el("mask").classList.remove("is-hidden");
    setTimeout(function () {
      var output =
          "脚本语法检查通过。\n输入文件：" +
          file +
          "\n调试参数：" +
          (el("debugParams").value || "无") +
          "\n模拟执行完成，未调用真实解析接口。",
        record = {
          debugId: "DEBUG-" + Date.now(),
          scriptId: state.script.scriptId,
          debugTime: "2026-08-04 16:32:00",
          operator: "监*一",
          inputFile: file,
          result: "成功",
          output: output.replace(/\n/g, " "),
        };
      state.records.unshift(record);
      S.saveDebugRecords(state.records).then(function () {
        el("mask").classList.add("is-hidden");
        el("debugResult").textContent = output;
        render();
        toast("脚本调试完成");
      });
    }, 900);
  }
  function init() {
    if (typeof global.initGlobalParams === "function")
      global.initGlobalParams();
    Promise.all([S.loadScripts({}), S.loadDebugRecords()])
      .then(function (v) {
        state.scripts = v[0];
        state.records = v[1];
        state.script = find(state.scripts, "scriptId", param("scriptId"));
        if (!state.script.scriptId) throw new Error("未找到关联脚本");
        render();
        el("editScript").onclick = function () {
          el("content").disabled = false;
          el("editScript").classList.add("is-hidden");
          el("saveScript").classList.remove("is-hidden");
        };
        el("saveScript").onclick = save;
        el("runDebug").onclick = run;
      })
      .catch(function (e) {
        toast(e.message);
      });
  }
  global.addEventListener("load", init);
})(window);
