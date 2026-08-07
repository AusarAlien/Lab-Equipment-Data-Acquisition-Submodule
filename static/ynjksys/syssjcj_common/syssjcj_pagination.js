(function (global) {
  "use strict";

  var ELLIPSIS = "ellipsis";

  function toPositiveInteger(value, fallback) {
    var parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0
      ? Math.floor(parsed)
      : fallback;
  }

  function items(totalPages, currentPage, maximumPageButtons) {
    var total = Math.max(0, Math.floor(Number(totalPages) || 0));
    var maximum = Math.max(
      5,
      toPositiveInteger(maximumPageButtons, 5),
    );
    var current = Math.min(
      Math.max(1, toPositiveInteger(currentPage, 1)),
      Math.max(1, total),
    );
    var result = [];
    var page;

    if (!total) return result;
    if (total <= maximum) {
      for (page = 1; page <= total; page += 1) result.push(page);
      return result;
    }

    if (current <= 3) {
      for (page = 1; page <= maximum - 1; page += 1) result.push(page);
      result.push(ELLIPSIS, total);
      return result;
    }

    if (current >= total - 2) {
      result.push(1, ELLIPSIS);
      for (page = total - maximum + 2; page <= total; page += 1) {
        result.push(page);
      }
      return result;
    }

    result.push(1, ELLIPSIS, current - 1, current, current + 1, ELLIPSIS, total);
    return result;
  }

  global.SyssjcjPagination = {
    ELLIPSIS: ELLIPSIS,
    items: items,
  };
})(window);
