(function (global) {
  "use strict";
  var service = global.SyssjcjLogService;
  var mock = global.SyssjcjMockData;
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
  function timeValue(value) {
    return new Date(String(value || "").replace(/-/g, "/")).getTime();
  }
  function clientStatus(item) {
    if (
      (timeValue(service.getReferenceTime()) - timeValue(item.lastHeartbeat)) /
        1000 >
      180
    )
      return "离线";
    if (item.reportedStatus === "stopped") return "已停止";
    if (item.reportedStatus === "error") return "异常";
    return "在线";
  }
  function statusClass(value) {
    return value === "在线" || value === "成功"
      ? "tag-success"
      : value === "离线" || value === "失败" || value === "异常"
        ? "tag-error"
        : value === "已停止"
          ? "tag-warn"
          : "tag-info";
  }
  function setTag(id, value, kind) {
    var node = el(id);
    node.textContent = value;
    node.title = value;
    node.className = "tag " + (kind || statusClass(value));
  }
  function formatSize(value) {
    var n = Number(value) || 0;
    if (!n) return "--";
    return n >= 1048576
      ? (n / 1048576).toFixed(2) + " MB"
      : (n / 1024).toFixed(1) + " KB";
  }
  function modeName(value) {
    return (
      {
        http: "文件夹监听",
        usb_storage: "USB存储采集",
        usb_serial: "USB串口采集",
        usb_auto: "自动识别采集",
      }[value] ||
      value ||
      "--"
    );
  }
  function toast(message) {
    var node = el("toast");
    node.textContent = message;
    node.classList.remove("is-hidden");
    setTimeout(function () {
      node.classList.add("is-hidden");
    }, 1800);
  }
  function openFile(fdiseq) {
    if (
      !global.isloadpage ||
      typeof global.isloadpage.openModal !== "function"
    ) {
      toast("页面加载组件未就绪");
      return;
    }
    var params = service.commonParams();
    params.fdiseq = fdiseq;
    params.sourcePage = "syssjcj_sjrq_client_detail";
    global.isloadpage.openModal({
      hp: params.hp,
      hf: "syssjcj_cjwd_detail",
      params: params,
      title: "采集文件详情",
      width: 1450,
      height: 900,
    });
  }
  function renderChart(rows) {
    if (!rows.length || !global.echarts) {
      el("heartbeatChart").classList.add("is-hidden");
      el("heartbeatEmpty").classList.remove("is-hidden");
      return;
    }
    var chart = global.echarts.init(el("heartbeatChart"));
    chart.setOption({
      tooltip: {
        trigger: "axis",
        formatter: function (items) {
          var index = items[0].dataIndex,
            row = rows[index];
          return (
            row[1] +
            "<br>运行状态：" +
            ({ running: "运行中", stopped: "已停止", error: "异常" }[row[2]] ||
              row[2]) +
            "<br>上传成功：" +
            row[3] +
            " 次<br>上传失败：" +
            row[4] +
            " 次"
          );
        },
      },
      legend: { right: 28, top: 18 },
      grid: { left: 58, right: 36, top: 62, bottom: 44 },
      xAxis: {
        type: "category",
        data: rows.map(function (r) {
          return r[1].slice(11, 16);
        }),
        axisLine: { lineStyle: { color: "#cfd7e3" } },
      },
      yAxis: {
        type: "value",
        minInterval: 1,
        splitLine: { lineStyle: { type: "dashed", color: "#e8edf4" } },
      },
      series: [
        {
          name: "累计上传成功",
          type: "line",
          smooth: true,
          data: rows.map(function (r) {
            return r[3];
          }),
          lineStyle: { width: 3, color: "#18a884" },
          itemStyle: { color: "#18a884" },
        },
        {
          name: "累计上传失败",
          type: "line",
          smooth: true,
          data: rows.map(function (r) {
            return r[4];
          }),
          lineStyle: { width: 3, color: "#ef5350" },
          itemStyle: { color: "#ef5350" },
        },
      ],
    });
    global.addEventListener("resize", function () {
      chart.resize();
    });
  }
  function init() {
    if (typeof global.initGlobalParams === "function")
      global.initGlobalParams();
    var logId = param("logId");
    Promise.all([
      service.loadClientLogDetail(logId),
      service.loadClients({}),
      service.loadDevices({}),
      service.loadDepartments(),
      service.loadHeartbeats({}),
    ])
      .then(function (values) {
        var log = values[0],
          clients = values[1],
          devices = values[2],
          departments = values[3],
          heartbeats = values[4];
        if (!log) {
          el("page").classList.add("is-hidden");
          el("error").classList.remove("is-hidden");
          return;
        }
        var client =
          clients.find(function (x) {
            return x.clientId === log.clientId;
          }) || {};
        var device =
          devices.find(function (x) {
            return x.deviceId === log.deviceId;
          }) || {};
        var department =
          departments.find(function (x) {
            return x.departmentId === device.departmentId;
          }) || {};
        setText("logId", log.logId);
        setText("eventTime", log.eventTime);
        setText("receiveTime", log.receiveTime);
        setText("logType", log.logType);
        setTag(
          "level",
          { INFO: "信息", WARN: "警告", ERROR: "错误" }[log.level] || log.level,
          log.level === "ERROR"
            ? "tag-error"
            : log.level === "WARN"
              ? "tag-warn"
              : "tag-info",
        );
        setTag("result", log.result);
        setText("message", log.message);
        setText("detail", log.detail);
        setText("department", department.name);
        setText("deviceName", device.name);
        setText(
          "deviceModel",
          (device.brand || "") + " " + (device.model || ""),
        );
        setText("instno", device.instno);
        setText("clientId", client.clientId);
        setText("clientType", client.clientType === "go" ? "Go" : "Python");
        setText("clientVersion", client.clientVersion);
        setTag("clientStatus", clientStatus(client));
        setText("runningMode", modeName(client.runningMode));
        setText("lastHeartbeat", client.lastHeartbeat);
        setText("osInfo", client.osInfo);
        if (log.fileName || log.fdiseq) {
          el("fileCard").classList.remove("is-hidden");
          setText("fileName", log.fileName);
          setText("fileSize", formatSize(log.fileSize));
          setText("fdiseq", log.fdiseq);
          setText("requestGuid", log.requestGuid);
        }
        if (log.fdiseq) {
          el("fileDetail").classList.remove("is-hidden");
          el("fileDetail").onclick = function () {
            openFile(log.fdiseq);
          };
        }
        renderChart(
          heartbeats.filter(function (row) {
            return row[0] === log.clientId;
          }),
        );
      })
      .catch(function () {
        el("page").classList.add("is-hidden");
        el("error").classList.remove("is-hidden");
      });
  }
  global.addEventListener("load", init);
})(window);
