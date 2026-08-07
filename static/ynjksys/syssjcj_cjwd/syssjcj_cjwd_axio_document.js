(function (global) {
  "use strict";

  var SUMMARY_FIELDS = [
    "cellCount",
    "abnormalCellCount",
    "abnormalTotal",
    "breakCount",
    "chromatidExchange",
    "gapCount",
    "minuteBody",
    "centricRing",
    "acentricRing",
    "doubleMinute",
    "nonspecificChange",
  ];

  var CELL_FIELDS = [
    "breakCount",
    "chromatidExchange",
    "gapCount",
    "minuteBody",
    "centricRing",
    "acentricRing",
    "doubleMinute",
    "nonspecificChange",
  ];

  function service() {
    return global.SyssjcjDocumentService;
  }

  function value(row, aliases, fallback) {
    return service().value(row, aliases, fallback);
  }

  function text(input, fallback) {
    if (input == null || input === "") return fallback == null ? "" : fallback;
    return String(input);
  }

  function numeric(input) {
    var result = Number(String(input == null ? "" : input).replace(/[%\s,]/g, ""));
    return Number.isFinite(result) ? result : 0;
  }

  function escapeHtml(input) {
    return text(input).replace(/[&<>'"]/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      }[char];
    });
  }

  function normalizeSummary(row) {
    return {
      slideNo: text(value(row, ["玻片号", "SLIDE_NO"], "")),
      groupName: text(value(row, ["组别", "GROUP_NAME"], "")),
      cellCount: text(value(row, ["细胞数", "CELL_COUNT"], "0")),
      abnormalCellCount: text(
        value(row, ["畸变细胞数", "ABNORMAL_CELL_COUNT"], "0"),
      ),
      abnormalTotal: text(value(row, ["畸变总数", "ABNORMAL_TOTAL"], "0")),
      abnormalRate: text(value(row, ["畸变率", "ABNORMAL_RATE"], "0")),
      breakCount: text(value(row, ["断裂", "BREAK_COUNT"], "0")),
      chromatidExchange: text(
        value(row, ["单体互换", "CHROMATID_EXCHANGE"], "0"),
      ),
      gapCount: text(value(row, ["裂隙", "GAP_COUNT"], "0")),
      minuteBody: text(value(row, ["微小体", "MINUTE_BODY"], "0")),
      centricRing: text(value(row, ["有着丝点环", "CENTRIC_RING"], "0")),
      acentricRing: text(value(row, ["无着丝点环", "ACENTRIC_RING"], "0")),
      doubleMinute: text(value(row, ["双微小体", "DOUBLE_MINUTE"], "0")),
      nonspecificChange: text(
        value(row, ["非特定性型变化", "NONSPECIFIC_CHANGE"], "0"),
      ),
    };
  }

  function normalizeCell(row) {
    return {
      slideNo: text(value(row, ["玻片号", "SLIDE_NO"], "")),
      sequenceNo: text(value(row, ["序号", "SEQUENCE_NO"], "")),
      objectNo: text(value(row, ["对象编号", "OBJECT_NO"], "")),
      xCor: text(value(row, ["X坐标", "X_COR"], "")),
      yCor: text(value(row, ["Y坐标", "Y_COR"], "")),
      zCor: text(value(row, ["Z坐标", "Z_COR"], "")),
      groupName: text(value(row, ["组别", "GROUP_NAME"], "")),
      breakCount: text(value(row, ["断裂", "BREAK_COUNT"], "0")),
      chromatidExchange: text(
        value(row, ["单体互换", "CHROMATID_EXCHANGE"], "0"),
      ),
      gapCount: text(value(row, ["裂隙", "GAP_COUNT"], "0")),
      minuteBody: text(value(row, ["微小体", "MINUTE_BODY"], "0")),
      centricRing: text(value(row, ["有着丝点环", "CENTRIC_RING"], "0")),
      acentricRing: text(value(row, ["无着丝点环", "ACENTRIC_RING"], "0")),
      doubleMinute: text(value(row, ["双微小体", "DOUBLE_MINUTE"], "0")),
      nonspecificChange: text(
        value(row, ["非特定性型变化", "NONSPECIFIC_CHANGE"], "0"),
      ),
    };
  }

  function buildTotal(summaries) {
    var total = {
      slideNo: "合计",
      groupName: "合计",
      abnormalRate: "0%",
    };
    SUMMARY_FIELDS.forEach(function (field) {
      total[field] = String(
        summaries.reduce(function (sum, row) {
          return sum + numeric(row[field]);
        }, 0),
      );
    });
    var cellCount = numeric(total.cellCount);
    var abnormalCellCount = numeric(total.abnormalCellCount);
    var rate = cellCount ? (abnormalCellCount * 100) / cellCount : 0;
    total.abnormalRate =
      (Math.round(rate * 100) / 100).toLocaleString("zh-CN", {
        maximumFractionDigits: 2,
      }) + "%";
    return total;
  }

  function buildCellTotals(cells) {
    var totals = {};
    CELL_FIELDS.forEach(function (field) {
      totals[field] = String(
        cells.reduce(function (sum, row) {
          return sum + numeric(row[field]);
        }, 0),
      );
    });
    return totals;
  }

  function buildModel(documentItem, payload) {
    var summaries = (payload.summaries || []).map(normalizeSummary);
    var cells = (payload.cells || []).map(normalizeCell);
    return {
      document: documentItem,
      groupName:
        (summaries[0] && summaries[0].groupName) ||
        (cells[0] && cells[0].groupName) ||
        "",
      summaries: summaries,
      total: buildTotal(summaries),
      cells: cells,
      cellTotals: buildCellTotals(cells),
    };
  }

  function summaryCells(row) {
    return [
      row.groupName,
      row.slideNo,
      row.cellCount,
      row.abnormalCellCount,
      row.abnormalTotal,
      row.abnormalRate,
      row.breakCount,
      row.chromatidExchange,
      row.gapCount,
      row.minuteBody,
      row.centricRing,
      row.acentricRing,
      row.doubleMinute,
      row.nonspecificChange,
    ];
  }

  function detailCells(row) {
    return [
      row.sequenceNo,
      row.objectNo,
      row.xCor,
      row.yCor,
      row.zCor,
      row.breakCount,
      row.chromatidExchange,
      row.gapCount,
      row.minuteBody,
      row.centricRing,
      row.acentricRing,
      row.doubleMinute,
      row.nonspecificChange,
    ];
  }

  function detailSummaryCells(total) {
    return [
      "Summary",
      "Summary",
      "Summary",
      "Summary",
      "Summary",
      total.breakCount,
      total.chromatidExchange,
      total.gapCount,
      total.minuteBody,
      total.centricRing,
      total.acentricRing,
      total.doubleMinute,
      total.nonspecificChange,
    ];
  }

  function htmlRow(values, className) {
    return (
      '<tr class="' +
      (className || "") +
      '">' +
      values
        .map(function (item) {
          return '<td title="' + escapeHtml(item) + '">' + escapeHtml(item) + "</td>";
        })
        .join("") +
      "</tr>"
    );
  }

  function render(container, model) {
    var summaryRows = model.summaries
      .map(function (row) {
        return htmlRow(summaryCells(row));
      })
      .join("");
    var detailRows = model.cells
      .map(function (row) {
        return htmlRow(detailCells(row));
      })
      .join("");

    container.innerHTML =
      '<div class="axio-document-meta">' +
      '<strong>体外染色体畸变分析合并记录</strong>' +
      '<span title="' +
      escapeHtml(model.groupName) +
      '">组别：' +
      escapeHtml(model.groupName || "--") +
      "</span><span>细胞数：" +
      model.cells.length +
      "</span></div>" +
      '<div class="axio-table-scroll"><article class="axio-document-paper">' +
      '<table class="axio-document-table axio-summary-table"><thead><tr>' +
      "<th>组别</th><th>玻片号</th><th>细胞数</th><th>畸变<br>细胞数</th>" +
      "<th>畸变<br>总数</th><th>畸变率</th><th>断裂</th><th>单体<br>互换</th>" +
      "<th>裂隙</th><th>微小体</th><th>有着丝点环</th><th>无着丝点环</th>" +
      "<th>双微<br>小体</th><th>非特定性<br>型变化</th></tr></thead><tbody>" +
      summaryRows +
      htmlRow(summaryCells(model.total), "is-total") +
      "</tbody></table>" +
      '<table class="axio-document-table axio-detail-table"><thead>' +
      '<tr><th rowspan="2">No.</th><th rowspan="2">Object<br>No.</th><th colspan="3">坐标值</th>' +
      '<th rowspan="2">断裂</th><th rowspan="2">单体<br>互换</th><th rowspan="2">裂隙</th>' +
      '<th rowspan="2">微小体</th><th rowspan="2">有着丝点环</th><th rowspan="2">无着丝点环</th>' +
      '<th rowspan="2">双微<br>小体</th><th rowspan="2">非特定性<br>型变化</th></tr>' +
      "<tr><th>X Cor</th><th>Y Cor</th><th>Z Cor</th></tr></thead><tbody>" +
      detailRows +
      htmlRow(detailSummaryCells(model.cellTotals), "is-total") +
      "</tbody></table></article></div>";
  }

  function docxCell(valueText, options) {
    var d = global.docx;
    var opts = options || {};
    return new d.TableCell({
      columnSpan: opts.columnSpan,
      rowSpan: opts.rowSpan,
      width: opts.width ? { size: opts.width, type: d.WidthType.DXA } : undefined,
      verticalAlign: d.VerticalAlign.CENTER,
      shading: opts.header
        ? { fill: "EAF1FB", type: d.ShadingType.CLEAR, color: "auto" }
        : undefined,
      margins: { top: 60, bottom: 60, left: 45, right: 45 },
      children: [
        new d.Paragraph({
          alignment: d.AlignmentType.CENTER,
          children: [
            new d.TextRun({
              text: text(valueText),
              bold: Boolean(opts.bold || opts.header),
              font: "宋体",
              size: opts.fontSize || 14,
            }),
          ],
        }),
      ],
    });
  }

  function docxRow(values, widths, options) {
    var d = global.docx;
    var opts = options || {};
    return new d.TableRow({
      tableHeader: Boolean(opts.tableHeader),
      children: values.map(function (item, index) {
        return docxCell(item, {
          width: widths[index],
          header: opts.header,
          bold: opts.bold,
          fontSize: opts.fontSize,
        });
      }),
    });
  }

  function buildDocx(model) {
    var d = global.docx;
    if (!d || !d.Document || !d.Packer) {
      throw new Error("DOCX生成组件未加载");
    }

    var summaryWidths = [2600, 650, 700, 750, 750, 700, 720, 820, 700, 760, 880, 880, 760, 980];
    var detailWidths = [600, 850, 900, 900, 900, 760, 900, 760, 780, 980, 980, 820, 1050];
    var summaryHeader = [
      "组别",
      "玻片号",
      "细胞数",
      "畸变细胞数",
      "畸变总数",
      "畸变率",
      "断裂",
      "单体互换",
      "裂隙",
      "微小体",
      "有着丝点环",
      "无着丝点环",
      "双微小体",
      "非特定性型变化",
    ];

    var summaryRows = [docxRow(summaryHeader, summaryWidths, { header: true, tableHeader: true })]
      .concat(
        model.summaries.map(function (row) {
          return docxRow(summaryCells(row), summaryWidths);
        }),
      )
      .concat([docxRow(summaryCells(model.total), summaryWidths, { bold: true })]);

    var firstHeader = new d.TableRow({
      tableHeader: true,
      children: [
        docxCell("No.", { width: detailWidths[0], rowSpan: 2, header: true }),
        docxCell("Object No.", { width: detailWidths[1], rowSpan: 2, header: true }),
        docxCell("坐标值", {
          width: detailWidths[2] + detailWidths[3] + detailWidths[4],
          columnSpan: 3,
          header: true,
        }),
      ].concat(
        ["断裂", "单体互换", "裂隙", "微小体", "有着丝点环", "无着丝点环", "双微小体", "非特定性型变化"].map(
          function (label, index) {
            return docxCell(label, {
              width: detailWidths[index + 5],
              rowSpan: 2,
              header: true,
            });
          },
        ),
      ),
    });
    var secondHeader = new d.TableRow({
      tableHeader: true,
      children: [
        docxCell("X Cor", { width: detailWidths[2], header: true }),
        docxCell("Y Cor", { width: detailWidths[3], header: true }),
        docxCell("Z Cor", { width: detailWidths[4], header: true }),
      ],
    });
    var detailRows = [firstHeader, secondHeader]
      .concat(
        model.cells.map(function (row) {
          return docxRow(detailCells(row), detailWidths, { fontSize: 13 });
        }),
      )
      .concat([
        docxRow(detailSummaryCells(model.cellTotals), detailWidths, {
          bold: true,
          fontSize: 13,
        }),
      ]);

    return new d.Document({
      creator: "实验室信息管理系统",
      title: "体外染色体畸变分析合并记录",
      description: "由AxioImagerZ2 PDF解析数据与TXT坐标数据动态生成",
      sections: [
        {
          properties: {
            page: {
              size: { orientation: d.PageOrientation.LANDSCAPE },
              margin: { top: 600, right: 600, bottom: 600, left: 600 },
            },
          },
          children: [
            new d.Table({
              width: { size: 100, type: d.WidthType.PERCENTAGE },
              layout: d.TableLayoutType.FIXED,
              rows: summaryRows,
            }),
            new d.Paragraph({ spacing: { after: 100 } }),
            new d.Table({
              width: { size: 100, type: d.WidthType.PERCENTAGE },
              layout: d.TableLayoutType.FIXED,
              rows: detailRows,
            }),
          ],
        },
      ],
    });
  }

  function download(model) {
    if (!model || !model.cells.length) {
      return Promise.reject(new Error("没有可生成文档的逐细胞数据"));
    }
    var d = global.docx;
    var documentObject;
    try {
      documentObject = buildDocx(model);
    } catch (error) {
      return Promise.reject(error);
    }
    return d.Packer.toBlob(documentObject).then(function (blob) {
      var sourceName = text(model.document.fileName, "AxioImagerZ2");
      var baseName = sourceName.replace(/\.[^.]+$/, "");
      var fileName = (baseName + "_坐标合并记录.docx").replace(/[\\/:*?"<>|]/g, "_");
      var url = global.URL.createObjectURL(blob);
      var anchor = global.document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.style.display = "none";
      global.document.body.appendChild(anchor);
      anchor.click();
      global.setTimeout(function () {
        global.URL.revokeObjectURL(url);
        if (anchor.parentNode) anchor.parentNode.removeChild(anchor);
      }, 1000);
      return fileName;
    });
  }

  function load(documentItem) {
    return service()
      .loadAxioDocument(documentItem.fdiseq)
      .then(function (payload) {
        return buildModel(documentItem, payload);
      });
  }

  global.SyssjcjAxioDocument = {
    load: load,
    render: render,
    download: download,
    buildModel: buildModel,
    buildDocx: buildDocx,
  };
})(window);
