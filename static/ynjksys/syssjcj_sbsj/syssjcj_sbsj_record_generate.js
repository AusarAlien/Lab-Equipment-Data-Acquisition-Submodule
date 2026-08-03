(function (global) {
  "use strict";
  var CONFIG = { mockMode: true, qids: { generateRecord: "" } },
    mock = global.SyssjcjMockData,
    context = null,
    rows = [],
    targetTemplate = null,
    targetDevice = null;
  function el(id) {
    return document.getElementById(id);
  }
  function find(list, key, value) {
    return (
      list.find(function (item) {
        return item[key] === value;
      }) || null
    );
  }
  function text(id, value) {
    var node = el(id),
      content = value == null || value === "" ? "--" : String(value);
    node.textContent = content;
    node.title = content;
  }
  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>'"]/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      }[c];
    });
  }
  function formatValue(value, format) {
    var textValue = value == null ? "" : String(value), match;
    if (!format) return textValue;
    if (format.indexOf("yyyy-MM-dd") >= 0 && textValue.length >= 10) {
      return format.indexOf("HH:mm:ss") >= 0 ? textValue.slice(0, 19) : textValue.slice(0, 10);
    }
    match = format.match(/^0\.(0+)$/);
    if (match && textValue !== "" && !isNaN(Number(textValue))) return Number(textValue).toFixed(match[1].length);
    return textValue;
  }
  function closePage() {
    if (typeof global.closeModalDialog === "function") {
      global.closeModalDialog();
    }
  }
  function showError() {
    el("pageContent").classList.add("is-hidden");
    el("pageError").classList.remove("is-hidden");
  }
  function load() {
    try {
      context = JSON.parse(
        global.sessionStorage.getItem(mock.keys.generationContext) || "null",
      );
    } catch (error) {
      context = null;
    }
    if (!context) return false;
    var data = mock.getDataRows(),
      templates = mock.getTemplates();
    rows = context.dataIds
      .map(function (id) {
        return find(data, "dataId", id);
      })
      .filter(Boolean);
    targetTemplate = find(templates, "templateId", context.templateId);
    targetDevice = mock.getDevice(context.deviceId);
    return !!(rows.length && targetTemplate && targetDevice);
  }
  function render() {
    var department = mock.getDepartment(targetDevice.departmentId),
      documents = mock.getDocuments(),
      times = rows
        .map(function (row) {
          return row.experimentTime;
        })
        .sort(),
      range = times[0] + " 至 " + times[times.length - 1],
      defaultName = rows[0].sampleName + targetTemplate.name;
    text("templateName", targetTemplate.name);
    text(
      "recordMode",
      context.mode === "样品模式" ? "按单一样品生成" : "按检测项目生成",
    );
    var categoryNames = Array.from(
      new Set(
        rows.map(function (row) {
          return row.sampleCategoryName;
        }),
      ),
    ).join("、");
    text("sampleCategoryName", categoryNames);
    text("departmentName", department.name);
    text("deviceName", targetDevice.name);
    text("experimentRange", range);
    text("dataCount", rows.length + " 条");
    el("recordName").value = defaultName;
    var schema = targetTemplate.editorSchema || null;
    text("paperTitle", schema && schema.title ? schema.title.text : targetTemplate.name);
    text("paperDescription", schema && schema.title ? schema.title.description : targetTemplate.description || "");
    if (schema) {
      text("templateHeader", schema.header ? schema.header.text : "");
      el("templateHeader").classList.toggle("is-hidden", !schema.header || !schema.header.visible);
      el("paperTitle").parentElement.classList.toggle("is-hidden", schema.title && !schema.title.visible);
      text("templateNotes", schema.notes ? schema.notes.text : "");
      el("templateNotes").classList.toggle("is-hidden", !schema.notes || !schema.notes.visible);
      text("templateSignature", schema.signature ? schema.signature.text : "");
      el("templateSignature").classList.toggle("is-hidden", !schema.signature || !schema.signature.visible);
      text("templateFooter", schema.footer ? schema.footer.text : "");
      el("templateFooter").classList.toggle("is-hidden", !schema.footer || !schema.footer.visible);
    }
    text("paperDepartment", department.name);
    text("paperDevice", targetDevice.name);
    text("paperModel", targetDevice.brand + " / " + targetDevice.model);
    text("paperAsset", targetDevice.assetNo);
    text("paperTime", range);
    text("paperTemplate", targetTemplate.name);
    text("paperSampleCategory", categoryNames);
    if (schema && schema.basic) {
      var firstFile = find(documents, "fdiseq", rows[0].fdiseq) || {}, basicValue = function(field){ if(field==="deviceName")return targetDevice.name;if(field==="fileName")return firstFile.fileName;if(field==="collectTime")return firstFile.collectTime;if(field==="experimentTime")return range;return rows[0][field]; };
      el("paperMeta").classList.toggle("is-hidden", !schema.basic.visible);
      el("paperMeta").innerHTML = schema.basic.visible ? schema.basic.fields.filter(function(field){return field.visible}).map(function(field){var value=formatValue(basicValue(field.field),field.format);return '<div title="'+escapeHtml(value)+'">'+escapeHtml(field.label)+'：<strong>'+escapeHtml(value)+'</strong></div>'}).join("") : "";
    }
    var defaultDetailFields = [
          { field: "sampleNo", label: "样品编号" },
          { field: "sampleCategoryName", label: "样品类别" },
          { field: "sampleName", label: "样品名称" },
          { field: "projectName", label: "检测项目" },
          { field: "result", label: "检测结果" },
          { field: "unit", label: "单位" },
          { field: "fileName", label: "数据来源" },
        ];
    var detailFields = schema && schema.detail
      ? (schema.detail.visible ? schema.detail.fields.filter(function (field) { return field.visible; }) : [])
      : defaultDetailFields;
    el("previewHead").innerHTML = '<th>序号</th>' + detailFields.map(function (field) { return '<th title="' + escapeHtml(field.label) + '" style="width:'+escapeHtml(field.width||150)+'px;text-align:'+escapeHtml(field.align||"left")+'">' + escapeHtml(field.label) + '</th>'; }).join("");
    function fieldValue(row, file, field) { if (field === "fileName") return file.fileName; if (field === "collectTime") return file.collectTime; if (field === "deviceName") return targetDevice.name; return row[field]; }
    el("previewRows").innerHTML = rows
      .map(function (row, index) {
        var file = find(documents, "fdiseq", row.fdiseq) || {};
        return "<tr><td>" + (index + 1) + "</td>" + detailFields.map(function (field) { var value = formatValue(fieldValue(row, file, field.field),field.format); return '<td title="' + escapeHtml(value) + '" style="width:'+escapeHtml(field.width||150)+'px;text-align:' + escapeHtml(field.align || "left") + '">' + escapeHtml(value) + '</td>'; }).join("") + "</tr>";
      })
      .join("");
  }
  function submit() {
    var name = el("recordName").value.trim();
    if (!name) {
      el("recordName").focus();
      return;
    }
    el("workingMask").classList.remove("is-hidden");
    el("generateSubmit").disabled = true;
    setTimeout(function () {
      var records = mock.getRecords(),
        times = rows
          .map(function (row) {
            return row.experimentTime;
          })
          .sort(),
        record = {
          recordId: "REC" + Date.now(),
          name: name,
          templateId: targetTemplate.templateId,
          templateVersion: targetTemplate.version,
          editorSchema: targetTemplate.editorSchema || null,
          mode: context.mode,
          departmentId: targetDevice.departmentId,
          deviceId: targetDevice.deviceId,
          dataIds: rows.map(function (row) {
            return row.dataId;
          }),
          sampleCategories: Array.from(
            new Set(
              rows.map(function (row) {
                return row.sampleCategory;
              }),
            ),
          ),
          sampleCount: Array.from(
            new Set(
              rows.map(function (row) {
                return row.sampleNo;
              }),
            ),
          ).length,
          projectCount: Array.from(
            new Set(
              rows.map(function (row) {
                return row.projectName;
              }),
            ),
          ).length,
          experimentRange: times[0] + " 至 " + times[times.length - 1],
          createTime: "2026-08-04 " + new Date().toTimeString().slice(0, 8),
          creator: "监*一",
        };
      records.unshift(record);
      mock.setRecords(records);
      global.sessionStorage.removeItem(mock.keys.generationContext);
      try {
        if (
          global.parent &&
          typeof global.parent.syssjcjSbsjRefresh === "function"
        )
          global.parent.syssjcjSbsjRefresh();
      } catch (error) {}
      el("workingMask").classList.add("is-hidden");
      closePage();
    }, 1200);
  }
  function init() {
    if (typeof global.initGlobalParams === "function")
      global.initGlobalParams();
    if (!mock || !load()) {
      showError();
      return;
    }
    render();
    el("generateSubmit").onclick = submit;
  }
  global.addEventListener("load", init);
})(window);
