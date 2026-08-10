(function (global) {
  "use strict";

  var CONFIG = {
      mockMode: false,
      defaultDbnm: "ynjk",
      qids: {
        sampleCategoryOptions: "ynjksys_03004q",
        templateOptions: "ynjksys_03005q",
        generateRecord: "ynjksys_03006q",
      },
    },
    mock = global.SyssjcjMockData,
    context = null,
    rows = [],
    sampleCategories = [],
    templates = [],
    targetTemplate = null,
    targetDevice = null,
    lastAutoName = "";

  function el(id) {
    return document.getElementById(id);
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
  function option(value, label) {
    return (
      '<option value="' +
      escapeHtml(value) +
      '" title="' +
      escapeHtml(label) +
      '">' +
      escapeHtml(label) +
      "</option>"
    );
  }
  function unique(values) {
    return Array.from(new Set(values.filter(Boolean)));
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
  function getSInfo() {
    var current = global.parent,
      depth = 0;
    while (current && depth < 5) {
      try {
        if (
          current.reEcdtJ &&
          current.reEcdtJ.sInfo
        ) {
          return current.reEcdtJ.sInfo;
        }
        if (!current.parent || current.parent === current) break;
        current = current.parent;
      } catch (error) {
        break;
      }
      depth += 1;
    }
    return {};
  }
  function currentOperator() {
    var sInfo = getSInfo(),
      empId = String(sInfo.empId || sInfo.opNo || "").trim(),
      userName = String(sInfo.empNm || "").trim();
    return {
      empId: empId,
      userName: userName,
    };
  }
  function queryPlatform(qid) {
    return new Promise(function (resolve, reject) {
      if (!global.isqrydata || typeof global.isqrydata.query !== "function") {
        reject(new Error("平台查询组件 isqrydata.js 未加载"));
        return;
      }
      global.isqrydata.query({
        qid: qid,
        data: commonParams(),
        successCallback: resolve,
        errorCallback: reject,
      });
    });
  }
  function normalizeSubmitResult(result) {
    var target = result;
    for (var depth = 0; depth < 4; depth += 1) {
      if (typeof target === "string") {
        try {
          target = JSON.parse(target);
          continue;
        } catch (error) {
          return { success: false, message: target };
        }
      }
      if (target && target["处理结果"]) {
        target = target["处理结果"];
        continue;
      }
      if (target && Array.isArray(target.data) && target.data.length) {
        target = Array.isArray(target.data[0])
          ? target.data[0][0]
          : target.data[0];
        continue;
      }
      if (
        target &&
        typeof target.message === "string" &&
        /^\s*\{/.test(target.message)
      ) {
        try {
          target = JSON.parse(target.message);
          continue;
        } catch (ignored) {}
      }
      break;
    }
    return target || { success: false, message: "数据库未返回处理结果" };
  }
  function generateModeCode(mode) {
    return {
      来源文件模式: "FILE",
      样品模式: "SAMPLE",
      项目模式: "ITEM",
    }[mode] || "";
  }
  function submitPlatform(data, operator) {
    return new Promise(function (resolve, reject) {
      if (!global.issubmit || typeof global.issubmit.add !== "function") {
        reject(new Error("平台提交组件 issubmit.js 未加载"));
        return;
      }
      global.issubmit.add({
        qid: CONFIG.qids.generateRecord,
        isSaveBusiJson: "否",
        data: data,
        urlParams: {
          empid_sql_equal: operator.empId,
          empnm_sql_equal: operator.userName,
        },
        successCallback: function (result) {
          var normalized = normalizeSubmitResult(result);
          if (normalized.success === true) {
            resolve(normalized);
          } else {
            reject(new Error(normalized.message || "原始记录入库失败"));
          }
        },
        errorCallback: function (error) {
          reject(
            error instanceof Error ? error : new Error("原始记录入库失败"),
          );
        },
      });
    });
  }
  function closePage() {
    if (typeof global.closeModalDialog === "function") {
      global.closeModalDialog();
    }
  }
  function showToast(message) {
    var toast = el("toast");
    toast.textContent = message;
    toast.classList.remove("is-hidden");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(function () {
      toast.classList.add("is-hidden");
    }, 2400);
  }
  function showError(message) {
    el("pageContent").classList.add("is-hidden");
    el("pageError").textContent = message || "生成数据不存在或已失效";
    el("pageError").classList.remove("is-hidden");
  }
  function loadContext() {
    var key =
      mock && mock.keys
        ? mock.keys.generationContext
        : "syssjcj_mock_generation_context_v1";
    try {
      context = JSON.parse(global.sessionStorage.getItem(key) || "null");
    } catch (error) {
      context = null;
    }
    if (!context) return false;
    rows = Array.isArray(context.rows) ? context.rows.filter(Boolean) : [];
    if (!rows.length && mock && Array.isArray(context.dataIds)) {
      var mockRows = mock.getDataRows();
      rows = context.dataIds
        .map(function (id) {
          return find(mockRows, "dataId", id);
        })
        .filter(Boolean);
    }
    targetDevice = context.device || null;
    if (!targetDevice && mock) targetDevice = mock.getDevice(context.deviceId);
    if (!targetDevice && rows.length) {
      targetDevice = {
        deviceId: rows[0].deviceId,
        instno: rows[0].instno || rows[0].deviceId,
        name: rows[0].deviceName,
        departmentId: rows[0].departmentId,
        departmentName: rows[0].departmentName,
      };
    }
    return !!(rows.length && targetDevice);
  }
  function mockCategoryDictionary() {
    if (!mock) return [];
    var seen = {};
    return mock
      .getDataRows()
      .filter(function (row) {
        if (!row.sampleCategory || seen[row.sampleCategory]) return false;
        seen[row.sampleCategory] = true;
        return true;
      })
      .map(function (row) {
        return {
          categoryId: row.sampleCategory,
          name: row.sampleCategoryName,
          groupName: "样品类别",
        };
      });
  }
  function normalizeDictionaries(categoryRows, templateRows) {
    var mockTemplates = mock ? mock.getTemplates() : [];
    sampleCategories = categoryRows.map(function (row) {
      return {
        categoryId: String(row["类别编号"] || row.categoryId || ""),
        name: row["类别名称"] || row.name || "--",
        groupName: row["类别分组"] || row.groupName || "其他",
      };
    });
    templates = templateRows.map(function (row) {
      var templateId = String(row["模板编号"] || row.templateId || ""),
        instno = String(row["仪器编号"] || ""),
        fallback = find(mockTemplates, "templateId", templateId) || {},
        categoryText = String(row["适用样品类别"] || ""),
        defaultMode =
          row["默认组织规则"] ||
          row["组织规则"] ||
          row.defaultMode ||
          row.mode ||
          "样品模式",
        allowedText = String(row["允许组织规则"] || ""),
        allowedModes = allowedText
          ? allowedText.split(",").filter(Boolean)
          : row.allowedModes || [defaultMode];
      if (templateId === "TPL-HPLC-01" && !allowedText && !row.allowedModes) {
        defaultMode = "来源文件模式";
        allowedModes = ["来源文件模式", "样品模式", "项目模式"];
      }
      if (
        templateId === "TPL-BRUKER-01" &&
        !allowedText &&
        !row.allowedModes
      ) {
        defaultMode = "样品模式";
        allowedModes = ["来源文件模式", "样品模式"];
      }
      return {
        templateId: templateId,
        name: row["模板名称"] || row.name || "--",
        mode: defaultMode,
        defaultMode: defaultMode,
        allowedModes: allowedModes,
        departmentId: String(row["部门编号"] || row.departmentId || ""),
        deviceTypes: instno ? [instno] : row.deviceTypes || [],
        sampleCategories: categoryText
          ? categoryText.split(",").filter(Boolean)
          : row.sampleCategories || [],
        version: row["模板版本"] || row.version || "",
        description: fallback.description || row.description || "",
        editorSchema: fallback.editorSchema || row.editorSchema || null,
        status: "启用",
      };
    });
  }
  function loadDictionaries() {
    if (CONFIG.mockMode) {
      normalizeDictionaries(mockCategoryDictionary(), mock.getTemplates());
      return Promise.resolve();
    }
    return Promise.all([
      queryPlatform(CONFIG.qids.sampleCategoryOptions).then(rowsFromResult),
      queryPlatform(CONFIG.qids.templateOptions).then(rowsFromResult),
    ])
      .then(function (results) {
        normalizeDictionaries(results[0], results[1]);
      })
      .catch(function (error) {
        console.error("原始记录生成约束词典加载失败：", error);
        if (mock) {
          normalizeDictionaries(mockCategoryDictionary(), mock.getTemplates());
          showToast("词典暂未连接，当前使用演示配置");
          return;
        }
        throw error;
      });
  }
  function populateCategories() {
    var groups = {};
    sampleCategories.forEach(function (item) {
      var groupName = item.groupName || "其他";
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(item);
    });
    var html = '<option value="">请选择样品类别</option>';
    Object.keys(groups).forEach(function (groupName) {
      html += '<optgroup label="' + escapeHtml(groupName) + '">';
      html += groups[groupName]
        .map(function (item) {
          return option(item.categoryId, item.name);
        })
        .join("");
      html += "</optgroup>";
    });
    el("sampleCategorySelect").innerHTML = html;
  }
  function templateSupportsDevice(item) {
    var instno = String(targetDevice.instno || targetDevice.deviceId || "");
    return (
      !item.deviceTypes.length ||
      item.deviceTypes.some(function (value) {
        return String(value).toUpperCase() === instno.toUpperCase();
      })
    );
  }
  function populateTemplates() {
    var categoryId = el("sampleCategorySelect").value,
      list = templates.filter(function (item) {
        return (
          item.status === "启用" &&
          templateSupportsDevice(item) &&
          (!categoryId || item.sampleCategories.indexOf(categoryId) >= 0)
        );
      });
    el("templateSelect").innerHTML =
      '<option value="">' +
      (categoryId ? "请选择原始记录模板" : "请先选择样品类别") +
      "</option>" +
      list
        .map(function (item) {
          return option(item.templateId, item.name + (item.version ? " / " + item.version : ""));
        })
        .join("");
    el("templateSelect").disabled = !categoryId;
    targetTemplate = null;
    el("recordModeSelect").innerHTML =
      '<option value="">请先选择原始记录模板</option>';
    el("recordModeSelect").disabled = true;
    validateConstraints();
  }
  function modeLabel(mode) {
    return {
      来源文件模式: "按来源文件生成",
      样品模式: "按样品生成",
      项目模式: "按检测项目生成",
    }[mode] || mode;
  }
  function populateModes() {
    targetTemplate = find(templates, "templateId", el("templateSelect").value);
    if (!targetTemplate) {
      el("recordModeSelect").innerHTML =
        '<option value="">请先选择原始记录模板</option>';
      el("recordModeSelect").disabled = true;
      validateConstraints();
      return;
    }
    var modes = targetTemplate.allowedModes || [targetTemplate.defaultMode],
      defaultMode = targetTemplate.defaultMode || modes[0];
    el("recordModeSelect").innerHTML = modes
      .map(function (mode) {
        return option(mode, modeLabel(mode));
      })
      .join("");
    el("recordModeSelect").disabled = false;
    el("recordModeSelect").value =
      modes.indexOf(defaultMode) >= 0 ? defaultMode : modes[0];
    validateConstraints();
  }
  function validateConstraints() {
    var categoryId = el("sampleCategorySelect").value,
      templateId = el("templateSelect").value,
      selectedMode = el("recordModeSelect").value,
      message = "",
      valid = false;
    targetTemplate = find(templates, "templateId", templateId);
    if (!categoryId) {
      message = "请选择样品类别。";
    } else if (!targetTemplate) {
      message = "请选择适用于当前仪器和样品类别的原始记录模板。";
    } else if (!templateSupportsDevice(targetTemplate)) {
      message = "所选模板不适用于当前仪器设备。";
    } else if (targetTemplate.sampleCategories.indexOf(categoryId) < 0) {
      message = "所选模板不适用于当前样品类别。";
    } else if (!selectedMode) {
      message = "请选择记录生成方式。";
    } else if (
      selectedMode === "来源文件模式" &&
      unique(
        rows.map(function (row) {
          return row.fdiseq;
        }),
      ).length > 1
    ) {
      message = "按来源文件生成时，只能选择同一个来源文件的数据。";
    } else if (
      selectedMode === "样品模式" &&
      unique(
        rows.map(function (row) {
          return row.sampleNo;
        }),
      ).length > 1
    ) {
      message = "该模板按单一样品生成，请返回列表调整为同一样品编号的数据。";
    } else if (
      selectedMode === "项目模式" &&
      unique(
        rows.map(function (row) {
          return row.projectName;
        }),
      ).length > 1
    ) {
      message = "该模板按检测项目生成，请返回列表调整为同一检测项目的数据。";
    } else {
      message = "所选数据符合“" + modeLabel(selectedMode) + "”规则，可以生成原始记录。";
      valid = true;
    }
    el("constraintMessage").textContent = message;
    el("constraintMessage").classList.toggle("is-valid", valid);
    el("constraintMessage").classList.toggle(
      "is-error",
      !!categoryId && !!templateId && !valid,
    );
    el("generateSubmit").disabled = !valid;
    if (targetTemplate) renderPreview();
    return valid;
  }
  function experimentRange() {
    var times = rows
      .map(function (row) {
        return row.experimentTime;
      })
      .filter(Boolean)
      .sort();
    return times.length ? times[0] + " 至 " + times[times.length - 1] : "--";
  }
  function selectedCategory() {
    return find(
      sampleCategories,
      "categoryId",
      el("sampleCategorySelect").value,
    );
  }
  function renderBaseInfo() {
    text(
      "departmentName",
      targetDevice.departmentName || rows[0].departmentName || "--",
    );
    text("deviceName", targetDevice.name || rows[0].deviceName || "--");
    text("experimentRange", experimentRange());
    text("dataCount", rows.length + " 条");
  }
  function rowFile(row) {
    if (row.fileName || row.collectTime) return row;
    if (!mock) return {};
    return find(mock.getDocuments(), "fdiseq", row.fdiseq) || {};
  }
  function renderPreview() {
    var category = selectedCategory() || {},
      schema = targetTemplate.editorSchema || null,
      operator = currentOperator(),
      range = experimentRange(),
      selectedMode = el("recordModeSelect").value,
      namePrefix =
        selectedMode === "来源文件模式"
          ? (rowFile(rows[0]).fileName || rows[0].fdiseq)
          : selectedMode === "样品模式"
            ? rows[0].sampleNo
            : rows[0].projectName,
      defaultName =
        namePrefix +
        "_" +
        targetTemplate.name;
    if (
      !el("recordName").value.trim() ||
      el("recordName").value === lastAutoName
    ) {
      el("recordName").value = defaultName;
    }
    lastAutoName = defaultName;
    text(
      "paperTitle",
      schema && schema.title ? schema.title.text : targetTemplate.name,
    );
    text(
      "paperDescription",
      schema && schema.title
        ? schema.title.description
        : targetTemplate.description || "",
    );
    text("paperDepartment", targetDevice.departmentName || rows[0].departmentName);
    text("paperDevice", targetDevice.name || rows[0].deviceName);
    text(
      "paperModel",
      [targetDevice.brand, targetDevice.model].filter(Boolean).join(" / "),
    );
    text("paperAsset", targetDevice.assetNo);
    text("paperTime", range);
    text("paperTemplate", targetTemplate.name);
    text("paperSampleCategory", category.name);
    text("templateHeader", schema && schema.header ? schema.header.text : "");
    el("templateHeader").classList.toggle(
      "is-hidden",
      !schema || !schema.header || !schema.header.visible,
    );
    el("paperTitle").parentElement.classList.toggle(
      "is-hidden",
      !!(schema && schema.title && !schema.title.visible),
    );
    text("templateNotes", schema && schema.notes ? schema.notes.text : "");
    el("templateNotes").classList.toggle(
      "is-hidden",
      !schema || !schema.notes || !schema.notes.visible,
    );
    text(
      "templateSignature",
      schema && schema.signature ? schema.signature.text : "",
    );
    el("templateSignature").classList.toggle(
      "is-hidden",
      !schema || !schema.signature || !schema.signature.visible,
    );
    if (schema && schema.footer) {
      text("templateFooter", schema.footer.text);
      el("templateFooter").classList.toggle("is-hidden", !schema.footer.visible);
    } else {
      el("templateFooter").classList.remove("is-hidden");
      el("templateFooter").innerHTML =
        "<span>记录生成：" +
        escapeHtml(operator.userName || operator.empId || "--") +
        "</span><span>生成时间：系统生成</span><span>复核：________</span>";
    }
    var defaultFields = [
        { field: "sampleNo", label: "样品编号" },
        { field: "projectName", label: "检测项目" },
        { field: "result", label: "检测结果" },
        { field: "unit", label: "单位" },
        { field: "fileName", label: "数据来源" },
      ],
      detailFields =
        schema && schema.detail
          ? schema.detail.visible
            ? schema.detail.fields.filter(function (field) {
                return field.visible;
              })
            : []
          : defaultFields;
    el("previewHead").innerHTML =
      "<th>序号</th>" +
      detailFields
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
    el("previewRows").innerHTML = rows
      .map(function (row, index) {
        var file = rowFile(row);
        row.sampleCategory = category.categoryId;
        row.sampleCategoryName = category.name;
        return (
          "<tr><td>" +
          (index + 1) +
          "</td>" +
          detailFields
            .map(function (field) {
              var value =
                field.field === "fileName"
                  ? file.fileName
                  : field.field === "collectTime"
                    ? file.collectTime
                    : field.field === "deviceName"
                      ? targetDevice.name || row.deviceName
                      : row[field.field];
              value = formatValue(value, field.format);
              return (
                '<td title="' +
                escapeHtml(value) +
                '" style="text-align:' +
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
  function submit() {
    var name = el("recordName").value.trim(),
      category = selectedCategory(),
      operator = currentOperator(),
      key =
        mock && mock.keys
          ? mock.keys.generationContext
          : "syssjcj_mock_generation_context_v1";
    if (!validateConstraints()) return;
    if (!name) {
      el("recordName").focus();
      showToast("请输入原始记录名称");
      return;
    }
    if (!operator.empId || !operator.userName) {
      showToast("未取得当前平台操作人信息，请从功能平台重新进入");
      return;
    }
    el("workingMask").classList.remove("is-hidden");
    el("generateSubmit").disabled = true;
    if (!CONFIG.mockMode) {
      submitPlatform({
        recordName: name,
        templateId: targetTemplate.templateId,
        templateSnapshot: JSON.stringify({
          templateId: targetTemplate.templateId,
          templateName: targetTemplate.name,
          version: targetTemplate.version,
          editorSchema: targetTemplate.editorSchema || null,
        }),
        sampleCategoryId: category.categoryId,
        sampleCategoryName: category.name,
        generateMode: generateModeCode(el("recordModeSelect").value),
        fguids: rows.map(function (row) {
          return row.dataId;
        }),
      }, operator)
        .then(function (result) {
          global.sessionStorage.removeItem(key);
          try {
            if (
              global.parent &&
              typeof global.parent.syssjcjSbsjRefresh === "function"
            ) {
              global.parent.syssjcjSbsjRefresh(result);
            }
          } catch (error) {}
          el("workingMask").classList.add("is-hidden");
          closePage();
        })
        .catch(function (error) {
          el("workingMask").classList.add("is-hidden");
          el("generateSubmit").disabled = false;
          showToast(error.message || "原始记录入库失败");
        });
      return;
    }
    /* 模拟生成降级区：仅在 CONFIG.mockMode=true 时使用。 */
    setTimeout(function () {
      if (mock) {
        var records = mock.getRecords(),
          record = {
            recordId: "REC" + Date.now(),
            name: name,
            templateId: targetTemplate.templateId,
            templateName: targetTemplate.name,
            templateVersion: targetTemplate.version,
            editorSchema: targetTemplate.editorSchema || null,
            mode: el("recordModeSelect").value,
            departmentId: targetDevice.departmentId,
            departmentName: targetDevice.departmentName,
            deviceId: targetDevice.deviceId,
            device: targetDevice,
            dataIds: rows.map(function (row) {
              return row.dataId;
            }),
            dataRows: rows,
            sampleCategories: [category.categoryId],
            sampleCategoryNames: [category.name],
            sampleCount: unique(
              rows.map(function (row) {
                return row.sampleNo;
              }),
            ).length,
            projectCount: unique(
              rows.map(function (row) {
                return row.projectName;
              }),
            ).length,
            experimentRange: experimentRange(),
            createTime:
              new Date().toISOString().slice(0, 10) +
              " " +
              new Date().toTimeString().slice(0, 8),
            creator: operator.userName,
          };
        records.unshift(record);
        mock.setRecords(records);
      }
      global.sessionStorage.removeItem(key);
      try {
        if (
          global.parent &&
          typeof global.parent.syssjcjSbsjRefresh === "function"
        ) {
          global.parent.syssjcjSbsjRefresh();
        }
      } catch (error) {}
      el("workingMask").classList.add("is-hidden");
      closePage();
    }, 800);
  }
  function init() {
    if (typeof global.initGlobalParams === "function") {
      global.initGlobalParams();
    }
    if (!loadContext()) {
      showError();
      return;
    }
    renderBaseInfo();
    el("generateSubmit").disabled = true;
    el("sampleCategorySelect").onchange = populateTemplates;
    el("templateSelect").onchange = populateModes;
    el("recordModeSelect").onchange = validateConstraints;
    el("generateSubmit").onclick = submit;
    loadDictionaries()
      .then(function () {
        populateCategories();
      })
      .catch(function () {
        showError("样品类别和原始记录模板加载失败，请关闭后重试");
      });
  }

  global.addEventListener("load", init);
})(window);
