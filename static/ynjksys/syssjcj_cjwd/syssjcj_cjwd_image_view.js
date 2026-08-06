(function (global) {
  "use strict";
  var CONFIG = {
    mockMode: false,
    defaultDbnm: "ynjk",
    storageKey: global.SyssjcjMockData
      ? global.SyssjcjMockData.keys.selectedSpectrum
      : "syssjcj_cjwd_selected_spectrum_v1",
    qid: "",
  };
  var current = null,
    scale = 1,
    fit = true;
  function el(id) {
    return document.getElementById(id);
  }
  function esc(v) {
    return String(v == null ? "" : v).replace(/[&<>'"]/g, function (c) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      }[c];
    });
  }
  function queryParam(name) {
    return new URLSearchParams(global.location.search).get(name) || "";
  }
  function setText(id, value) {
    var t = value == null || value === "" ? "--" : String(value);
    el(id).textContent = t;
    el(id).title = t;
  }
  function load() {
    try {
      var item = JSON.parse(
        global.sessionStorage.getItem(CONFIG.storageKey) || "null",
      );
      return Promise.resolve(
        item &&
          (!queryParam("spectrumId") ||
            item.spectrumId === queryParam("spectrumId"))
          ? item
          : null,
      );
    } catch (e) {
      return Promise.resolve(null);
    }
  }
  function points(series) {
    var values = series && series.length ? series : [5, 12, 28, 72, 32, 18, 9],
      left = 92,
      right = 1136,
      top = 105,
      bottom = 548,
      max = Math.max.apply(null, values.concat([100]));
    return values.map(function (v, i) {
      var x = left + ((right - left) * i) / (values.length - 1),
        y = bottom - ((bottom - top) * v) / max;
      return { x: x, y: y, v: v };
    });
  }
  function renderSvg(item) {
    if (!CONFIG.mockMode && item.fdiseq) {
      el("spectrumSvg").innerHTML =
        '<rect width="1200" height="650" fill="#fff"/>' +
        '<image href="' +
        esc(global.SyssjcjDocumentService.pageImageUrl(item.fdiseq, item.page, 150)) +
        '" x="0" y="0" width="1200" height="650" preserveAspectRatio="xMidYMid meet"/>';
      return;
    }
    /* 模拟曲线绘制降级实现：真实原图接口启用期间不执行。 */
    var p = points(item.series),
      poly = p
        .map(function (x) {
          return x.x.toFixed(1) + "," + x.y.toFixed(1);
        })
        .join(" "),
      grid = "",
      labels = "";
    for (var i = 0; i <= 5; i++) {
      var y = 548 - i * 88.6;
      grid +=
        '<line x1="92" y1="' +
        y +
        '" x2="1136" y2="' +
        y +
        '" stroke="#dce4ef" stroke-dasharray="5 6"/><text x="72" y="' +
        (y + 5) +
        '" text-anchor="end" fill="#667386" font-size="17">' +
        i * 20 +
        "</text>";
    }
    p.forEach(function (x, i) {
      labels +=
        '<circle cx="' +
        x.x +
        '" cy="' +
        x.y +
        '" r="5" fill="#3478f6" stroke="#fff" stroke-width="2"/><text x="' +
        x.x +
        '" y="580" text-anchor="middle" fill="#667386" font-size="15">' +
        (i + 1) +
        "</text>";
    });
    el("spectrumSvg").innerHTML =
      '<rect width="1200" height="650" fill="#fff"/><text x="600" y="42" text-anchor="middle" font-size="25" font-weight="600" fill="#263246">' +
      esc(item.name) +
      '</text><text x="600" y="72" text-anchor="middle" font-size="15" fill="#7b8798">样品编号：' +
      esc(item.sampleNo) +
      "　检测项目：" +
      esc(item.project) +
      "</text>" +
      grid +
      '<line x1="92" y1="105" x2="92" y2="548" stroke="#7d8999"/><line x1="92" y1="548" x2="1136" y2="548" stroke="#7d8999"/><polyline points="' +
      poly +
      '" fill="none" stroke="#3478f6" stroke-width="4" stroke-linejoin="round"/>' +
      labels +
      '<text x="614" y="620" text-anchor="middle" fill="#566276" font-size="17">采集点</text><text x="25" y="330" transform="rotate(-90 25 330)" text-anchor="middle" fill="#566276" font-size="17">响应强度</text><rect x="945" y="88" width="14" height="4" fill="#3478f6"/><text x="968" y="96" fill="#566276" font-size="15">' +
      esc(item.type) +
      "</text>";
  }
  function render(item) {
    current = item;
    setText("spectrumName", item.name);
    setText("spectrumId", "图谱标识：" + item.spectrumId);
    setText("sampleNo", item.sampleNo);
    setText("project", item.project);
    setText("spectrumType", item.type);
    setText("deviceName", item.device);
    setText("collectTime", item.time);
    setText("sourceFile", item.file);
    renderSvg(item);
    global.setTimeout(fitToWindow, 0);
  }
  function apply() {
    el("imageCanvas").style.transform = "scale(" + scale + ")";
    el("scaleText").textContent = Math.round(scale * 100) + "%";
    el("fitView").classList.toggle("is-active", fit);
  }
  function setScale(value, isFit) {
    scale = Math.max(0.25, Math.min(2.5, value));
    fit = !!isFit;
    apply();
  }
  function fitToWindow() {
    var viewport = el("imageViewport"),
      availableW = Math.max(100, viewport.clientWidth - 48),
      availableH = Math.max(100, viewport.clientHeight - 48);
    setScale(Math.min(availableW / 1200, availableH / 650, 1), true);
  }
  function bind() {
    el("zoomOut").onclick = function () {
      setScale(scale - 0.15, false);
    };
    el("zoomIn").onclick = function () {
      setScale(scale + 0.15, false);
    };
    el("resetView").onclick = function () {
      setScale(1, false);
    };
    el("fitView").onclick = fitToWindow;
    global.addEventListener("resize", function () {
      if (fit) fitToWindow();
    });
  }
  function init() {
    if (typeof global.initGlobalParams === "function")
      global.initGlobalParams();
    bind();
    load()
      .then(function (item) {
        if (!item) {
          document.querySelector(".viewer-page").classList.add("is-hidden");
          el("pageError").classList.remove("is-hidden");
          return;
        }
        render(item);
      })
      .catch(function () {
        document.querySelector(".viewer-page").classList.add("is-hidden");
        el("pageError").classList.remove("is-hidden");
      });
  }
  global.addEventListener("load", init);
})(window);
