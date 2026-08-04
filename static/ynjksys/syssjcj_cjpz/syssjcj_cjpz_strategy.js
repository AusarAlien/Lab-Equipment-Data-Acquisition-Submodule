(function (global) {
  "use strict";
  var S = global.SyssjcjConfigService,
    state = {
      strategies: [],
      scripts: [],
      departments: [],
      devices: [],
      clients: [],
      target: null,
      editing: false,
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
    }, 2200);
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
  function value(id, v) {
    el(id).value = v == null ? "" : v;
  }
  function disabled(flag) {
    document.querySelectorAll("input,select").forEach(function (n) {
      n.disabled = flag;
    });
    ["strategyId", "instno", "version", "owner"].forEach(function (id) {
      el(id).disabled = true;
    });
    el("edit").classList.toggle("is-hidden", !flag);
    el("save").classList.toggle("is-hidden", flag);
    el("cancelEdit").classList.toggle("is-hidden", flag);
    state.editing = !flag;
  }
  function dynamic() {
    var mode = el("collectionMode").value;
    el("usbFields").classList.toggle("is-hidden", mode !== "USB存储采集");
    el("serialFields").classList.toggle("is-hidden", mode !== "串口采集");
  }
  function fill() {
    var x = state.target,
      d = find(state.devices, "deviceId", x.deviceId),
      s = find(state.scripts, "scriptId", x.scriptId);
    [
      "strategyName",
      "strategyId",
      "departmentId",
      "deviceId",
      "clientId",
      "collectionMode",
      "status",
      "version",
      "owner",
      "interfaceType",
      "filepath",
      "frequency",
      "service",
      "startrow",
      "sampcolflag",
      "trackMode",
      "heartbeatInterval",
      "usbMode",
      "usbPollInterval",
      "comPort",
      "comBaudrate",
      "comBytesize",
      "comStopbits",
      "comParity",
      "comTimeout",
      "archiveMode",
      "dataMode",
      "outputDir",
      "filenameTemplate",
    ].forEach(function (id) {
      value(id, x[id]);
    });
    value("instno", d.instno);
    dynamic();
    el("scriptInfo").innerHTML = s.scriptId
      ? [
          "脚本名称|" + s.scriptName,
          "脚本类型|" + s.scriptType,
          "脚本版本|" + s.version,
          "脚本状态|" + s.status,
        ]
          .map(function (v) {
            var p = v.split("|");
            return (
              '<div class="info-box"><span>' +
              esc(p[0]) +
              "</span><strong>" +
              esc(p[1]) +
              "</strong></div>"
            );
          })
          .join("")
      : '<div class="info-box"><span>关联状态</span><strong>当前策略未关联脚本</strong></div>';
    el("openScript").disabled = !s.scriptId;
    disabled(param("mode") !== "edit");
  }
  function collect() {
    var x = JSON.parse(JSON.stringify(state.target));
    [
      "strategyName",
      "departmentId",
      "deviceId",
      "clientId",
      "collectionMode",
      "status",
      "interfaceType",
      "filepath",
      "service",
      "sampcolflag",
      "trackMode",
      "usbMode",
      "comPort",
      "comParity",
      "archiveMode",
      "dataMode",
      "outputDir",
      "filenameTemplate",
    ].forEach(function (id) {
      x[id] = el(id).value.trim();
    });
    [
      "frequency",
      "startrow",
      "heartbeatInterval",
      "usbPollInterval",
      "comBaudrate",
      "comBytesize",
      "comStopbits",
      "comTimeout",
    ].forEach(function (id) {
      x[id] = Number(el(id).value) || 0;
    });
    x.updateTime = "2026-08-04 16:20:00";
    x.version =
      "V" + (Number(String(x.version).replace(/^V/, "")) + 0.1).toFixed(1);
    return x;
  }
  function notify() {
    try {
      if (global.parent && global.parent.SyssjcjConfigPage)
        global.parent.SyssjcjConfigPage.refresh();
    } catch (e) {}
  }
  function save() {
    if (
      !el("strategyName").value.trim() ||
      !el("deviceId").value ||
      !el("clientId").value
    ) {
      toast("请填写策略名称、设备和客户端");
      return;
    }
    var x = collect(),
      idx = state.strategies.findIndex(function (s) {
        return s.strategyId === x.strategyId;
      });
    state.strategies[idx] = x;
    S.saveStrategies(state.strategies)
      .then(function () {
        return S.loadStrategyLogs();
      })
      .then(function (logs) {
        logs.unshift({
          auditId: "AUD-" + Date.now(),
          strategyId: x.strategyId,
          strategyName: x.strategyName,
          clientId: x.clientId,
          deviceId: x.deviceId,
          operationType: "修改",
          operationTime: x.updateTime,
          operator: x.owner,
          operationSource: "采集配置管理",
          syncResult: "待同步",
          changeSummary: "修改采集策略规则",
          changes: [
            {
              field: "策略版本",
              before: state.target.version,
              after: x.version,
            },
          ],
        });
        return S.saveStrategyLogs(logs);
      })
      .then(function () {
        state.target = x;
        fill();
        disabled(true);
        notify();
        toast("采集策略已保存");
      });
  }
  function download() {
    var x = state.target,
      c = find(state.clients, "clientId", x.clientId),
      d = find(state.devices, "deviceId", x.deviceId),
      lines = [
        "[interface]",
        "type = " + x.interfaceType,
        "instno = " + d.instno,
        "filepath = " + x.filepath,
        "frequency = " + x.frequency,
        "service = " + x.service,
        "startrow = " + x.startrow,
        "sampcolflag = " + x.sampcolflag,
        "track_mode = " + (x.trackMode === "启用" ? 1 : 0),
        "client_id = " + x.clientId,
        "client_type = " + c.clientType,
        "client_ver = " + c.clientVersion,
        "lab_id = " + x.departmentId,
        "heartbeat_interval = " + x.heartbeatInterval,
      ],
      blob = new Blob(["\ufeff" + lines.join("\r\n")], {
        type: "text/plain;charset=utf-8",
      }),
      a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = x.strategyId + "_config.ini";
    a.click();
    toast("配置文件已生成");
  }
  function bind() {
    document.querySelectorAll(".subtab").forEach(function (n) {
      n.onclick = function () {
        document.querySelectorAll(".subtab").forEach(function (x) {
          x.classList.toggle("is-active", x === n);
        });
        ["basic", "rule", "archive", "script"].forEach(function (x) {
          el(x + "Panel").classList.toggle("is-hidden", x !== n.dataset.tab);
        });
      };
    });
    el("collectionMode").onchange = dynamic;
    el("deviceId").onchange = function () {
      value("instno", find(state.devices, "deviceId", this.value).instno);
    };
    el("edit").onclick = function () {
      disabled(false);
    };
    el("cancelEdit").onclick = function () {
      fill();
      disabled(true);
    };
    el("save").onclick = save;
    el("download").onclick = download;
    el("openScript").onclick = function () {
      var s = find(state.scripts, "scriptId", state.target.scriptId);
      if (!s.scriptId) return;
      if (global.isloadpage)
        global.isloadpage.openModal({
          hp: "ynjksys",
          hf: "syssjcj_cjpz_script",
          params: {
            sessionId: global.SESSIONID || "",
            dbnm: global.DBNM || "ynjk",
            hp: "ynjksys",
            strategyId: state.target.strategyId,
            scriptId: s.scriptId,
          },
          title: "脚本调试",
          width: 1350,
          height: 860,
        });
    };
  }
  function init() {
    if (typeof global.initGlobalParams === "function")
      global.initGlobalParams();
    Promise.all([
      S.loadStrategies({}),
      S.loadScripts({}),
      S.loadDepartments(),
      S.loadDevices(),
      S.loadClients(),
    ])
      .then(function (v) {
        state.strategies = v[0];
        state.scripts = v[1];
        state.departments = v[2];
        state.devices = v[3];
        state.clients = v[4];
        state.target = find(
          state.strategies,
          "strategyId",
          param("strategyId"),
        );
        if (!state.target.strategyId) throw new Error("未找到采集策略");
        opts("departmentId", state.departments, "departmentId", "name");
        opts("deviceId", state.devices, "deviceId", "name");
        opts("clientId", state.clients, "clientId", "clientId");
        bind();
        fill();
      })
      .catch(function (e) {
        toast(e.message);
      });
  }
  global.addEventListener("load", init);
})(window);
