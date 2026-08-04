(function (global) {
  "use strict";
  var CONFIG = { pageSize: 10, offlineSeconds: 180 };
  var service = global.SyssjcjLogService;
  var state = {
    tab: "client",
    departments: [],
    devices: [],
    clients: [],
    clientLogs: [],
    strategyLogs: [],
    filteredClientLogs: [],
    filteredStrategyLogs: [],
    clientPage: 1,
    strategyPage: 1,
    chart: null,
  };
  function el(id) {
    return document.getElementById(id);
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
  function find(list, key, value) {
    return (
      list.find(function (item) {
        return item[key] === value;
      }) || {}
    );
  }
  function device(id) {
    return find(state.devices, "deviceId", id);
  }
  function client(id) {
    return find(state.clients, "clientId", id);
  }
  function departmentByDevice(deviceId) {
    var depId = device(deviceId).departmentId;
    return find(state.departments, "departmentId", depId);
  }
  function labName(item) {
    return departmentByDevice(item.deviceId).name || "--";
  }
  function deviceName(id) {
    return device(id).name || "--";
  }
  function clientTypeName(value) {
    return value === "go"
      ? "Go"
      : value === "python"
        ? "Python"
        : value || "--";
  }
  function dateValue(value) {
    return String(value || "").slice(0, 10);
  }
  function timeValue(value) {
    return new Date(String(value || "").replace(/-/g, "/")).getTime();
  }
  function statusOf(item) {
    var elapsed =
      (timeValue(service.getReferenceTime()) - timeValue(item.lastHeartbeat)) /
      1000;
    if (elapsed > CONFIG.offlineSeconds) return "离线";
    if (item.reportedStatus === "stopped") return "已停止";
    if (item.reportedStatus === "error") return "异常";
    return "在线";
  }
  function tag(text, kind) {
    return '<span class="tag tag-' + kind + '">' + esc(text) + "</span>";
  }
  function resultTag(value) {
    return tag(
      value,
      value === "成功" ? "success" : value === "失败" ? "error" : "info",
    );
  }
  function levelTag(value) {
    var text = { INFO: "信息", WARN: "警告", ERROR: "错误" }[value] || value;
    return tag(
      text,
      value === "ERROR" ? "error" : value === "WARN" ? "warn" : "info",
    );
  }
  function syncTag(value) {
    return tag(
      value,
      value === "同步成功"
        ? "success"
        : value === "同步失败"
          ? "error"
          : "muted",
    );
  }
  function option(value, text) {
    return (
      '<option value="' +
      esc(value) +
      '" title="' +
      esc(text) +
      '">' +
      esc(text) +
      "</option>"
    );
  }
  function setOptions(id, firstText, rows) {
    var node = el(id),
      current = node.value;
    node.innerHTML = option("", firstText) + rows.join("");
    if (
      Array.prototype.some.call(node.options, function (o) {
        return o.value === current;
      })
    )
      node.value = current;
  }
  function populateBaseOptions() {
    var depOptions = state.departments.map(function (d) {
      return option(d.departmentId, d.name);
    });
    setOptions("clientDepartment", "全部实验室", depOptions);
    setOptions("strategyDepartment", "全部实验室", depOptions);
    refreshDependentOptions("client");
    refreshDependentOptions("strategy");
    var types = Array.from(
      new Set(
        state.clientLogs.map(function (item) {
          return item.logType;
        }),
      ),
    ).sort();
    setOptions(
      "clientLogType",
      "全部类型",
      types.map(function (v) {
        return option(v, v);
      }),
    );
  }
  function refreshDependentOptions(tab) {
    var prefix = tab === "client" ? "client" : "strategy";
    var depId = el(prefix + "Department").value;
    var deviceId = el(prefix + "Device").value;
    var devices = state.devices.filter(function (d) {
      return !depId || d.departmentId === depId;
    });
    if (
      deviceId &&
      !devices.some(function (d) {
        return d.deviceId === deviceId;
      })
    )
      deviceId = "";
    setOptions(
      prefix + "Device",
      "全部设备",
      devices.map(function (d) {
        return option(d.deviceId, d.name + " / " + d.model);
      }),
    );
    el(prefix + "Device").value = deviceId;
    var clients = state.clients.filter(function (c) {
      var d = device(c.deviceId);
      return (
        (!depId || d.departmentId === depId) &&
        (!deviceId || c.deviceId === deviceId)
      );
    });
    setOptions(
      tab === "client" ? "clientSelect" : "strategyClient",
      "全部客户端",
      clients.map(function (c) {
        return option(c.clientId, c.clientId);
      }),
    );
  }
  function setDefaultDates() {
    ["clientStart", "strategyStart"].forEach(function (id) {
      el(id).value = "2026-08-01";
    });
    ["clientEnd", "strategyEnd"].forEach(function (id) {
      el(id).value = "2026-08-04";
    });
  }
  function validateRange(start, end) {
    if (start && end && start > end) {
      toast("开始日期不能晚于结束日期");
      return false;
    }
    return true;
  }
  function clientFilters() {
    return {
      start: el("clientStart").value,
      end: el("clientEnd").value,
      departmentId: el("clientDepartment").value,
      deviceId: el("clientDevice").value,
      clientId: el("clientSelect").value,
      logType: el("clientLogType").value,
      level: el("clientLevel").value,
      result: el("clientResult").value,
    };
  }
  function strategyFilters() {
    return {
      start: el("strategyStart").value,
      end: el("strategyEnd").value,
      departmentId: el("strategyDepartment").value,
      deviceId: el("strategyDevice").value,
      clientId: el("strategyClient").value,
      operationType: el("operationType").value,
      syncResult: el("syncResult").value,
      operator: el("operator").value.trim().toLowerCase(),
    };
  }
  function queryClient() {
    var f = clientFilters();
    if (!validateRange(f.start, f.end)) return;
    state.filteredClientLogs = state.clientLogs
      .filter(function (item) {
        var d = device(item.deviceId),
          day = dateValue(item.eventTime);
        return (
          (!f.start || day >= f.start) &&
          (!f.end || day <= f.end) &&
          (!f.departmentId || d.departmentId === f.departmentId) &&
          (!f.deviceId || item.deviceId === f.deviceId) &&
          (!f.clientId || item.clientId === f.clientId) &&
          (!f.logType || item.logType === f.logType) &&
          (!f.level || item.level === f.level) &&
          (!f.result || item.result === f.result)
        );
      })
      .sort(function (a, b) {
        return b.eventTime.localeCompare(a.eventTime);
      });
    state.clientPage = 1;
    renderClient();
    renderMetrics();
    // renderChart(); // 趋势模块暂不展示，后续启用时恢复。
  }
  function queryStrategy() {
    var f = strategyFilters();
    if (!validateRange(f.start, f.end)) return;
    state.filteredStrategyLogs = state.strategyLogs
      .filter(function (item) {
        var d = device(item.deviceId),
          day = dateValue(item.operationTime);
        return (
          (!f.start || day >= f.start) &&
          (!f.end || day <= f.end) &&
          (!f.departmentId || d.departmentId === f.departmentId) &&
          (!f.deviceId || item.deviceId === f.deviceId) &&
          (!f.clientId || item.clientId === f.clientId) &&
          (!f.operationType || item.operationType === f.operationType) &&
          (!f.syncResult || item.syncResult === f.syncResult) &&
          (!f.operator ||
            String(item.operator).toLowerCase().indexOf(f.operator) >= 0)
        );
      })
      .sort(function (a, b) {
        return b.operationTime.localeCompare(a.operationTime);
      });
    state.strategyPage = 1;
    renderStrategy();
    renderMetrics();
    // renderChart(); // 趋势模块暂不展示，后续启用时恢复。
  }
  function current(list, page) {
    return list.slice((page - 1) * CONFIG.pageSize, page * CONFIG.pageSize);
  }
  function renderClient() {
    el("clientRows").innerHTML = current(
      state.filteredClientLogs,
      state.clientPage,
    )
      .map(function (item, index) {
        var c = client(item.clientId),
          d = device(item.deviceId);
        return (
          '<tr><td><button class="action" data-client-log="' +
          esc(item.logId) +
          '">查看</button></td><td>' +
          ((state.clientPage - 1) * CONFIG.pageSize + index + 1) +
          '</td><td title="' +
          esc(item.eventTime) +
          '">' +
          esc(item.eventTime) +
          '</td><td title="' +
          esc(labName(item)) +
          '">' +
          esc(labName(item)) +
          '</td><td title="' +
          esc(d.name) +
          '">' +
          esc(d.name) +
          '</td><td title="' +
          esc(item.clientId) +
          '">' +
          esc(item.clientId) +
          "</td><td>" +
          esc(clientTypeName(c.clientType)) +
          "</td><td>" +
          esc(item.logType) +
          "</td><td>" +
          levelTag(item.level) +
          "</td><td>" +
          resultTag(item.result) +
          '</td><td title="' +
          esc(item.fileName || "--") +
          '">' +
          esc(item.fileName || "--") +
          '</td><td title="' +
          esc(item.message) +
          '">' +
          esc(item.message) +
          "</td></tr>"
        );
      })
      .join("");
    el("clientEmpty").classList.toggle(
      "is-hidden",
      state.filteredClientLogs.length !== 0,
    );
    el("clientSummary").textContent =
      "（当前查询 " + state.filteredClientLogs.length + " 条）";
    renderPagination(
      "client",
      state.filteredClientLogs.length,
      state.clientPage,
    );
  }
  function renderStrategy() {
    el("strategyRows").innerHTML = current(
      state.filteredStrategyLogs,
      state.strategyPage,
    )
      .map(function (item, index) {
        var d = device(item.deviceId);
        return (
          '<tr><td><button class="action" data-strategy-log="' +
          esc(item.auditId) +
          '">查看</button></td><td>' +
          ((state.strategyPage - 1) * CONFIG.pageSize + index + 1) +
          '</td><td title="' +
          esc(item.operationTime) +
          '">' +
          esc(item.operationTime) +
          '</td><td title="' +
          esc(labName(item)) +
          '">' +
          esc(labName(item)) +
          '</td><td title="' +
          esc(d.name) +
          '">' +
          esc(d.name) +
          '</td><td title="' +
          esc(item.clientId) +
          '">' +
          esc(item.clientId) +
          '</td><td title="' +
          esc(item.strategyName) +
          '">' +
          esc(item.strategyName) +
          "</td><td>" +
          tag(
            item.operationType,
            item.operationType === "删除" || item.operationType === "停用"
              ? "warn"
              : "info",
          ) +
          '</td><td title="' +
          esc(item.changeSummary) +
          '">' +
          esc(item.changeSummary) +
          "</td><td>" +
          esc(item.operator) +
          "</td><td>" +
          syncTag(item.syncResult) +
          "</td></tr>"
        );
      })
      .join("");
    el("strategyEmpty").classList.toggle(
      "is-hidden",
      state.filteredStrategyLogs.length !== 0,
    );
    el("strategySummary").textContent =
      "（当前查询 " + state.filteredStrategyLogs.length + " 条）";
    renderPagination(
      "strategy",
      state.filteredStrategyLogs.length,
      state.strategyPage,
    );
  }
  function renderPagination(prefix, total, page) {
    var pages = Math.ceil(total / CONFIG.pageSize),
      node = el(prefix + "Pages");
    node.innerHTML = Array.from({ length: pages }, function (_, i) {
      return (
        '<button class="page-number' +
        (page === i + 1 ? " is-current" : "") +
        '" data-page="' +
        (i + 1) +
        '">' +
        (i + 1) +
        "</button>"
      );
    }).join("");
    el(prefix + "Previous").disabled = page <= 1;
    el(prefix + "Next").disabled = !pages || page >= pages;
    el(prefix + "PageSummary").textContent = "共 " + pages + " 页，10 条";
  }
  function scopedClients() {
    var f = state.tab === "client" ? clientFilters() : strategyFilters();
    return state.clients.filter(function (c) {
      var d = device(c.deviceId);
      return (
        (!f.departmentId || d.departmentId === f.departmentId) &&
        (!f.deviceId || c.deviceId === f.deviceId) &&
        (!f.clientId || c.clientId === f.clientId)
      );
    });
  }
  function setMetric(index, label, value, unit) {
    el("metricLabel" + index).textContent = label;
    el("metricValue" + index).textContent = value;
    el("metricUnit" + index).textContent = unit;
  }
  function renderMetrics() {
    if (state.tab === "client") {
      var clients = scopedClients(),
        logs = state.filteredClientLogs;
      setMetric(1, "客户端数量", clients.length, "个");
      setMetric(
        2,
        "在线客户端",
        clients.filter(function (c) {
          return statusOf(c) === "在线";
        }).length,
        "个",
      );
      setMetric(
        3,
        "上传成功",
        logs.filter(function (l) {
          return l.logType === "文件上传" && l.result === "成功";
        }).length,
        "次",
      );
      setMetric(
        4,
        "上传失败",
        logs.filter(function (l) {
          return l.logType === "文件上传" && l.result === "失败";
        }).length,
        "次",
      );
    } else {
      var rows = state.filteredStrategyLogs;
      setMetric(1, "维护总数", rows.length, "次");
      setMetric(
        2,
        "新增策略",
        rows.filter(function (x) {
          return x.operationType === "新增";
        }).length,
        "次",
      );
      setMetric(
        3,
        "修改策略",
        rows.filter(function (x) {
          return x.operationType === "修改";
        }).length,
        "次",
      );
      setMetric(
        4,
        "启用/停用",
        rows.filter(function (x) {
          return x.operationType === "启用" || x.operationType === "停用";
        }).length,
        "次",
      );
    }
  }
  // 趋势统计实现暂时保留，当前页面不调用。
  function dailySeries(rows, timeField, categoryField, categories) {
    var map = {};
    rows.forEach(function (item) {
      var day = dateValue(item[timeField]);
      if (!map[day]) map[day] = {};
      map[day][item[categoryField]] = (map[day][item[categoryField]] || 0) + 1;
    });
    var dates = Object.keys(map).sort();
    return {
      dates: dates,
      series: categories.map(function (category) {
        return {
          name: category.name,
          type: "line",
          smooth: true,
          symbolSize: 7,
          data: dates.map(function (day) {
            return map[day][category.value] || 0;
          }),
          lineStyle: { width: 3, color: category.color },
          itemStyle: { color: category.color },
          areaStyle: { opacity: 0.06, color: category.color },
        };
      }),
    };
  }
  function renderChart() {
    var result, title;
    if (state.tab === "client") {
      title = "客户端消息趋势";
      result = dailySeries(state.filteredClientLogs, "eventTime", "result", [
        { name: "成功", value: "成功", color: "#18a884" },
        { name: "失败", value: "失败", color: "#ef5350" },
        { name: "提示", value: "提示", color: "#3478f6" },
      ]);
    } else {
      title = "采集策略维护趋势";
      result = dailySeries(
        state.filteredStrategyLogs,
        "operationTime",
        "operationType",
        [
          { name: "新增", value: "新增", color: "#18a884" },
          { name: "修改", value: "修改", color: "#3478f6" },
          { name: "启用/停用", value: "__switch__", color: "#f29938" },
        ],
      );
      var switchSeries = result.series[2];
      var maps = {};
      state.filteredStrategyLogs.forEach(function (item) {
        if (item.operationType === "启用" || item.operationType === "停用") {
          var day = dateValue(item.operationTime);
          maps[day] = (maps[day] || 0) + 1;
        }
      });
      switchSeries.data = result.dates.map(function (day) {
        return maps[day] || 0;
      });
    }
    el("chartTitle").textContent = title;
    el("chartEmpty").classList.toggle("is-hidden", result.dates.length !== 0);
    el("trendChart").classList.toggle("is-hidden", result.dates.length === 0);
    if (!global.echarts || !result.dates.length) return;
    if (!state.chart) state.chart = global.echarts.init(el("trendChart"));
    state.chart.setOption(
      {
        animationDuration: 350,
        tooltip: { trigger: "axis" },
        legend: { right: 28, top: 18 },
        grid: { left: 55, right: 35, top: 62, bottom: 42 },
        xAxis: {
          type: "category",
          boundaryGap: false,
          data: result.dates,
          axisLine: { lineStyle: { color: "#cfd7e3" } },
        },
        yAxis: {
          type: "value",
          minInterval: 1,
          splitLine: { lineStyle: { type: "dashed", color: "#e8edf4" } },
        },
        series: result.series,
      },
      true,
    );
  }
  function openModal(hf, idName, id, title) {
    if (
      !global.isloadpage ||
      typeof global.isloadpage.openModal !== "function"
    ) {
      toast("页面加载组件未就绪");
      return;
    }
    var params = service.commonParams();
    params[idName] = id;
    global.isloadpage.openModal({
      hp: params.hp,
      hf: hf,
      params: params,
      title: title,
      width: 1500,
      height: 900,
    });
  }
  function toast(message) {
    var node = el("toast");
    node.textContent = message;
    node.classList.remove("is-hidden");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () {
      node.classList.add("is-hidden");
    }, 2000);
  }
  function switchTab(tab) {
    state.tab = tab;
    document.querySelectorAll(".page-tab").forEach(function (node) {
      node.classList.toggle("is-active", node.dataset.tab === tab);
    });
    el("clientQuery").classList.toggle("is-hidden", tab !== "client");
    el("strategyQuery").classList.toggle("is-hidden", tab !== "strategy");
    el("clientListPanel").classList.toggle("is-hidden", tab !== "client");
    el("strategyListPanel").classList.toggle("is-hidden", tab !== "strategy");
    renderMetrics();
    // renderChart(); // 趋势模块暂不展示，后续启用时恢复。
  }
  function resetClient() {
    [
      "clientDepartment",
      "clientDevice",
      "clientSelect",
      "clientLogType",
      "clientLevel",
      "clientResult",
    ].forEach(function (id) {
      el(id).value = "";
    });
    el("clientStart").value = "2026-08-01";
    el("clientEnd").value = "2026-08-04";
    refreshDependentOptions("client");
    queryClient();
  }
  function resetStrategy() {
    [
      "strategyDepartment",
      "strategyDevice",
      "strategyClient",
      "operationType",
      "syncResult",
      "operator",
    ].forEach(function (id) {
      el(id).value = "";
    });
    el("strategyStart").value = "2026-08-01";
    el("strategyEnd").value = "2026-08-04";
    refreshDependentOptions("strategy");
    queryStrategy();
  }
  function bindPagination(prefix) {
    el(prefix + "Previous").onclick = function () {
      var key = prefix + "Page";
      if (state[key] > 1) {
        state[key]--;
        prefix === "client" ? renderClient() : renderStrategy();
      }
    };
    el(prefix + "Next").onclick = function () {
      var list =
          prefix === "client"
            ? state.filteredClientLogs
            : state.filteredStrategyLogs,
        key = prefix + "Page",
        pages = Math.ceil(list.length / CONFIG.pageSize);
      if (state[key] < pages) {
        state[key]++;
        prefix === "client" ? renderClient() : renderStrategy();
      }
    };
    el(prefix + "Pages").onclick = function (event) {
      var value = Number(event.target.dataset.page);
      if (!value) return;
      state[prefix + "Page"] = value;
      prefix === "client" ? renderClient() : renderStrategy();
    };
    el(prefix + "Jump").onchange = function () {
      var list =
          prefix === "client"
            ? state.filteredClientLogs
            : state.filteredStrategyLogs,
        pages = Math.ceil(list.length / CONFIG.pageSize),
        value = Number(this.value);
      if (value >= 1 && value <= pages) {
        state[prefix + "Page"] = value;
        prefix === "client" ? renderClient() : renderStrategy();
      }
      this.value = "";
    };
  }
  function bind() {
    document.querySelectorAll(".page-tab").forEach(function (node) {
      node.onclick = function () {
        switchTab(node.dataset.tab);
      };
    });
    el("clientDepartment").onchange = function () {
      refreshDependentOptions("client");
    };
    el("clientDevice").onchange = function () {
      refreshDependentOptions("client");
    };
    el("strategyDepartment").onchange = function () {
      refreshDependentOptions("strategy");
    };
    el("strategyDevice").onchange = function () {
      refreshDependentOptions("strategy");
    };
    el("clientQueryButton").onclick = queryClient;
    el("clientResetButton").onclick = resetClient;
    el("strategyQueryButton").onclick = queryStrategy;
    el("strategyResetButton").onclick = resetStrategy;
    el("clientRows").onclick = function (event) {
      var id = event.target.dataset.clientLog;
      if (id)
        openModal(
          "syssjcj_sjrq_client_detail",
          "logId",
          id,
          "客户端消息日志详情",
        );
    };
    el("strategyRows").onclick = function (event) {
      var id = event.target.dataset.strategyLog;
      if (id)
        openModal(
          "syssjcj_sjrq_strategy_detail",
          "auditId",
          id,
          "采集策略维护日志详情",
        );
    };
    bindPagination("client");
    bindPagination("strategy");
  }
  function init() {
    if (typeof global.initGlobalParams === "function")
      global.initGlobalParams();
    Promise.all([
      service.loadDepartments(),
      service.loadDevices(),
      service.loadClients({}),
      service.loadClientLogs({}),
      service.loadStrategyLogs({}),
    ])
      .then(function (values) {
        state.departments = values[0];
        state.devices = values[1];
        state.clients = values[2];
        state.clientLogs = values[3];
        state.strategyLogs = values[4];
        populateBaseOptions();
        setDefaultDates();
        bind();
        queryClient();
        queryStrategy();
        switchTab("client");
      })
      .catch(function (error) {
        toast(error.message || "日志数据加载失败");
      });
  }
  // 趋势模块恢复后同时恢复窗口缩放处理。
  // global.addEventListener("resize", function () {
  //   if (state.chart) state.chart.resize();
  // });
  global.addEventListener("load", init);
})(window);
