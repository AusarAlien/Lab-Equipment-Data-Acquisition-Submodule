(function (global) {
  "use strict";

  var CONFIG = {
      mockMode: false,
      defaultDbnm: "ynjk",
      qids: {
        recordDetail: "ynjksys_03008q",
        recordRows: "ynjksys_03009q",
        deviceOptions: "ynjksys_03002q",
      },
    },
    mock = global.SyssjcjMockData;

  function el(id) {
    return document.getElementById(id);
  }
  function param(name) {
    return new URLSearchParams(global.location.search).get(name) || "";
  }
  function find(list, key, value) {
    return (
      list.find(function (item) {
        return String(item[key]) === String(value);
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
    var textValue = value == null ? "" : String(value),
      match;
    if (!format) return textValue;
    if (format.indexOf("yyyy-MM-dd") >= 0 && textValue.length >= 10) {
      return format.indexOf("HH:mm:ss") >= 0
        ? textValue.slice(0, 19)
        : textValue.slice(0, 10);
    }
    match = format.match(/^0\.(0+)$/);
    if (match && textValue !== "" && !isNaN(Number(textValue))) {
      return Number(textValue).toFixed(match[1].length);
    }
    return textValue;
  }
  function rowsFromResult(result) {
    if (!result || !Array.isArray(result.data)) return [];
    if (!result.data.length || !Array.isArray(result.data[0])) return result.data;
    if (
      global.isqrydata &&
      typeof global.isqrydata.convertDataToObject === "function"
    ) {
      return global.isqrydata.convertDataToObject(
        result.data,
        result.title || [],
      );
    }
    return result.data.map(function (values) {
      var row = {};
      (result.title || []).forEach(function (title, index) {
        row[title] = values[index];
      });
      return row;
    });
  }
  function commonParams() {
    var params =
      typeof global.buildCommonParams === "function"
        ? global.buildCommonParams() || {}
        : {};
    params.hp = params.hp || "ynjksys";
    if (!params.dbnm || /^(none|null|undefined)$/i.test(String(params.dbnm))) {
      params.dbnm = CONFIG.defaultDbnm;
    }
    return params;
  }
  function queryPlatform(qid, businessParams) {
    return new Promise(function (resolve, reject) {
      if (!global.isqrydata || typeof global.isqrydata.query !== "function") {
        reject(new Error("平台查询组件 isqrydata.js 未加载"));
        return;
      }
      var data = commonParams();
      Object.keys(businessParams || {}).forEach(function (key) {
        data[key] = businessParams[key];
      });
      global.isqrydata.query({
        qid: qid,
        data: data,
        successCallback: resolve,
        errorCallback: reject,
      });
    });
  }
  function showError(message) {
    el("recordPage").classList.add("is-hidden");
    el("pageError").textContent = message || "未找到对应的原始记录";
    el("pageError").classList.remove("is-hidden");
  }
  function safeJson(value) {
    if (!value || typeof value === "object") return value || null;
    try {
      return JSON.parse(value);
    } catch (error) {
      return null;
    }
  }
  function safeDecode(value) {
    var source = String(value == null ? "" : value).replace(/\+/g, "%20");
    try {
      return decodeURIComponent(source);
    } catch (error) {
      return String(value == null ? "" : value);
    }
  }
  function modeName(mode) {
    return {
      FILE: "按来源文件生成",
      SAMPLE: "按样品生成",
      ITEM: "按检测项目生成",
      来源文件模式: "按来源文件生成",
      样品模式: "按样品生成",
      项目模式: "按检测项目生成",
    }[mode] || mode || "--";
  }
  function loadActual(recordGuid) {
    return Promise.all([
      queryPlatform(CONFIG.qids.recordDetail, {
        record_guid_sql_equal: recordGuid,
      }).then(rowsFromResult),
      queryPlatform(CONFIG.qids.recordRows, {
        record_guid_sql_equal: recordGuid,
      }).then(rowsFromResult),
      queryPlatform(CONFIG.qids.deviceOptions, {}).then(rowsFromResult),
    ]).then(function (results) {
      if (!results[0].length) throw new Error("原始记录不存在或无权查看");
      var source = results[0][0],
        snapshot = safeJson(source["模板快照"]) || {},
        instno = String(source["仪器编号"] || ""),
        deviceSource = results[2].find(function (row) {
          return String(row["仪器编号"] || "") === instno;
        }) || {},
        rows = results[1].map(function (row) {
          return {
            dataId: String(row["来源数据标识"] || ""),
            fdiseq: String(row["来源文件序号"] || ""),
            sampleSeq: row["来源样品序号"] || "",
            sampleNo: row["样品编号"] || row["来源样品编号"] || "--",
            sampleName: row["样品名称"] || "--",
            sampleCategory: row["样品类别编号"] || "",
            sampleCategoryName: row["样品类别"] || "--",
            projectCode: row["检测项目编号"] || row["来源项目编号"] || "",
            projectName: row["检测项目"] || "--",
            result: row["检测结果"] == null ? "--" : row["检测结果"],
            result1: row["结果1"],
            result2: row["结果2"],
            result3: row["结果3"],
            result4: row["结果4"],
            result5: row["结果5"],
            result6: row["结果6"],
            resultDescription: row["结果说明"],
            unit: row["单位"] || "--",
            fileName: safeDecode(row["来源文件"] || ""),
            collectTime: row["采集时间"] || "--",
            experimentTime: row["数据入库时间"] || "--",
            deviceName: source["仪器设备"] || "--",
          };
        });
      return {
        recordId: String(source["原始记录标识"] || ""),
        recordNo: source["原始记录编号"] || "--",
        name: source["原始记录名称"] || "--",
        templateId: String(source["模板编号"] || ""),
        templateName: source["模板名称"] || "--",
        templateVersion: source["模板版本"] || "",
        editorSchema: snapshot.editorSchema || null,
        mode: source["生成方式代码"] || "",
        departmentId: String(source["部门编号"] || ""),
        departmentName: source["部门名称"] || "--",
        deviceId: instno,
        device: {
          deviceId: instno,
          instno: instno,
          name: source["仪器设备"] || "--",
          brand: deviceSource["品牌"] || "",
          model: deviceSource["型号"] || "",
          assetNo: deviceSource["固定资产编号"] || "",
        },
        experimentRange:
          (source["实验开始时间"] || "--") +
          " 至 " +
          (source["实验结束时间"] || "--"),
        createTime: source["生成时间"] || "--",
        creator: source["生成人"] || source["生成人账号"] || "--",
        dataRows: rows,
      };
    });
  }
  function loadMock(recordId) {
    if (!mock) return null;
    var record = find(mock.getRecords(), "recordId", recordId);
    if (!record) return null;
    var data = mock.getDataRows(),
      device = record.device || mock.getDevice(record.deviceId) || {};
    record.dataRows =
      record.dataRows ||
      record.dataIds
        .map(function (id) {
          return find(data, "dataId", id);
        })
        .filter(Boolean);
    record.device = device;
    record.departmentName =
      record.departmentName || (mock.getDepartment(record.departmentId) || {}).name;
    record.templateName =
      record.templateName ||
      (find(mock.getTemplates(), "templateId", record.templateId) || {}).name;
    return record;
  }
  function render(record) {
    var rows = record.dataRows || [],
      device = record.device || {},
      schema = record.editorSchema || null,
      categories = Array.from(
        new Set(
          rows.map(function (row) {
            return row.sampleCategoryName;
          }),
        ),
      ).filter(Boolean);
    text("recordId", record.recordNo || record.recordId);
    text("templateName", record.templateName);
    text("createTime", record.createTime);
    text("creator", record.creator);
    text("recordTitle", record.name);
    text("departmentName", record.departmentName);
    text("deviceName", device.name);
    text("deviceModel", [device.brand, device.model].filter(Boolean).join(" / "));
    text("assetNo", device.assetNo);
    text("recordMode", modeName(record.mode));
    text("sampleCategoryName", categories.join("、"));
    text("experimentRange", record.experimentRange);
    text("footerCreator", "记录生成：" + record.creator);
    text("footerTime", "生成时间：" + record.createTime);
    if (schema) {
      text("recordTitle", schema.title ? schema.title.text : record.name);
      text(
        "recordDescription",
        schema.title ? schema.title.description : "",
      );
      el("recordTitle").parentElement.classList.toggle(
        "is-hidden",
        schema.title && !schema.title.visible,
      );
      text("templateHeader", schema.header ? schema.header.text : "");
      el("templateHeader").classList.toggle(
        "is-hidden",
        !schema.header || !schema.header.visible,
      );
      text("templateNotes", schema.notes ? schema.notes.text : "");
      el("templateNotes").classList.toggle(
        "is-hidden",
        !schema.notes || !schema.notes.visible,
      );
      text("templateSignature", schema.signature ? schema.signature.text : "");
      el("templateSignature").classList.toggle(
        "is-hidden",
        !schema.signature || !schema.signature.visible,
      );
      text("templateFooter", schema.footer ? schema.footer.text : "");
      el("templateFooter").classList.toggle(
        "is-hidden",
        !schema.footer || !schema.footer.visible,
      );
      if (schema.basic && rows.length) {
        function basicValue(field) {
          if (field === "deviceName") return device.name;
          if (field === "fileName") return rows[0].fileName;
          if (field === "collectTime") return rows[0].collectTime;
          if (field === "experimentTime") return record.experimentRange;
          return rows[0][field];
        }
        el("paperMeta").classList.toggle("is-hidden", !schema.basic.visible);
        el("paperMeta").innerHTML = schema.basic.visible
          ? schema.basic.fields
              .filter(function (field) {
                return field.visible;
              })
              .map(function (field) {
                var value = formatValue(basicValue(field.field), field.format);
                return (
                  '<div title="' +
                  escapeHtml(value) +
                  '">' +
                  escapeHtml(field.label) +
                  '：<strong>' +
                  escapeHtml(value) +
                  "</strong></div>"
                );
              })
              .join("")
          : "";
      }
    }
    var defaultFields = [
        { field: "sampleNo", label: "样品编号" },
        { field: "sampleCategoryName", label: "样品类别" },
        { field: "projectName", label: "检测项目" },
        { field: "result", label: "检测结果" },
        { field: "unit", label: "单位" },
        { field: "fileName", label: "来源文件" },
        { field: "collectTime", label: "采集时间" },
      ],
      fields =
        schema && schema.detail
          ? schema.detail.visible
            ? schema.detail.fields.filter(function (field) {
                return field.visible;
              })
            : []
          : defaultFields;
    el("recordHead").innerHTML =
      "<th>序号</th>" +
      fields
        .map(function (field) {
          return (
            '<th title="' +
            escapeHtml(field.label) +
            '" style="width:' +
            escapeHtml(field.width || 150) +
            'px;text-align:' +
            escapeHtml(field.align || "left") +
            '">' +
            escapeHtml(field.label) +
            "</th>"
          );
        })
        .join("");
    el("recordDataRows").innerHTML = rows
      .map(function (row, index) {
        return (
          "<tr><td>" +
          (index + 1) +
          "</td>" +
          fields
            .map(function (field) {
              var value =
                field.field === "deviceName"
                  ? device.name
                  : formatValue(row[field.field], field.format);
              return (
                '<td title="' +
                escapeHtml(value) +
                '" style="width:' +
                escapeHtml(field.width || 150) +
                'px;text-align:' +
                escapeHtml(field.align || "left") +
                '">' +
                escapeHtml(value) +
                "</td>"
              );
            })
            .join("") +
          "</tr>"
        );
      })
      .join("");
  }
  function init() {
    if (typeof global.initGlobalParams === "function") {
      global.initGlobalParams();
    }
    var recordId = param("recordId");
    if (!recordId) {
      showError();
      return;
    }
    if (CONFIG.mockMode) {
      var mockRecord = loadMock(recordId);
      if (!mockRecord) showError();
      else render(mockRecord);
      return;
    }
    loadActual(recordId)
      .then(render)
      .catch(function (error) {
        console.error("原始记录详情查询失败：", error);
        showError(error.message || "原始记录详情查询失败");
      });
  }

  global.addEventListener("load", init);
})(window);
