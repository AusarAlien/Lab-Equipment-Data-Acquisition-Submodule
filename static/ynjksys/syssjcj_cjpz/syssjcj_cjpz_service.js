(function (global) {
  "use strict";
  var CONFIG = {
    mockMode: true,
    qids: {
      strategies: "待配置_采集策略查询",
      scripts: "待配置_策略脚本查询",
      mappings: "待配置_项目对照查询",
      sources: "待配置_数据源查询",
    },
  };
  function mock() {
    if (!global.SyssjcjMockData) throw new Error("统一模拟数据未加载");
    return global.SyssjcjMockData;
  }
  function later(value) {
    return Promise.resolve(JSON.parse(JSON.stringify(value)));
  }
  function server(qid, params) {
    return new Promise(function (resolve, reject) {
      if (!global.isqrydata || typeof global.isqrydata.query !== "function") {
        reject(new Error("平台查询组件未加载"));
        return;
      }
      global.isqrydata.query(
        qid,
        params || {},
        function (data) {
          resolve(data || []);
        },
        function (error) {
          reject(error || new Error("查询失败"));
        },
      );
    });
  }
  function load(qid, getter, params) {
    return CONFIG.mockMode ? later(mock()[getter]()) : server(qid, params);
  }
  global.SyssjcjConfigService = {
    config: CONFIG,
    loadDepartments: function () {
      return later(mock().getDepartments());
    },
    loadDevices: function () {
      return later(mock().getDevices());
    },
    loadClients: function () {
      return later(mock().getClients());
    },
    loadStrategies: function (p) {
      return load(CONFIG.qids.strategies, "getCollectionStrategies", p);
    },
    saveStrategies: function (v) {
      mock().setCollectionStrategies(v);
      return later(v);
    },
    loadScripts: function (p) {
      return load(CONFIG.qids.scripts, "getStrategyScripts", p);
    },
    saveScripts: function (v) {
      mock().setStrategyScripts(v);
      return later(v);
    },
    loadDebugRecords: function () {
      return later(mock().getScriptDebugRecords());
    },
    saveDebugRecords: function (v) {
      mock().setScriptDebugRecords(v);
      return later(v);
    },
    loadMappings: function (p) {
      return load(CONFIG.qids.mappings, "getProjectMappings", p);
    },
    saveMappings: function (v) {
      mock().setProjectMappings(v);
      return later(v);
    },
    loadSources: function (p) {
      return load(CONFIG.qids.sources, "getConfigDataSources", p);
    },
    saveSources: function (v) {
      mock().setConfigDataSources(v);
      return later(v);
    },
    loadStrategyLogs: function () {
      return later(mock().getStrategyLogs());
    },
    saveStrategyLogs: function (v) {
      mock().setStrategyLogs(v);
      return later(v);
    },
  };
})(window);
