(function (global) {
  "use strict";
  var mock = global.SyssjcjMockData;
  var CONFIG = {
    mockMode: true,
    defaultDbnm: "ynjk",
    referenceTime: "2026-08-04 10:36:30",
    qids: {
      clients: "",
      clientLogs: "",
      clientLogDetail: "",
      heartbeatTrend: "",
      strategyLogs: "",
      strategyLogDetail: "",
    },
  };
  function commonParams() {
    var result =
      typeof global.buildCommonParams === "function"
        ? global.buildCommonParams() || {}
        : {};
    result.hp = result.hp || "ynjksys";
    if (!result.dbnm || /^(none|null|undefined)$/i.test(String(result.dbnm))) {
      result.dbnm = CONFIG.defaultDbnm;
    }
    return result;
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
    return result.data.map(function (row) {
      var item = {};
      (result.title || []).forEach(function (title, index) {
        item[title] = row[index];
      });
      return item;
    });
  }
  function queryPlatform(qid, businessParams) {
    return new Promise(function (resolve, reject) {
      if (!qid) {
        reject(new Error("平台查询号尚未注册"));
        return;
      }
      if (!global.isqrydata || typeof global.isqrydata.query !== "function") {
        reject(new Error("平台查询组件未加载"));
        return;
      }
      var params = commonParams();
      Object.keys(businessParams || {}).forEach(function (key) {
        params[key] = businessParams[key];
      });
      global.isqrydata.query({
        qid: qid,
        data: params,
        successCallback: function (result) {
          resolve(rowsFromResult(result));
        },
        errorCallback: reject,
      });
    });
  }
  function source(name, qid, params) {
    if (CONFIG.mockMode) return Promise.resolve(mock[name]());
    return queryPlatform(qid, params || {});
  }
  global.SyssjcjLogService = {
    config: CONFIG,
    commonParams: commonParams,
    getReferenceTime: function () {
      return CONFIG.mockMode
        ? CONFIG.referenceTime
        : new Date().toISOString().slice(0, 19).replace("T", " ");
    },
    loadDepartments: function () {
      return Promise.resolve(mock.getDepartments());
    },
    loadDevices: function () {
      return Promise.resolve(mock.getDevices());
    },
    loadClients: function (params) {
      return source("getClients", CONFIG.qids.clients, params);
    },
    loadClientLogs: function (params) {
      return source("getClientLogs", CONFIG.qids.clientLogs, params);
    },
    loadHeartbeats: function (params) {
      return source("getHeartbeatLogs", CONFIG.qids.heartbeatTrend, params);
    },
    loadStrategyLogs: function (params) {
      return source("getStrategyLogs", CONFIG.qids.strategyLogs, params);
    },
    loadClientLogDetail: function (logId) {
      if (CONFIG.mockMode) {
        return Promise.resolve(
          mock.getClientLogs().find(function (item) {
            return item.logId === logId;
          }) || null,
        );
      }
      return queryPlatform(CONFIG.qids.clientLogDetail, {
        log_id_sql_equal: logId,
      }).then(function (rows) {
        return rows[0] || null;
      });
    },
    loadStrategyLogDetail: function (auditId) {
      if (CONFIG.mockMode) {
        return Promise.resolve(
          mock.getStrategyLogs().find(function (item) {
            return item.auditId === auditId;
          }) || null,
        );
      }
      return queryPlatform(CONFIG.qids.strategyLogDetail, {
        audit_id_sql_equal: auditId,
      }).then(function (rows) {
        return rows[0] || null;
      });
    },
  };
})(window);
