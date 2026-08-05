(function (global) {
  "use strict";
  var S = global.SyssjcjConfigService,
    PAGE = 10,
    USER = "监*一",
    state = {
      tab: "strategy",
      departments: [],
      devices: [],
      clients: [],
      strategies: [],
      mappings: [],
      sources: [],
      filtered: { strategy: [], mapping: [], source: [] },
      page: { strategy: 1, mapping: 1, source: 1 },
    };
  function el(id) {
    return document.getElementById(id);
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
  function find(a, k, v) {
    return (
      a.find(function (x) {
        return x[k] === v;
      }) || {}
    );
  }
  function dep(id) {
    return find(state.departments, "departmentId", id).name || "--";
  }
  function dev(id) {
    return find(state.devices, "deviceId", id).name || "--";
  }
  function cli(id) {
    return find(state.clients, "clientId", id);
  }
  function tag(v) {
    return (
      '<span class="tag ' +
      (v === "启用" ? "tag-success" : "tag-muted") +
      '">' +
      esc(v) +
      "</span>"
    );
  }
  function title(v) {
    return ' title="' + esc(v || "--") + '"';
  }
  function options(id, rows, key, text, placeholder) {
    var n = el(id),
      old = n.value;
    n.innerHTML =
      '<option value="">' +
      placeholder +
      "</option>" +
      rows
        .map(function (x) {
          return (
            '<option value="' + esc(x[key]) + '">' + esc(x[text]) + "</option>"
          );
        })
        .join("");
    n.value = old;
  }
  function toast(msg) {
    var n = el("toast");
    n.textContent = msg;
    n.classList.remove("is-hidden");
    clearTimeout(toast.t);
    toast.t = setTimeout(function () {
      n.classList.add("is-hidden");
    }, 2200);
  }
  function params(extra) {
    var p = {
      sessionId: global.SESSIONID || global.sessionId || "",
      dbnm: global.DBNM || "ynjk",
      hp: global.HP || "ynjksys",
    };
    Object.keys(extra || {}).forEach(function (k) {
      p[k] = extra[k];
    });
    return p;
  }
  function modal(hf, title, extra, w, h) {
    if (
      !global.isloadpage ||
      typeof global.isloadpage.openModal !== "function"
    ) {
      toast("页面加载组件未就绪");
      return;
    }
    global.isloadpage.openModal({
      hp: "ynjksys",
      hf: hf,
      params: params(extra),
      title: title,
      width: w || 1450,
      height: h || 880,
    });
  }
  function pager(name, total) {
    var pages = Math.ceil(total / PAGE),
      current = state.page[name],
      node = el(name + "Pager"),
      buttons = [];
    buttons.push(
      '<button data-dir="-1"' +
        (current <= 1 ? " disabled" : "") +
        ">‹</button>",
    );
    for (var i = 1; i <= pages; i++)
      buttons.push(
        '<button class="' +
          (i === current ? "is-current" : "") +
          '" data-page="' +
          i +
          '">' +
          i +
          "</button>",
      );
    buttons.push(
      '<button data-dir="1"' +
        (!pages || current >= pages ? " disabled" : "") +
        ">›</button><span>共 " +
        pages +
        ' 页，10 条</span><label>跳至</label><input type="number" min="1" data-jump><span>页</span>',
    );
    node.innerHTML = buttons.join("");
  }
  function slice(name) {
    return state.filtered[name].slice(
      (state.page[name] - 1) * PAGE,
      state.page[name] * PAGE,
    );
  }
  function bindPager(name, render) {
    el(name + "Pager").onclick = function (e) {
      var p = Number(e.target.dataset.page),
        d = Number(e.target.dataset.dir),
        pages = Math.ceil(state.filtered[name].length / PAGE);
      if (p) state.page[name] = p;
      else if (d)
        state.page[name] = Math.max(
          1,
          Math.min(pages || 1, state.page[name] + d),
        );
      else return;
      render();
    };
    el(name + "Pager").onchange = function (e) {
      if (!e.target.dataset.jump) return;
      var p = Number(e.target.value),
        pages = Math.ceil(state.filtered[name].length / PAGE);
      if (p >= 1 && p <= pages) {
        state.page[name] = p;
        render();
      } else toast("请输入有效页码");
    };
  }
  function renderStrategies() {
    el("strategyRows").innerHTML = slice("strategy")
      .map(function (x, i) {
        var c = cli(x.clientId),
          path =
            x.collectionMode === "串口采集"
              ? x.comPort || "--"
              : x.filepath || "--",
          scriptAction = "";
        // 当前系统尚无在线脚本管理和调试通路，前提满足后解除注释恢复入口。
        // scriptAction = '<button class="action" data-act="script" data-id="' + x.strategyId + '">脚本</button>';
        return (
          '<tr><td><button class="action" data-act="view" data-id="' +
          x.strategyId +
          '">查看</button><button class="action" data-act="download" data-id="' +
          x.strategyId +
          '">下载</button><button class="action" data-act="edit" data-id="' +
          x.strategyId +
          '">修改</button>' +
          scriptAction +
          "</td><td>" +
          ((state.page.strategy - 1) * PAGE + i + 1) +
          "</td><td" +
          title(x.strategyName) +
          ">" +
          esc(x.strategyName) +
          "</td><td" +
          title(dep(x.departmentId)) +
          ">" +
          esc(dep(x.departmentId)) +
          "</td><td" +
          title(dev(x.deviceId)) +
          ">" +
          esc(dev(x.deviceId)) +
          "</td><td" +
          title(x.clientId) +
          ">" +
          esc(x.clientId) +
          "</td><td>" +
          esc((c.clientType || "--") + " / " + (c.clientVersion || "--")) +
          "</td><td>" +
          esc(x.collectionMode) +
          "</td><td" +
          title(path) +
          ">" +
          esc(path) +
          "</td><td>" +
          esc(x.frequency) +
          " 秒" +
          "</td><td>" +
          tag(x.status) +
          "</td><td>" +
          esc(x.version) +
          "</td><td>" +
          esc(x.owner) +
          "</td><td" +
          title(x.updateTime) +
          ">" +
          esc(x.updateTime) +
          "</td></tr>"
        );
      })
      .join("");
    el("strategyEmpty").classList.toggle(
      "is-hidden",
      state.filtered.strategy.length > 0,
    );
    el("strategySummary").textContent =
      "（当前查询 " + state.filtered.strategy.length + " 条）";
    pager("strategy", state.filtered.strategy.length);
  }
  function renderMappings() {
    el("mappingRows").innerHTML = slice("mapping")
      .map(function (x, i) {
        return (
          '<tr><td><button class="action" data-act="view" data-id="' +
          x.mappingId +
          '">查看</button><button class="action" data-act="edit" data-id="' +
          x.mappingId +
          '">修改</button><button class="action danger" data-act="delete" data-id="' +
          x.mappingId +
          '">删除</button></td><td>' +
          ((state.page.mapping - 1) * PAGE + i + 1) +
          "</td><td" +
          title(dep(x.departmentId)) +
          ">" +
          esc(dep(x.departmentId)) +
          "</td><td" +
          title(dev(x.deviceId)) +
          ">" +
          esc(dev(x.deviceId)) +
          "</td><td>" +
          esc(x.sourceCode) +
          "</td><td" +
          title(x.sourceName) +
          ">" +
          esc(x.sourceName) +
          "</td><td>" +
          esc(x.standardCode) +
          "</td><td" +
          title(x.standardName) +
          ">" +
          esc(x.standardName) +
          "</td><td>" +
          esc(x.unit || "--") +
          "</td><td>" +
          tag(x.status) +
          "</td><td>" +
          esc(x.updateBy) +
          "</td><td" +
          title(x.updateTime) +
          ">" +
          esc(x.updateTime) +
          "</td></tr>"
        );
      })
      .join("");
    el("mappingEmpty").classList.toggle(
      "is-hidden",
      state.filtered.mapping.length > 0,
    );
    el("mappingSummary").textContent =
      "（当前查询 " + state.filtered.mapping.length + " 条）";
    pager("mapping", state.filtered.mapping.length);
  }
  function maskConnection(v) {
    return String(v || "").replace(/:\/\/([^:]+):([^@]+)@/, "://$1:******@");
  }
  function renderSources() {
    el("sourceRows").innerHTML = slice("source")
      .map(function (x, i) {
        var conn = maskConnection(x.connectionString);
        return (
          '<tr><td><button class="action" data-act="view" data-id="' +
          x.sourceId +
          '">查看</button><button class="action" data-act="edit" data-id="' +
          x.sourceId +
          '">修改</button><button class="action" data-act="copy" data-id="' +
          x.sourceId +
          '">复制</button><button class="action danger" data-act="delete" data-id="' +
          x.sourceId +
          '">删除</button></td><td>' +
          ((state.page.source - 1) * PAGE + i + 1) +
          "</td><td" +
          title(x.sourceName) +
          ">" +
          esc(x.sourceName) +
          "</td><td>" +
          esc(x.sourceType) +
          "</td><td>" +
          esc(x.purpose) +
          "</td><td" +
          title(dep(x.departmentId)) +
          ">" +
          esc(dep(x.departmentId)) +
          "</td><td" +
          title(conn) +
          ">" +
          esc(conn) +
          "</td><td>" +
          (x.references || []).length +
          "</td><td>" +
          tag(x.status) +
          "</td><td>" +
          esc(x.updateBy) +
          "</td><td" +
          title(x.updateTime) +
          ">" +
          esc(x.updateTime) +
          "</td></tr>"
        );
      })
      .join("");
    el("sourceEmpty").classList.toggle(
      "is-hidden",
      state.filtered.source.length > 0,
    );
    el("sourceSummary").textContent =
      "（当前查询 " + state.filtered.source.length + " 条）";
    pager("source", state.filtered.source.length);
  }
  function queryStrategy() {
    var name = el("strategyName").value.trim(),
      departmentId = el("strategyDepartment").value,
      deviceId = el("strategyDevice").value,
      clientId = el("strategyClient").value,
      mode = el("strategyMode").value,
      status = el("strategyStatus").value,
      mine = el("strategyScope").value === "mine";
    state.filtered.strategy = state.strategies.filter(function (x) {
      return (
        (!name || x.strategyName.indexOf(name) >= 0) &&
        (!departmentId || x.departmentId === departmentId) &&
        (!deviceId || x.deviceId === deviceId) &&
        (!clientId || x.clientId === clientId) &&
        (!mode || x.collectionMode === mode) &&
        (!status || x.status === status) &&
        (!mine || x.owner === USER)
      );
    });
    state.page.strategy = 1;
    renderStrategies();
  }
  function queryMapping() {
    var departmentId = el("mappingDepartment").value,
      deviceId = el("mappingDevice").value,
      source = el("mappingSource").value.trim(),
      standard = el("mappingStandard").value.trim(),
      status = el("mappingStatus").value;
    state.filtered.mapping = state.mappings.filter(function (x) {
      return (
        (!departmentId || x.departmentId === departmentId) &&
        (!deviceId || x.deviceId === deviceId) &&
        (!source || (x.sourceCode + x.sourceName).indexOf(source) >= 0) &&
        (!standard ||
          (x.standardCode + x.standardName).indexOf(standard) >= 0) &&
        (!status || x.status === status)
      );
    });
    state.page.mapping = 1;
    renderMappings();
  }
  function querySource() {
    var name = el("sourceName").value.trim(),
      type = el("sourceType").value,
      purpose = el("sourcePurpose").value,
      departmentId = el("sourceDepartment").value,
      status = el("sourceStatus").value;
    state.filtered.source = state.sources.filter(function (x) {
      return (
        (!name || x.sourceName.indexOf(name) >= 0) &&
        (!type || x.sourceType === type) &&
        (!purpose || x.purpose === purpose) &&
        (!departmentId || x.departmentId === departmentId) &&
        (!status || x.status === status)
      );
    });
    state.page.source = 1;
    renderSources();
  }
  function reset(ids, query) {
    ids.forEach(function (id) {
      el(id).value = "";
    });
    query();
  }
  function switchTab(tab) {
    state.tab = tab;
    document.querySelectorAll(".page-tab").forEach(function (n) {
      n.classList.toggle("is-active", n.dataset.tab === tab);
    });
    ["strategy", "mapping", "source"].forEach(function (n) {
      el(n + "Query").classList.toggle("is-hidden", n !== tab);
      el(n + "Panel").classList.toggle("is-hidden", n !== tab);
    });
  }
  function downloadStrategy(x) {
    var c = cli(x.clientId),
      lines = [
        "[interface]",
        "type = " + x.interfaceType,
        "instno = " +
          (find(state.devices, "deviceId", x.deviceId).instno || ""),
        "filepath = " + (x.filepath || ""),
        "frequency = " + x.frequency,
        "service = " + x.service,
        "startrow = " + x.startrow,
        "sampcolflag = " + x.sampcolflag,
        "track_mode = " + (x.trackMode === "启用" ? 1 : 0),
        "usb_mode = " + (x.usbMode || "mass_storage"),
        "usb_poll_interval = " + (x.usbPollInterval || 5),
        "data_mode = file_first",
        "usb_output_dir = " + (x.outputDir || ""),
        "usb_filename_template = " + x.filenameTemplate,
        "client_id = " + x.clientId,
        "client_type = " + (c.clientType || ""),
        "client_ver = " + (c.clientVersion || ""),
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
    setTimeout(function () {
      URL.revokeObjectURL(a.href);
    }, 500);
    toast("采集策略已生成下载");
  }
  function confirmButton(button, run) {
    if (button.dataset.confirmed !== "1") {
      button.dataset.confirmed = "1";
      button.textContent = "再次点击确认";
      setTimeout(function () {
        button.dataset.confirmed = "0";
        button.textContent = "删除";
      }, 3000);
      return;
    }
    run();
  }
  function refresh() {
    return Promise.all([
      S.loadStrategies({}),
      S.loadMappings({}),
      S.loadSources({}),
    ]).then(function (v) {
      state.strategies = v[0];
      state.mappings = v[1];
      state.sources = v[2];
      queryStrategy();
      queryMapping();
      querySource();
    });
  }
  function bind() {
    document.querySelectorAll(".page-tab").forEach(function (n) {
      n.onclick = function () {
        switchTab(n.dataset.tab);
      };
    });
    el("strategySearch").onclick = queryStrategy;
    el("mappingSearch").onclick = queryMapping;
    el("sourceSearch").onclick = querySource;
    el("strategyReset").onclick = function () {
      reset(
        [
          "strategyName",
          "strategyDepartment",
          "strategyDevice",
          "strategyClient",
          "strategyMode",
          "strategyStatus",
        ],
        function () {
          el("strategyScope").value = "all";
          queryStrategy();
        },
      );
    };
    el("mappingReset").onclick = function () {
      reset(
        [
          "mappingDepartment",
          "mappingDevice",
          "mappingSource",
          "mappingStandard",
          "mappingStatus",
        ],
        queryMapping,
      );
    };
    el("sourceReset").onclick = function () {
      reset(
        [
          "sourceName",
          "sourceType",
          "sourcePurpose",
          "sourceDepartment",
          "sourceStatus",
        ],
        querySource,
      );
    };
    bindPager("strategy", renderStrategies);
    bindPager("mapping", renderMappings);
    bindPager("source", renderSources);
    el("mappingAdd").onclick = function () {
      modal(
        "syssjcj_cjpz_mapping_form",
        "新增项目对照",
        { mode: "add" },
        980,
        700,
      );
    };
    el("sourceAdd").onclick = function () {
      modal(
        "syssjcj_cjpz_source_form",
        "新增数据源",
        { mode: "add" },
        1180,
        820,
      );
    };
    el("strategyRows").onclick = function (e) {
      var a = e.target.dataset.act,
        id = e.target.dataset.id,
        x = find(state.strategies, "strategyId", id);
      if (a === "view" || a === "edit")
        modal(
          "syssjcj_cjpz_strategy",
          "采集策略",
          { strategyId: id, mode: a },
          1450,
          900,
        );
      /* 当前阶段隐藏脚本功能，服务端具备脚本管理前提后恢复。
      else if (a === "script") {
        if (!x.scriptId) toast("当前策略未关联脚本");
        else
          modal(
            "syssjcj_cjpz_script",
            "脚本调试",
            { strategyId: id, scriptId: x.scriptId },
            1350,
            860,
          );
      }
      */
      else if (a === "download") downloadStrategy(x);
    };
    el("mappingRows").onclick = function (e) {
      var a = e.target.dataset.act,
        id = e.target.dataset.id;
      if (a === "view" || a === "edit")
        modal(
          "syssjcj_cjpz_mapping_form",
          a === "view" ? "查看项目对照" : "修改项目对照",
          { mappingId: id, mode: a },
          980,
          700,
        );
      else if (a === "delete")
        confirmButton(e.target, function () {
          state.mappings = state.mappings.filter(function (x) {
            return x.mappingId !== id;
          });
          S.saveMappings(state.mappings).then(function () {
            queryMapping();
            toast("项目对照已删除");
          });
        });
    };
    el("sourceRows").onclick = function (e) {
      var a = e.target.dataset.act,
        id = e.target.dataset.id,
        x = find(state.sources, "sourceId", id);
      if (a === "view" || a === "edit")
        modal(
          "syssjcj_cjpz_source_form",
          a === "view" ? "查看数据源" : "修改数据源",
          { sourceId: id, mode: a },
          1180,
          820,
        );
      else if (a === "copy")
        modal(
          "syssjcj_cjpz_source_form",
          "复制数据源",
          { sourceId: id, mode: "copy" },
          1180,
          820,
        );
      else if (a === "delete")
        confirmButton(e.target, function () {
          if ((x.references || []).length) {
            toast("该数据源已被模板引用，不能删除");
            return;
          }
          state.sources = state.sources.filter(function (s) {
            return s.sourceId !== id;
          });
          S.saveSources(state.sources).then(function () {
            querySource();
            toast("数据源已删除");
          });
        });
    };
  }
  function init() {
    if (typeof global.initGlobalParams === "function")
      global.initGlobalParams();
    Promise.all([S.loadDepartments(), S.loadDevices(), S.loadClients()])
      .then(function (v) {
        state.departments = v[0];
        state.devices = v[1];
        state.clients = v[2];
        ["strategyDepartment", "mappingDepartment", "sourceDepartment"].forEach(
          function (id) {
            options(
              id,
              state.departments,
              "departmentId",
              "name",
              "全部实验室",
            );
          },
        );
        ["strategyDevice", "mappingDevice"].forEach(function (id) {
          options(id, state.devices, "deviceId", "name", "全部设备");
        });
        options(
          "strategyClient",
          state.clients,
          "clientId",
          "clientId",
          "全部客户端",
        );
        bind();
        return refresh();
      })
      .catch(function (e) {
        toast(e.message || "配置数据加载失败");
      });
  }
  global.SyssjcjConfigPage = { refresh: refresh, toast: toast };
  global.addEventListener("load", init);
})(window);
