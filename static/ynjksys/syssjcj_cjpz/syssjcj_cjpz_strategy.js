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
    el("trackMode").disabled = true;
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
  function pad(v) {
    return Number(v) < 10 ? "0" + Number(v) : String(v);
  }
  function dateText(date, compact) {
    var day =
        date.getFullYear() +
        pad(date.getMonth() + 1) +
        pad(date.getDate()),
      time = pad(date.getHours()) + pad(date.getMinutes()) + pad(date.getSeconds());
    return compact
      ? day + time
      : day.slice(0, 4) +
          "-" +
          day.slice(4, 6) +
          "-" +
          day.slice(6, 8) +
          " " +
          time.slice(0, 2) +
          ":" +
          time.slice(2, 4) +
          ":" +
          time.slice(4, 6);
  }
  function nextConfigVersion(current) {
    var match = /^v(\d+)/i.exec(String(current || "")),
      major = match ? Number(match[1]) + 1 : 1;
    return "v" + major + "_" + dateText(new Date(), true);
  }
  function isOperationalChange(before, after) {
    return [
      "departmentId",
      "deviceId",
      "clientId",
      "collectionMode",
      "status",
      "interfaceType",
      "filepath",
      "frequency",
      "service",
      "startrow",
      "sampcolflag",
      "trackMode",
      "heartbeatInterval",
    ].some(function (key) {
      return String(before[key] == null ? "" : before[key]) !==
        String(after[key] == null ? "" : after[key]);
    });
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
      "heartbeatInterval",
      "usbMode",
      "usbPollInterval",
      "comPort",
      "comBaudrate",
      "comBytesize",
      "comStopbits",
      "comParity",
      "comTimeout",
    ].forEach(function (id) {
      value(id, x[id]);
    });
    value("instno", d.instno);
    value("trackMode", "启用");
    dynamic();
    /* 当前阶段隐藏关联脚本展示，具备数据库、服务端执行及版本管理能力后恢复。
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
    */
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
      "usbMode",
      "comPort",
      "comParity",
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
    x.trackMode = "启用";
    x.updateTime = dateText(new Date(), false);
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
    var before = state.target,
      x = collect(),
      nameChanged = before.strategyName !== x.strategyName,
      configChanged = isOperationalChange(before, x),
      idx = state.strategies.findIndex(function (s) {
        return s.strategyId === x.strategyId;
      }),
      changes = [];
    if (!nameChanged && !configChanged) {
      toast("未检测到需要保存的修改");
      return;
    }
    x.version = configChanged ? nextConfigVersion(before.version) : before.version;
    if (nameChanged) {
      changes.push({
        field: "策略名称",
        before: before.strategyName,
        after: x.strategyName,
      });
    }
    if (configChanged) {
      changes.push({
        field: "策略版本",
        before: before.version,
        after: x.version,
      });
    }
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
          syncResult: configChanged ? "待同步" : "无需同步",
          changeSummary: configChanged
            ? nameChanged
              ? "修改策略名称及客户端运行配置"
              : "修改客户端运行配置"
            : "修改策略名称（不触发客户端同步）",
          changes: changes,
        });
        return S.saveStrategyLogs(logs);
      })
      .then(function () {
        state.target = x;
        fill();
        disabled(true);
        notify();
        toast(configChanged ? "采集策略已保存，等待客户端同步" : "策略名称已保存");
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
        "track_mode = 1",
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
        var visibleTabs = ["basic", "rule"];
        // visibleTabs.push("archive"); // 非 HTTP 客户端具备本地归档能力后恢复。
        // visibleTabs.push("script"); // 在线脚本功能具备实际通路后恢复。
        visibleTabs.forEach(function (x) {
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
    /* 当前阶段隐藏脚本调试入口，保留跳转代码供后续恢复。
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
    */
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
