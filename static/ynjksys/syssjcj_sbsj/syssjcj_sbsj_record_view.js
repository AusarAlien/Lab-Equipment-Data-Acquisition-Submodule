(function (global) {
  "use strict";
  var mock = global.SyssjcjMockData;
  function el(id) {
    return document.getElementById(id);
  }
  function param(name) {
    return new URLSearchParams(global.location.search).get(name) || "";
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
  function formatValue(value, format) { var textValue=value==null?"":String(value),match;if(!format)return textValue;if(format.indexOf("yyyy-MM-dd")>=0&&textValue.length>=10)return format.indexOf("HH:mm:ss")>=0?textValue.slice(0,19):textValue.slice(0,10);match=format.match(/^0\.(0+)$/);if(match&&textValue!==""&&!isNaN(Number(textValue)))return Number(textValue).toFixed(match[1].length);return textValue; }
  function showError() {
    el("recordPage").classList.add("is-hidden");
    el("pageError").classList.remove("is-hidden");
  }
  function render(record) {
    var template = find(mock.getTemplates(), "templateId", record.templateId),
      device = mock.getDevice(record.deviceId),
      department = mock.getDepartment(record.departmentId),
      data = mock.getDataRows(),
      documents = mock.getDocuments(),
      rows = record.dataIds
        .map(function (id) {
          return find(data, "dataId", id);
        })
        .filter(Boolean);
    text("recordId", record.recordId);
    text("templateName", template.name);
    text("createTime", record.createTime);
    text("creator", record.creator);
    text("recordTitle", record.name);
    text("departmentName", department.name);
    text("deviceName", device.name);
    text("deviceModel", device.brand + " / " + device.model);
    text("assetNo", device.assetNo);
    text(
      "recordMode",
      record.mode === "样品模式" ? "按单一样品生成" : "按检测项目生成",
    );
    text(
      "sampleCategoryName",
      Array.from(
        new Set(
          rows.map(function (row) {
            return row.sampleCategoryName;
          }),
        ),
      ).join("、"),
    );
    text("experimentRange", record.experimentRange);
    text("footerCreator", "记录生成：" + record.creator);
    text("footerTime", "生成时间：" + record.createTime);
    var schema=record.editorSchema;
    if(schema){text("recordTitle",schema.title?schema.title.text:record.name);text("recordDescription",schema.title?schema.title.description:"");el("recordTitle").parentElement.classList.toggle("is-hidden",schema.title&&!schema.title.visible);text("templateHeader",schema.header?schema.header.text:"");el("templateHeader").classList.toggle("is-hidden",!schema.header||!schema.header.visible);text("templateNotes",schema.notes?schema.notes.text:"");el("templateNotes").classList.toggle("is-hidden",!schema.notes||!schema.notes.visible);text("templateSignature",schema.signature?schema.signature.text:"");el("templateSignature").classList.toggle("is-hidden",!schema.signature||!schema.signature.visible);text("templateFooter",schema.footer?schema.footer.text:"");el("templateFooter").classList.toggle("is-hidden",!schema.footer||!schema.footer.visible);if(schema.basic){var firstFile=find(documents,"fdiseq",rows[0].fdiseq)||{},basicValue=function(field){if(field==="deviceName")return device.name;if(field==="fileName")return firstFile.fileName;if(field==="collectTime")return firstFile.collectTime;if(field==="experimentTime")return record.experimentRange;return rows[0][field]};el("paperMeta").classList.toggle("is-hidden",!schema.basic.visible);el("paperMeta").innerHTML=schema.basic.visible?schema.basic.fields.filter(function(field){return field.visible}).map(function(field){var value=formatValue(basicValue(field.field),field.format);return '<div title="'+escapeHtml(value)+'">'+escapeHtml(field.label)+'：<strong>'+escapeHtml(value)+'</strong></div>'}).join(""):""}}
    var defaultFields = [{field:"sampleNo",label:"样品编号"},{field:"sampleCategoryName",label:"样品类别"},{field:"sampleName",label:"样品名称"},{field:"projectName",label:"检测项目"},{field:"result",label:"检测结果"},{field:"unit",label:"单位"},{field:"fileName",label:"来源文件"},{field:"collectTime",label:"采集时间"}], fields = schema && schema.detail ? (schema.detail.visible ? schema.detail.fields.filter(function(field){return field.visible}) : []) : defaultFields;
    el("recordHead").innerHTML = '<th>序号</th>' + fields.map(function(field){return '<th title="'+escapeHtml(field.label)+'" style="width:'+escapeHtml(field.width||150)+'px;text-align:'+escapeHtml(field.align||"left")+'">'+escapeHtml(field.label)+'</th>'}).join("");
    function fieldValue(row,file,field){if(field==="fileName")return file.fileName;if(field==="collectTime")return file.collectTime;if(field==="deviceName")return device.name;return row[field]}
    el("recordDataRows").innerHTML = rows
      .map(function (row, index) {
        var file = find(documents, "fdiseq", row.fdiseq) || {};
        return "<tr><td>"+(index+1)+"</td>"+fields.map(function(field){var value=formatValue(fieldValue(row,file,field.field),field.format);return '<td title="'+escapeHtml(value)+'" style="width:'+escapeHtml(field.width||150)+'px;text-align:'+escapeHtml(field.align||"left")+'">'+escapeHtml(value)+'</td>'}).join("")+"</tr>";
      })
      .join("");
  }
  function init() {
    if (typeof global.initGlobalParams === "function")
      global.initGlobalParams();
    if (!mock) {
      showError();
      return;
    }
    var record = find(mock.getRecords(), "recordId", param("recordId"));
    if (!record) {
      showError();
      return;
    }
    render(record);
  }
  global.addEventListener("load", init);
})(window);
