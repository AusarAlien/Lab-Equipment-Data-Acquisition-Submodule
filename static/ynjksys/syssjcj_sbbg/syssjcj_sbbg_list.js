(function (global) {
  "use strict";
  var CONFIG = { pageSize: 10, defaultDbnm: "ynjk" },
    mock = global.SyssjcjMockData,
    departments = [],
    devices = [],
    templates = [],
    filtered = [],
    page = 1;
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
  function find(list, key, value) {
    return (
      list.find(function (item) {
        return item[key] === value;
      }) || {}
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
  function department(id) {
    return find(departments, "departmentId", id).name || "--";
  }
  function deviceNames(tpl) {
    return (
      devices
        .filter(function (d) {
          return tpl.deviceIds && tpl.deviceIds.length
            ? tpl.deviceIds.indexOf(d.deviceId) >= 0
            : tpl.deviceTypes.indexOf(d.instno) >= 0;
        })
        .map(function (d) {
          return d.name;
        })
        .join("、") || "--"
    );
  }
  function categoryName(code) {
    return (
      {
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
      }[code] || code
    );
  }
  function categories(tpl) {
    return (tpl.sampleCategories || []).map(categoryName).join("、") || "--";
  }
  function rule(mode) {
    return mode === "样品模式" ? "按单一样品生成" : "按检测项目生成";
  }
  function toast(message) {
    el("toast").textContent = message;
    el("toast").classList.remove("is-hidden");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () {
      el("toast").classList.add("is-hidden");
    }, 2200);
  }
  function populate() {
    var depHtml = departments
      .map(function (d) {
        return option(d.departmentId, d.name);
      })
      .join("");
    el("departmentSelect").insertAdjacentHTML("beforeend", depHtml);
    el("uploadDepartment").insertAdjacentHTML("beforeend", depHtml);
    var devHtml = devices
      .map(function (d) {
        return option(d.deviceId, d.name + " / " + d.brand + " " + d.model);
      })
      .join("");
    el("deviceSelect").insertAdjacentHTML("beforeend", devHtml);
    el("uploadDevice").insertAdjacentHTML("beforeend", devHtml);
  }
  function query() {
    var name = el("templateName").value.trim().toLowerCase(),
      dep = el("departmentSelect").value,
      deviceId = el("deviceSelect").value,
      category = el("sampleCategory").value,
      status = el("statusSelect").value,
      start = el("updateStart").value,
      end = el("updateEnd").value,
      dev = find(devices, "deviceId", deviceId);
    if (start && end && start > end) {
      toast("更新开始日期不能晚于结束日期");
      return;
    }
    filtered = templates.filter(function (t) {
      var day = t.updateTime.slice(0, 10);
      return (
        (!name || t.name.toLowerCase().indexOf(name) >= 0) &&
        (!dep || t.departmentId === dep) &&
        (!deviceId ||
          (t.deviceIds && t.deviceIds.length
            ? t.deviceIds.indexOf(deviceId) >= 0
            : t.deviceTypes.indexOf(dev.instno) >= 0)) &&
        (!category || (t.sampleCategories || []).indexOf(category) >= 0) &&
        (!status || t.status === status) &&
        (!start || day >= start) &&
        (!end || day <= end)
      );
    });
    page = 1;
    render();
  }
  function current() {
    return filtered.slice((page - 1) * CONFIG.pageSize, page * CONFIG.pageSize);
  }
  function render() {
    el("templateRows").innerHTML = current()
      .map(function (t, index) {
        return (
          '<tr><td><button class="action" data-action="detail" data-id="' +
          esc(t.templateId) +
          '">查看</button><button class="action" data-action="config" data-id="' +
          esc(t.templateId) +
          '">配置</button><button class="action" data-action="edit" data-id="' +
          esc(t.templateId) +
          '">在线编辑</button><button class="action" data-action="download" data-id="' +
          esc(t.templateId) +
          '">下载</button><button class="action ' +
          (t.status === "启用" ? "danger" : "") +
          '" data-action="toggle" data-id="' +
          esc(t.templateId) +
          '">' +
          (t.status === "启用" ? "停用" : "启用") +
          "</button></td><td>" +
          ((page - 1) * CONFIG.pageSize + index + 1) +
          '</td><td title="' +
          esc(t.name) +
          '">' +
          esc(t.name) +
          '</td><td title="' +
          esc(t.fileName) +
          '">' +
          esc(t.fileName) +
          "</td><td>" +
          esc(t.version) +
          '</td><td title="' +
          esc(department(t.departmentId)) +
          '">' +
          esc(department(t.departmentId)) +
          '</td><td title="' +
          esc(deviceNames(t)) +
          '">' +
          esc(deviceNames(t)) +
          '</td><td title="' +
          esc(categories(t)) +
          '">' +
          esc(categories(t)) +
          "</td><td>" +
          rule(t.mode) +
          "</td><td>" +
          (t.dataSources || []).length +
          '</td><td><span class="status ' +
          (t.status === "启用" ? "on" : "off") +
          '">' +
          t.status +
          '</span></td><td title="' +
          esc(t.updateTime) +
          '">' +
          esc(t.updateTime) +
          "</td><td>" +
          esc(t.updateUser) +
          "</td></tr>"
        );
      })
      .join("");
    el("emptyState").classList.toggle("is-hidden", filtered.length !== 0);
    el("resultSummary").textContent = "（当前查询 " + filtered.length + " 条）";
    var pages = Math.ceil(filtered.length / CONFIG.pageSize);
    el("pages").innerHTML = global.SyssjcjPagination
      .items(pages, page, 5)
      .map(function (pageNumber) {
      if (pageNumber === global.SyssjcjPagination.ELLIPSIS) {
        return '<button class="page-ellipsis" type="button" disabled aria-hidden="true">...</button>';
      }
      return (
        '<button class="' +
        (pageNumber === page ? "active" : "") +
        '" data-page="' +
        pageNumber +
        '">' +
        pageNumber +
        "</button>"
      );
    }).join("");
    el("previous").disabled = page <= 1;
    el("next").disabled = !pages || page >= pages;
    el("pageSummary").textContent = "共 " + pages + " 页，10 条";
  }
  function openPage(hf, id, title) {
    var common =
      typeof global.buildCommonParams === "function"
        ? global.buildCommonParams() || {}
        : {};
    common.hp = common.hp || "ynjksys";
    common.dbnm = common.dbnm || CONFIG.defaultDbnm;
    common.templateId = id;
    if (
      global.isloadpage &&
      typeof global.isloadpage.openModal === "function"
    ) {
      global.isloadpage.openModal({
        hp: common.hp,
        hf: hf,
        params: common,
        title: title,
        width: 1380,
        height: 860,
        successCallback: refresh,
      });
      return;
    }
    toast("页面加载组件未就绪");
  }
  function refresh() {
    templates = mock.getTemplates();
    query();
  }
  function toggle(id) {
    templates = templates.map(function (t) {
      if (t.templateId === id) {
        t.status = t.status === "启用" ? "停用" : "启用";
        t.updateTime = "2026-08-04 " + new Date().toTimeString().slice(0, 8);
      }
      return t;
    });
    mock.setTemplates(templates);
    query();
    toast("模板状态已更新");
  }
  function openUpload() {
    ["uploadName", "uploadDescription"].forEach(function (id) {
      el(id).value = "";
    });
    [
      "uploadFile",
      "uploadDepartment",
      "uploadDevice",
      "uploadCategory",
    ].forEach(function (id) {
      el(id).value = "";
    });
    el("uploadRule").value = "样品模式";
    el("uploadModal").classList.remove("is-hidden");
    document.body.style.overflow = "hidden";
  }
  function closeUpload() {
    el("uploadModal").classList.add("is-hidden");
    document.body.style.overflow = "";
  }
  function saveUpload() {
    var file = el("uploadFile").files[0],
      name = el("uploadName").value.trim(),
      dep = el("uploadDepartment").value,
      deviceId = el("uploadDevice").value,
      category = el("uploadCategory").value,
      dev = find(devices, "deviceId", deviceId);
    if (!name || !file || !dep || !deviceId || !category) {
      toast("请完整填写必填项");
      return;
    }
    var ext = (file.name.split(".").pop() || "").toLowerCase(),
      item = {
        templateId: "TPL-" + Date.now(),
        name: name,
        mode: el("uploadRule").value,
        departmentId: dep,
        deviceTypes: [dev.instno],
        deviceIds: [dev.deviceId],
        sampleCategories: [category],
        fileName: file.name,
        fileType: /doc/.test(ext) ? "Word" : "Excel",
        version: "V1.0",
        description: el("uploadDescription").value.trim(),
        dataSources: [
          "sampleNo",
          "sampleCategoryName",
          "sampleName",
          "projectName",
          "result",
          "unit",
          "experimentTime",
          "deviceName",
          "fileName",
        ].map(function (field, index) {
          return {
            sourceId: "SRC-" + field,
            field: field,
            displayName: {
              sampleNo: "样品编号",
              sampleCategoryName: "样品类别",
              sampleName: "样品名称",
              projectName: "检测项目",
              result: "检测结果",
              unit: "结果单位",
              experimentTime: "实验时间",
              deviceName: "仪器设备",
              fileName: "来源文件",
            }[field],
            sourceObject: "解析数据",
            dataType: "文本",
            required: ["sampleNo", "projectName", "result"].indexOf(field) >= 0,
            visible: true,
            format: "",
            order: index + 1,
          };
        }),
        status: "启用",
        updateTime: "2026-08-04 " + new Date().toTimeString().slice(0, 8),
        updateUser: "监*一",
      };
    templates.unshift(item);
    mock.setTemplates(templates);
    closeUpload();
    query();
    toast("模板上传完成");
  }
  function bind() {
    el("queryButton").onclick = query;
    el("resetButton").onclick = function () {
      [
        "templateName",
        "departmentSelect",
        "deviceSelect",
        "sampleCategory",
        "statusSelect",
        "updateStart",
        "updateEnd",
      ].forEach(function (id) {
        el(id).value = "";
      });
      query();
    };
    el("uploadButton").onclick = openUpload;
    el("uploadClose").onclick = closeUpload;
    el("uploadCancel").onclick = closeUpload;
    el("uploadSave").onclick = saveUpload;
    el("uploadDepartment").onchange = function () {
      var dep = this.value;
      el("uploadDevice").innerHTML =
        '<option value="">请选择</option>' +
        devices
          .filter(function (d) {
            return !dep || d.departmentId === dep;
          })
          .map(function (d) {
            return option(d.deviceId, d.name);
          })
          .join("");
    };
    el("templateRows").onclick = function (event) {
      var b = event.target.closest("[data-action]");
      if (!b) return;
      var id = b.dataset.id,
        a = b.dataset.action;
      if (a === "detail") openPage("syssjcj_sbbg_detail", id, "模板详情");
      if (a === "config") openPage("syssjcj_sbbg_config", id, "模板配置");
      if (a === "edit") openPage("syssjcj_sbbg_editor", id, "在线编辑模板");
      if (a === "download") toast("已模拟下载模板文件");
      if (a === "toggle") toggle(id);
    };
    el("pages").onclick = function (e) {
      var b = e.target.closest("[data-page]");
      if (b) {
        page = Number(b.dataset.page);
        render();
      }
    };
    el("previous").onclick = function () {
      if (page > 1) {
        page--;
        render();
      }
    };
    el("next").onclick = function () {
      if (page * CONFIG.pageSize < filtered.length) {
        page++;
        render();
      }
    };
    el("jump").onkeydown = function (e) {
      if (e.key === "Enter") {
        var target = Number(this.value),
          pages = Math.ceil(filtered.length / CONFIG.pageSize);
        if (target >= 1 && target <= pages) {
          page = target;
          this.value = "";
          render();
        } else toast("请输入有效页码");
      }
    };
  }
  function init() {
    if (typeof global.initGlobalParams === "function")
      global.initGlobalParams();
    if (!mock) {
      return;
    }
    departments = mock.getDepartments();
    devices = mock.getDevices();
    templates = mock.getTemplates();
    populate();
    bind();
    query();
  }
  global.syssjcjSbbgRefresh = refresh;
  global.addEventListener("load", init);
})(window);
