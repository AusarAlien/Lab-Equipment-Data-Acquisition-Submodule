(function (global) {
  "use strict";
  var mock = global.SyssjcjMockData,
    templates = [],
    target = null,
    sources = [],
    editId = "",
    departments = [],
    devices = [];
  var categoryCatalog = [
    { code: "ENV-WATER-DRINKING", name: "生活饮用水" },
    { code: "ENV-WATER-SURFACE", name: "地表水" },
    { code: "ENV-WATER-GROUND", name: "地下水" },
    { code: "ENV-AIR-WORKPLACE", name: "工作场所空气" },
    { code: "ENV-AIR-AMBIENT", name: "环境空气" },
    { code: "ENV-SOIL", name: "土壤或沉积物" },
    { code: "FOOD-GENERAL", name: "食品" },
    { code: "FOOD-BEVERAGE", name: "饮料" },
    { code: "FOOD-ADDITIVE", name: "食品添加剂" },
    { code: "FOOD-CONTACT", name: "食品接触材料" },
    { code: "BIO-SERUM", name: "血清" },
    { code: "BIO-PLASMA", name: "血浆" },
    { code: "BIO-WHOLE-BLOOD", name: "全血" },
    { code: "BIO-URINE", name: "尿液" },
    { code: "BIO-SPUTUM", name: "痰液" },
    { code: "BIO-THROAT-SWAB", name: "咽拭子" },
    { code: "BIO-NASAL-SWAB", name: "鼻拭子" },
    { code: "BIO-FECES", name: "粪便" },
    { code: "MICRO-CULTURE", name: "菌株或培养物" },
    { code: "MICRO-VIRUS", name: "病毒样本" },
    { code: "MICRO-ISOLATE", name: "微生物分离物" },
    { code: "OCC-COLLECTED", name: "职业卫生采集样品" },
    { code: "RAD-DOSIMETER", name: "个人剂量计" },
    { code: "RAD-SAMPLE", name: "放射性监测样品" },
    { code: "QC-REFERENCE", name: "标准物质" },
    { code: "QC-CONTROL", name: "质控样品" },
    { code: "QC-BLANK", name: "空白样品" },
    { code: "QC-PT", name: "能力验证样品" },
  ];
  function el(id) {
    return document.getElementById(id);
  }
  function param(n) {
    return new URLSearchParams(global.location.search).get(n) || "";
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
    el("toast").textContent = m;
    el("toast").classList.remove("is-hidden");
    clearTimeout(toast.t);
    toast.t = setTimeout(function () {
      el("toast").classList.add("is-hidden");
    }, 1800);
  }
  function treeValues(id) {
    return Array.from(el(id).querySelectorAll('input[data-value]:checked')).map(function (input) { return input.dataset.value; });
  }
  function groupName(code) { var prefix=code.split("-")[0];return({ENV:"环境样品",FOOD:"食品及相关产品",BIO:"生物样本",MICRO:"微生物样本",OCC:"职业卫生",RAD:"放射卫生",QC:"质量控制样品"})[prefix]||"其他样品"; }
  function renderTree(id, groups, selected) { var html=groups.map(function(group,index){return '<div class="tree-node"><label class="tree-group"><input type="checkbox" data-group="'+index+'"><span>'+esc(group.name)+'</span></label><div class="tree-children">'+group.items.map(function(item){return '<label class="tree-child" title="'+esc(item.name)+'"><input type="checkbox" data-value="'+esc(item.value)+'" data-name="'+esc(item.name)+'"'+((selected||[]).indexOf(item.value)>=0?' checked':'')+'><span>'+esc(item.name)+'</span></label>'}).join("")+'</div></div>'}).join("");el(id).innerHTML=html||'<div class="tree-empty">暂无可选项</div>';updateTree(id); }
  function updateTree(id) { var tree=el(id);tree.querySelectorAll('[data-group]').forEach(function(parent){var children=parent.closest('.tree-node').querySelectorAll('input[data-value]'),checked=parent.closest('.tree-node').querySelectorAll('input[data-value]:checked').length;parent.checked=children.length>0&&checked===children.length;parent.indeterminate=checked>0&&checked<children.length});var names=Array.from(tree.querySelectorAll('input[data-value]:checked')).map(function(input){return input.dataset.name}),trigger=el(id==="devicesTree"?"devicesTrigger":"categoriesTrigger").querySelector('span');trigger.textContent=!names.length?(id==="devicesTree"?"请选择适用设备":"请选择样品类别"):names.length<=2?names.join("、"):names.slice(0,2).join("、")+" 等 "+names.length+" 项";trigger.title=names.join("、"); }
  function bindTree(id) { el(id).onchange=function(event){var input=event.target;if(input.dataset.group!==undefined){input.closest('.tree-node').querySelectorAll('input[data-value]').forEach(function(child){child.checked=input.checked})}updateTree(id)}; }
  function populateDevices(selectedIds) {
    var dep = el("department").value;
    var depName=(departments.find(function(item){return item.departmentId===dep})||{}).name||"适用设备",items=devices.filter(function(device){return !dep||device.departmentId===dep}).map(function(device){return{value:device.deviceId,name:device.name+" / "+device.brand+" "+device.model}});renderTree("devicesTree",[{name:depName,items:items}],selectedIds||[]);
  }
  function populateCategories(selected) { var map={};categoryCatalog.forEach(function(item){var name=groupName(item.code);if(!map[name])map[name]=[];map[name].push({value:item.code,name:item.name})});renderTree("categoriesTree",Object.keys(map).map(function(name){return{name:name,items:map[name]}}),selected||[]); }
  function render() {
    sources
      .sort(function (a, b) {
        return a.order - b.order;
      })
      .forEach(function (s, i) {
        s.order = i + 1;
      });
    el("rows").innerHTML = sources
      .map(function (s) {
        return (
          '<tr><td><button class="action" data-action="edit" data-id="' +
          esc(s.sourceId) +
          '">编辑</button><button class="action" data-action="up" data-id="' +
          esc(s.sourceId) +
          '">上移</button><button class="action" data-action="down" data-id="' +
          esc(s.sourceId) +
          '">下移</button><button class="action" data-action="remove" data-id="' +
          esc(s.sourceId) +
          '">移除</button></td><td>' +
          s.order +
          '</td><td title="' +
          esc(s.field) +
          '">' +
          esc(s.field) +
          '</td><td title="' +
          esc(s.displayName) +
          '">' +
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
  }
  function edit(id) {
    var s = sources.find(function (x) {
      return x.sourceId === id;
    });
    openSource(s);
  }
  function openSource(source) {
    editId = source ? source.sourceId : "";
    el("sourceModalTitle").textContent = source ? "编辑数据源" : "添加数据源";
    el("sourceField").value = source ? source.field : "";
    el("sourceField").disabled = !!source;
    el("sourceName").value = source ? source.displayName : "";
    el("sourceObject").value = source ? source.sourceObject : "解析数据";
    el("sourceType").value = source ? source.dataType : "文本";
    el("sourceRequired").value = String(source ? source.required : false);
    el("sourceVisible").value = String(source ? source.visible : true);
    el("sourceFormat").value = source ? source.format || "" : "";
    el("sourceModal").classList.remove("is-hidden");
  }
  function closeSource() {
    el("sourceModal").classList.add("is-hidden");
  }
  function saveSource() {
    var field = el("sourceField").value.trim(),
      name = el("sourceName").value.trim();
    if (!field || !name) {
      toast("请填写字段编码和显示名称");
      return;
    }
    if (
      !editId &&
      sources.some(function (s) {
        return s.field === field;
      })
    ) {
      toast("该数据源已存在");
      return;
    }
    var source = editId
      ? sources.find(function (s) {
          return s.sourceId === editId;
        })
      : { sourceId: "SRC-" + field, field: field, order: sources.length + 1 };
    source.displayName = name;
    source.sourceObject = el("sourceObject").value;
    source.dataType = el("sourceType").value;
    source.required = el("sourceRequired").value === "true";
    source.visible = el("sourceVisible").value === "true";
    source.format = el("sourceFormat").value.trim();
    if (!editId) sources.push(source);
    closeSource();
    render();
  }
  function move(id, delta) {
    var i = sources.findIndex(function (x) {
        return x.sourceId === id;
      }),
      j = i + delta;
    if (i < 0 || j < 0 || j >= sources.length) return;
    var temp = sources[i];
    sources[i] = sources[j];
    sources[j] = temp;
    render();
  }
  function save() {
    target.name = el("name").value.trim() || target.name;
    target.mode = el("rule").value;
    target.status = el("status").value;
    target.description = el("description").value.trim();
    var deviceIds = treeValues("devicesTree"),
      sampleCategories = treeValues("categoriesTree");
    if (
      !el("department").value ||
      !deviceIds.length ||
      !sampleCategories.length
    ) {
      toast("请选择所属部门、适用设备和样品类别");
      return;
    }
    target.departmentId = el("department").value;
    target.deviceIds = deviceIds;
    target.deviceTypes = Array.from(
      new Set(
        deviceIds
          .map(function (id) {
            return (
              devices.find(function (device) {
                return device.deviceId === id;
              }) || {}
            ).instno;
          })
          .filter(Boolean),
      ),
    );
    target.sampleCategories = sampleCategories;
    target.dataSources = sources;
    target.version =
      "V" +
      (Number((target.version || "V1.0").replace("V", "").split(".")[0]) || 1) +
      "." +
      ((Number((target.version || "V1.0").split(".")[1]) || 0) + 1);
    target.updateTime = "2026-08-04 " + new Date().toTimeString().slice(0, 8);
    target.updateUser = "监*一";
    templates = templates.map(function (t) {
      return t.templateId === target.templateId ? target : t;
    });
    mock.setTemplates(templates);
    try {
      if (
        global.parent &&
        typeof global.parent.syssjcjSbbgRefresh === "function"
      )
        global.parent.syssjcjSbbgRefresh();
    } catch (e) {}
    toast("模板配置已保存");
  }
  function init() {
    if (typeof global.initGlobalParams === "function")
      global.initGlobalParams();
    templates = mock.getTemplates();
    departments = mock.getDepartments();
    devices = mock.getDevices();
    target = templates.find(function (t) {
      return t.templateId === param("templateId");
    });
    if (!target) {
      el("page").classList.add("is-hidden");
      el("error").classList.remove("is-hidden");
      return;
    }
    sources = JSON.parse(JSON.stringify(target.dataSources || []));
    el("name").value = target.name;
    el("rule").value = target.mode;
    el("status").value = target.status;
    el("description").value = target.description || "";
    el("department").innerHTML = departments
      .map(function (dep) {
        return (
          '<option value="' +
          esc(dep.departmentId) +
          '">' +
          esc(dep.name) +
          "</option>"
        );
      })
      .join("");
    el("department").value = target.departmentId;
    populateCategories(target.sampleCategories || []);
    populateDevices(
      target.deviceIds ||
        devices
          .filter(function (device) {
            return (target.deviceTypes || []).indexOf(device.instno) >= 0;
          })
          .map(function (device) {
            return device.deviceId;
          }),
    );
    el("department").onchange = function () {
      populateDevices([]);
    };
    bindTree("devicesTree");
    bindTree("categoriesTree");
    [["devicesTrigger","devicesPanel","devicesSelect"],["categoriesTrigger","categoriesPanel","categoriesSelect"]].forEach(function(ids){el(ids[0]).onclick=function(event){event.stopPropagation();var willOpen=el(ids[1]).classList.contains("is-hidden");document.querySelectorAll('.tree-panel').forEach(function(panel){panel.classList.add('is-hidden')});document.querySelectorAll('.tree-select').forEach(function(select){select.classList.remove('is-open')});el(ids[1]).classList.toggle("is-hidden",!willOpen);el(ids[2]).classList.toggle("is-open",willOpen)}});
    document.addEventListener("click",function(event){if(!event.target.closest('.tree-select')){document.querySelectorAll('.tree-panel').forEach(function(panel){panel.classList.add('is-hidden')});document.querySelectorAll('.tree-select').forEach(function(select){select.classList.remove('is-open')})}});
    render();
    el("rows").onclick = function (e) {
      var b = e.target.closest("[data-action]");
      if (!b) return;
      if (b.dataset.action === "edit") edit(b.dataset.id);
      if (b.dataset.action === "up") move(b.dataset.id, -1);
      if (b.dataset.action === "down") move(b.dataset.id, 1);
      if (b.dataset.action === "remove") {
        sources = sources.filter(function (s) {
          return s.sourceId !== b.dataset.id;
        });
        render();
      }
    };
    el("addSource").onclick = function () {
      openSource(null);
    };
    el("sourceClose").onclick = closeSource;
    el("sourceCancel").onclick = closeSource;
    el("sourceSave").onclick = saveSource;
    el("restore").onclick = function () {
      sources = JSON.parse(JSON.stringify(target.dataSources || []));
      render();
      toast("已恢复到本次保存前配置");
    };
    el("save").onclick = save;
  }
  global.addEventListener("load", init);
})(window);
