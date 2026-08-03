(function (global) {
  "use strict";
  var mock = global.SyssjcjMockData,
    templates = [],
    target = null,
    schema = null,
    selection = { type: "", section: "", field: "" };
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
  function clone(v) {
    return JSON.parse(JSON.stringify(v));
  }
  function toast(m) {
    el("toast").textContent = m;
    el("toast").classList.remove("is-hidden");
    clearTimeout(toast.t);
    toast.t = setTimeout(function () {
      el("toast").classList.add("is-hidden");
    }, 1900);
  }
  function defaultSchema() {
    var sources = (target.dataSources || [])
        .filter(function (s) {
          return s.visible;
        })
        .sort(function (a, b) {
          return a.order - b.order;
        }),
      basicNames = [
        "sampleNo",
        "sampleCategoryName",
        "sampleName",
        "experimentTime",
        "deviceName",
      ];
    function field(source) {
      return {
        field: source.field,
        label: source.displayName,
        width: source.field === "result" ? 140 : 150,
        align: source.dataType === "日期时间" ? "center" : "left",
        format: source.format || "",
        visible: true,
      };
    }
    return {
      header: { visible: true, text: "实验室设备采集数据原始记录" },
      title: {
        visible: true,
        text: target.name,
        description: target.description || "",
      },
      basic: {
        visible: true,
        fields: sources
          .filter(function (s) {
            return basicNames.indexOf(s.field) >= 0;
          })
          .map(field),
      },
      detail: {
        visible: true,
        fields: sources
          .filter(function (s) {
            return basicNames.indexOf(s.field) < 0;
          })
          .map(field),
      },
      notes: {
        visible: true,
        text: "说明：本记录数据来源于仪器设备自动采集。",
      },
      signature: {
        visible: true,
        text: "检测：________    复核：________    日期：____年__月__日",
      },
      footer: {
        visible: true,
        text: "模板编号：" + target.templateId + "    版本：" + target.version,
      },
    };
  }
  function sectionFields(section) {
    return schema[section] && schema[section].fields
      ? schema[section].fields
      : [];
  }
  function source(field) {
    return (
      (target.dataSources || []).find(function (s) {
        return s.field === field;
      }) || { field: field, displayName: field, format: "" }
    );
  }
  function renderLibrary() {
    el("fieldList").innerHTML = (target.dataSources || [])
      .filter(function (s) {
        return s.visible;
      })
      .map(function (s) {
        var used = sectionFields("basic")
          .concat(sectionFields("detail"))
          .some(function (f) {
            return f.field === s.field;
          });
        return (
          '<button data-source="' +
          esc(s.field) +
          '" class="' +
          (used ? "is-used" : "") +
          '"><strong>{' +
          esc(s.displayName) +
          "}</strong><span>" +
          esc(s.sourceObject) +
          " · " +
          esc(s.dataType) +
          "</span></button>"
        );
      })
      .join("");
  }
  function fieldRows(section) {
    return sectionFields(section)
      .map(function (f, index) {
        return (
          '<div class="structure-field ' +
          (selection.type === "field" &&
          selection.section === section &&
          selection.field === f.field
            ? "is-selected"
            : "") +
          '" data-field="' +
          esc(f.field) +
          '" data-section="' +
          section +
          '"><button data-action="select">' +
          esc(f.label) +
          "</button><span>{" +
          esc(f.field) +
          '}</span><div><button data-action="up" title="上移">↑</button><button data-action="down" title="下移">↓</button><button data-action="remove" title="移除">×</button></div></div>'
        );
      })
      .join("");
  }
  function renderStructure() {
    el("basicFields").innerHTML = fieldRows("basic");
    el("detailFields").innerHTML = fieldRows("detail");
    el("basicCount").textContent = sectionFields("basic").length + " 个字段";
    el("detailCount").textContent = sectionFields("detail").length + " 列";
    document.querySelectorAll(".section-item").forEach(function (b) {
      b.classList.toggle(
        "is-selected",
        selection.type === "section" && selection.section === b.dataset.section,
      );
      b.classList.toggle(
        "is-disabled",
        schema[b.dataset.section] && !schema[b.dataset.section].visible,
      );
    });
  }
  function renderProperties() {
    el("noSelection").classList.toggle("is-hidden", !!selection.type);
    el("sectionProperties").classList.toggle(
      "is-hidden",
      selection.type !== "section",
    );
    el("fieldProperties").classList.toggle(
      "is-hidden",
      selection.type !== "field",
    );
    if (selection.type === "section") {
      var s = schema[selection.section],
        names = {
          header: "页眉",
          title: "标题区",
          basic: "基本信息区",
          detail: "明细表",
          notes: "说明区",
          signature: "签字区",
          footer: "页脚",
        };
      el("sectionPropertyTitle").textContent =
        names[selection.section] + "属性";
      el("sectionVisible").value = String(s.visible);
      var canText =
        ["header", "title", "notes", "signature", "footer"].indexOf(selection.section) >=
        0;
      el("sectionTextWrap").classList.toggle("is-hidden", !canText);
      el("sectionText").value = canText ? s.text || "" : "";
      el("sectionDescriptionWrap").classList.toggle(
        "is-hidden",
        selection.section !== "title",
      );
      el("sectionDescription").value =
        selection.section === "title" ? s.description || "" : "";
    }
    if (selection.type === "field") {
      var f = sectionFields(selection.section).find(function (x) {
        return x.field === selection.field;
      });
      if (!f) return;
      el("fieldCode").value = f.field;
      el("fieldLabel").value = f.label;
      el("fieldWidth").value = f.width;
      el("fieldAlign").value = f.align;
      el("fieldFormat").value = f.format || "";
      el("fieldVisible").value = String(f.visible);
    }
  }
  function displaySample(field) {
    return (
      {
        sampleNo: "26S0803001",
        sampleCategoryName: "生活饮用水",
        sampleName: "生活饮用水-01",
        projectName: "铅(Pb)",
        result: "0.012",
        unit: "mg/L",
        experimentTime: "2026-08-03 08:40:12",
        collectTime: "2026-08-03 09:26:18",
        deviceName: "ICP-MS金属元素分析仪",
        fileName: "ICPMS_金属元素检测结果.xlsx",
      }[field] || "示例数据"
    );
  }
  function renderPreview() {
    el("previewHeader").textContent = schema.header.text;
    el("previewHeader").classList.toggle("is-hidden", !schema.header.visible);
    el("previewTitleArea").classList.toggle("is-hidden", !schema.title.visible);
    el("previewTitle").textContent = schema.title.text;
    el("previewDescription").textContent = schema.title.description;
    var basics = sectionFields("basic").filter(function (f) {
      return f.visible;
    });
    el("previewBasic").classList.toggle("is-hidden", !schema.basic.visible);
    el("previewBasic").innerHTML = basics
      .map(function (f) {
        return (
          "<div><span>" +
          esc(f.label) +
          "</span><strong>" +
          esc(displaySample(f.field)) +
          "</strong></div>"
        );
      })
      .join("");
    var details = sectionFields("detail").filter(function (f) {
      return f.visible;
    });
    el("previewDetail").classList.toggle("is-hidden", !schema.detail.visible);
    el("previewHead").innerHTML = details
      .map(function (f) {
        return (
          '<th style="width:' +
          f.width +
          "px;text-align:" +
          f.align +
          '">' +
          esc(f.label) +
          "</th>"
        );
      })
      .join("");
    el("previewRow").innerHTML = details
      .map(function (f) {
        return (
          '<td style="text-align:' +
          f.align +
          '">' +
          esc(displaySample(f.field)) +
          "</td>"
        );
      })
      .join("");
    [
      ["Notes", "notes"],
      ["Signature", "signature"],
      ["Footer", "footer"],
    ].forEach(function (pair) {
      var node = el("preview" + pair[0]),
        s = schema[pair[1]];
      node.textContent = s.text;
      node.classList.toggle("is-hidden", !s.visible);
    });
  }
  function render() {
    renderLibrary();
    renderStructure();
    renderProperties();
    renderPreview();
  }
  function insertField(code) {
    var section = selection.section;
    if (["basic", "detail"].indexOf(section) < 0) {
      toast("请先选择基本信息区或明细表");
      return;
    }
    if (
      sectionFields("basic")
        .concat(sectionFields("detail"))
        .some(function (f) {
          return f.field === code;
        })
    ) {
      toast("该字段已插入模板");
      return;
    }
    var s = source(code);
    schema[section].fields.push({
      field: code,
      label: s.displayName,
      width: 150,
      align: s.dataType === "日期时间" ? "center" : "left",
      format: s.format || "",
      visible: true,
    });
    selection = { type: "field", section: section, field: code };
    render();
  }
  function fieldAction(section, field, action) {
    var list = sectionFields(section),
      i = list.findIndex(function (f) {
        return f.field === field;
      });
    if (i < 0) return;
    if (action === "select")
      selection = { type: "field", section: section, field: field };
    if (action === "remove") {
      list.splice(i, 1);
      selection = { type: "section", section: section, field: "" };
    }
    if (action === "up" && i > 0) {
      var t = list[i - 1];
      list[i - 1] = list[i];
      list[i] = t;
    }
    if (action === "down" && i < list.length - 1) {
      var n = list[i + 1];
      list[i + 1] = list[i];
      list[i] = n;
    }
    render();
  }
  function applySection() {
    if (selection.type !== "section") return;
    var s = schema[selection.section];
    s.visible = el("sectionVisible").value === "true";
    if (
      ["header", "title", "notes", "signature", "footer"].indexOf(selection.section) >= 0
    )
      s.text = el("sectionText").value;
    if (selection.section === "title")
      s.description = el("sectionDescription").value;
    renderStructure();
    renderPreview();
  }
  function applyField() {
    if (selection.type !== "field") return;
    var f = sectionFields(selection.section).find(function (x) {
      return x.field === selection.field;
    });
    if (!f) return;
    f.label = el("fieldLabel").value.trim() || source(f.field).displayName;
    f.width = Math.max(
      60,
      Math.min(500, Number(el("fieldWidth").value) || 150),
    );
    f.align = el("fieldAlign").value;
    f.format = el("fieldFormat").value.trim();
    f.visible = el("fieldVisible").value === "true";
    renderStructure();
    renderLibrary();
    renderPreview();
  }
  function save() {
    schema.title.text = el("previewTitle").textContent;
    target.name = schema.title.text;
    target.description = schema.title.description;
    target.editorSchema = clone(schema);
    var parts = (target.version || "V1.0").replace("V", "").split(".");
    target.version =
      "V" + (Number(parts[0]) || 1) + "." + ((Number(parts[1]) || 0) + 1);
    schema.footer.text =
      "模板编号：" + target.templateId + "    版本：" + target.version;
    target.editorSchema = clone(schema);
    target.updateTime = "2026-08-04 " + new Date().toTimeString().slice(0, 8);
    target.updateUser = "监*一";
    templates = templates.map(function (t) {
      return t.templateId === target.templateId ? target : t;
    });
    mock.setTemplates(templates);
    el("templateVersion").textContent = target.version;
    renderPreview();
    try {
      if (
        global.parent &&
        typeof global.parent.syssjcjSbbgRefresh === "function"
      )
        global.parent.syssjcjSbbgRefresh();
    } catch (e) {}
    toast("模板结构已保存为 " + target.version);
  }
  function bind() {
    el("fieldList").onclick = function (e) {
      var b = e.target.closest("[data-source]");
      if (b) insertField(b.dataset.source);
    };
    document.querySelector(".section-list").onclick = function (e) {
      var action = e.target.closest("[data-action]"),
        row = e.target.closest("[data-field]"),
        section = e.target.closest("[data-section]");
      if (action && row) {
        fieldAction(
          row.dataset.section,
          row.dataset.field,
          action.dataset.action,
        );
        return;
      }
      if (section) {
        selection = {
          type: "section",
          section: section.dataset.section,
          field: "",
        };
        render();
      }
    };
    el("sectionVisible").onchange = applySection;
    el("sectionText").oninput = applySection;
    el("sectionDescription").oninput = applySection;
    [
      "fieldLabel",
      "fieldWidth",
      "fieldAlign",
      "fieldFormat",
      "fieldVisible",
    ].forEach(function (id) {
      el(id).oninput = applyField;
      el(id).onchange = applyField;
    });
    el("previewTitle").onclick = function () {
      selection = { type: "section", section: "title", field: "" };
      render();
    };
    el("save").onclick = save;
    el("download").onclick = function () {
      toast("已根据当前结构模拟生成并下载 " + target.fileName);
    };
  }
  function init() {
    if (typeof global.initGlobalParams === "function")
      global.initGlobalParams();
    templates = mock.getTemplates();
    target = templates.find(function (t) {
      return t.templateId === param("templateId");
    });
    if (!target) {
      el("page").classList.add("is-hidden");
      el("error").classList.remove("is-hidden");
      return;
    }
    schema = target.editorSchema ? clone(target.editorSchema) : defaultSchema();
    el("templateFile").textContent = target.fileName;
    el("templateFile").title = target.fileName;
    el("templateVersion").textContent = target.version;
    selection = { type: "section", section: "detail", field: "" };
    bind();
    render();
  }
  global.addEventListener("load", init);
})(window);
