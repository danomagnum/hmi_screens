(function () {
  function parseNumber(value) {
    if (value === null || value === undefined || value === "") {
      return NaN;
    }
    return parseFloat(value);
  }

  function getCanvasRect(canvas) {
    var rect = canvas.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) {
      return { width: 300, height: 150 };
    }
    return { width: rect.width, height: rect.height };
  }

  function computeMillisPerPixel(secs, cssWidth) {
    var safeWidth = cssWidth > 0 ? cssWidth : 300;
    return Math.max(1, Math.round((secs * 1000) / safeWidth));
  }

  function resizeCanvasForDpr(element) {
    var rect = getCanvasRect(element);
    var dpr = window.devicePixelRatio || 1;
    var width = Math.round(rect.width * dpr);
    var height = Math.round(rect.height * dpr);

    if (element.width !== width || element.height !== height) {
      element.width = width;
      element.height = height;
      element.style.width = Math.round(rect.width) + "px";
      element.style.height = Math.round(rect.height) + "px";
    }

    return rect;
  }

  function initGraph(element) {
    if (element._smoothieState) {
      return;
    }

    if (typeof SmoothieChart === "undefined" || typeof TimeSeries === "undefined") {
      console.error("SmoothieCharts not loaded. Add /static/smoothie.min.js before graph_smoothie.js.");
      return;
    }

    var pencolor = element.getAttribute("data-pencolor") || "#000000";
    var secs = parseNumber(element.getAttribute("data-secs"));
    if (!isFinite(secs) || secs <= 0) {
      secs = 60;
    }

    var minValue = parseNumber(element.getAttribute("data-min"));
    var maxValue = parseNumber(element.getAttribute("data-max"));

    var rect = resizeCanvasForDpr(element);
    var millisPerPixel = computeMillisPerPixel(secs, rect.width);

    var chart = new SmoothieChart({
      millisPerPixel: millisPerPixel,
      grid: {
        strokeStyle: "rgba(0, 0, 0, 0.15)",
        fillStyle: "rgba(255, 255, 255, 0.0)",
        lineWidth: 1,
        millisPerLine: Math.max(1000, Math.round((secs * 1000) / 4)),
        verticalSections: 4
      },
      labels: {
        fillStyle: "#000000"
      }
    });

    if (isFinite(minValue)) {
      chart.options.minValue = minValue;
    }
    if (isFinite(maxValue)) {
      chart.options.maxValue = maxValue;
    }

    var series = new TimeSeries();
    chart.addTimeSeries(series, { strokeStyle: pencolor, lineWidth: 2 });
    chart.streamTo(element, 500);

    element._smoothieState = { chart: chart, series: series, secs: secs };

    var initialValue = parseFloat(element.textContent);
    if (isFinite(initialValue)) {
      series.append(Date.now(), initialValue);
    }
  }

  function appendValue(element) {
    var state = element._smoothieState;
    if (!state) {
      return;
    }

    var val = parseFloat(element.textContent);
    if (!isFinite(val)) {
      return;
    }

    state.series.append(Date.now(), val);
  }

  function watchGraph(element) {
    initGraph(element);

    var observer = new MutationObserver(function () {
      appendValue(element);
    });

    observer.observe(element, {
      characterData: true,
      childList: true,
      subtree: true
    });
  }

  function resizeGraph(element) {
    var state = element._smoothieState;
    if (!state) {
      return;
    }

    var rect = resizeCanvasForDpr(element);
    state.chart.options.millisPerPixel = computeMillisPerPixel(state.secs, rect.width);
  }

  function resizeAllGraphs() {
    var elements = document.getElementsByClassName("graph");
    Array.prototype.forEach.call(elements, resizeGraph);
  }

  document.addEventListener("DOMContentLoaded", function () {
    var elements = document.getElementsByClassName("graph");
    Array.prototype.forEach.call(elements, watchGraph);
  });

  window.addEventListener("resize", function () {
    resizeAllGraphs();
  });
})();
