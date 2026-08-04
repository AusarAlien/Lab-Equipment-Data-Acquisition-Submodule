(function (global) {
  "use strict";

  var VERSION = "20260804.7";
  var KEYS = {
    documents: "syssjcj_mock_documents_v1",
    records: "syssjcj_mock_records_v2",
    templates: "syssjcj_mock_templates_v1",
    selectedSpectrum: "syssjcj_mock_selected_spectrum_v1",
    generationContext: "syssjcj_mock_generation_context_v1",
    clients: "syssjcj_mock_clients_v1",
    clientLogs: "syssjcj_mock_client_logs_v2",
    strategyLogs: "syssjcj_mock_strategy_logs_v1",
    collectionStrategies: "syssjcj_mock_collection_strategies_v1",
    strategyScripts: "syssjcj_mock_strategy_scripts_v1",
    scriptDebugRecords: "syssjcj_mock_script_debug_records_v1",
    projectMappings: "syssjcj_mock_project_mappings_v1",
    configDataSources: "syssjcj_mock_config_data_sources_v1",
  };
  var departments = [
    { departmentId: "DEPT-LH", name: "检验中心理化室" },
    { departmentId: "DEPT-WSW", name: "检验中心微生物室" },
    { departmentId: "DEPT-DL", name: "检验中心毒理室" },
    { departmentId: "DEPT-XA", name: "性艾所" },
    { departmentId: "DEPT-JC", name: "急传所" },
    { departmentId: "DEPT-ZF", name: "职放所" },
    { departmentId: "DEPT-JF", name: "结防所" },
    { departmentId: "DEPT-MF", name: "麻防所" },
  ];
  var devices = [
    {
      deviceId: "DEV-LH-ICPMS",
      departmentId: "DEPT-LH",
      instno: "ICPMS",
      name: "三重四极杆电感耦合等离子体质谱仪",
      brand: "Thermo",
      model: "Icaptq ICP-MS",
      assetNo: "ICAP TQ00440",
      location: "4号楼613",
      owner: "邢赟",
      networkCapability: "可接入",
      interfaceCapability: "无",
      collectType: "结果文件",
      activeStatus: "活跃",
    },
    {
      deviceId: "DEV-LH-HPLC",
      departmentId: "DEPT-LH",
      instno: "AGILENT-1200",
      name: "液相色谱仪",
      brand: "Agilent Technologies",
      model: "1200",
      assetNo: "000008145",
      location: "4号楼508",
      owner: "熊宏菀",
      networkCapability: "可接入",
      interfaceCapability: "无",
      collectType: "结果文件",
      activeStatus: "活跃",
    },
    {
      deviceId: "DEV-LH-GC",
      departmentId: "DEPT-LH",
      instno: "AGILENT-7890A",
      name: "气相色谱仪",
      brand: "Agilent Technologies",
      model: "7890A",
      assetNo: "000008356",
      location: "4号楼403",
      owner: "刘建辉",
      networkCapability: "可接入",
      interfaceCapability: "无",
      collectType: "结果文件",
      activeStatus: "活跃",
    },
    {
      deviceId: "DEV-LH-IC",
      departmentId: "DEPT-LH",
      instno: "DIONEXICS5000",
      name: "离子色谱仪",
      brand: "Metrohm",
      model: "850 profession",
      assetNo: "TY2013000159",
      location: "4号楼403",
      owner: "刘建辉",
      networkCapability: "可接入",
      interfaceCapability: "无",
      collectType: "结果文件",
      activeStatus: "活跃",
    },
    {
      deviceId: "DEV-WSW-MBY",
      departmentId: "DEPT-WSW",
      instno: "MBY2",
      name: "全自动酶联免疫分析仪",
      brand: "Molecular Devices",
      model: "Spectra Max Mz",
      assetNo: "JYZXWSW-310-001",
      location: "4号楼310",
      owner: "杨祖顺",
      networkCapability: "可接入",
      interfaceCapability: "无",
      collectType: "结果文件",
      activeStatus: "活跃",
    },
    {
      deviceId: "DEV-WSW-MALDI",
      departmentId: "DEPT-WSW",
      instno: "BRUKER-MICROFLEX",
      name: "飞行时间质谱仪",
      brand: "BRUKER",
      model: "New autofex",
      assetNo: "TY2016000034",
      location: "4号楼308",
      owner: "杨祖顺",
      networkCapability: "可接入",
      interfaceCapability: "无",
      collectType: "报告文件",
      activeStatus: "活跃",
    },
    {
      deviceId: "DEV-JC-PCR",
      departmentId: "DEPT-JC",
      instno: "LightCycler480",
      name: "实时荧光定量PCR仪",
      brand: "BIO-RAD",
      model: "CFX 96 deep",
      assetNo: "ZY2020000030",
      location: "3号楼513",
      owner: "赵晓楠",
      networkCapability: "可接入",
      interfaceCapability: "无",
      collectType: "结果文件",
      activeStatus: "活跃",
    },
    {
      deviceId: "DEV-XA-MBY",
      departmentId: "DEPT-XA",
      instno: "ElisaTxt",
      name: "酶标仪",
      brand: "BIO-RAD",
      model: "IMARX",
      assetNo: "ZY2014000010",
      location: "3号楼306",
      owner: "王鑫涛",
      networkCapability: "已接入",
      interfaceCapability: "无",
      collectType: "结果文件",
      activeStatus: "活跃",
    },
    {
      deviceId: "DEV-JF-PCR",
      departmentId: "DEPT-JF",
      instno: "GENEXPERT",
      name: "全自动PCR分析系统GeneXpert",
      brand: "Cepheid",
      model: "GX-XVI R2",
      assetNo: "1200464",
      location: "3号楼809",
      owner: "--",
      networkCapability: "可接入",
      interfaceCapability: "无",
      collectType: "结果文件",
      activeStatus: "活跃",
    },
    {
      deviceId: "DEV-ZF-DOSE",
      departmentId: "DEPT-ZF",
      instno: "RGD-3D",
      name: "热释光剂量仪",
      brand: "海阳博创",
      model: "RGD-3D",
      assetNo: "ZY2015000031",
      location: "1号楼12F个人剂量检测室",
      owner: "曹晶晶",
      networkCapability: "已接入",
      interfaceCapability: "无",
      collectType: "结果文件",
      activeStatus: "活跃",
    },
  ];
  var documents = [
    {
      fdiseq: "CJ202608030001",
      deviceId: "DEV-LH-ICPMS",
      fileName: "ICPMS_金属元素批量检测结果.xlsx",
      fileType: "Excel",
      parserClass: "ExcelICPMS",
      fileSize: 284672,
      collectTime: "2026-08-03 09:26:18",
      parseStatus: "解析成功",
      dataCount: 128,
      canDelete: true,
    },
    {
      fdiseq: "CJ202608030002",
      deviceId: "DEV-LH-HPLC",
      fileName: "HPLC_食品添加剂检测报告.pdf",
      fileType: "PDF",
      parserClass: "Agilent1200",
      fileSize: 1852467,
      collectTime: "2026-08-03 09:18:46",
      parseStatus: "解析成功",
      dataCount: 36,
      canDelete: true,
    },
    {
      fdiseq: "CJ202608030003",
      deviceId: "DEV-WSW-MBY",
      fileName: "MBY2_酶标仪检测结果.xlsx",
      fileType: "Excel",
      parserClass: "ExcelMBY2",
      fileSize: 198436,
      collectTime: "2026-08-03 08:52:11",
      parseStatus: "解析成功",
      dataCount: 84,
      canDelete: true,
    },
    {
      fdiseq: "CJ202608020014",
      deviceId: "DEV-WSW-MALDI",
      fileName: "Microflex_菌种鉴定报告.pdf",
      fileType: "PDF",
      parserClass: "BrukerMicroflex",
      fileSize: 2458316,
      collectTime: "2026-08-02 15:21:06",
      parseStatus: "解析成功",
      dataCount: 24,
      canDelete: true,
    },
    {
      fdiseq: "CJ202608020013",
      deviceId: "DEV-JC-PCR",
      fileName: "CFX96_呼吸道病毒检测结果.xlsx",
      fileType: "Excel",
      parserClass: "LightCycler480",
      fileSize: 975234,
      collectTime: "2026-08-02 14:33:29",
      parseStatus: "解析成功",
      dataCount: 72,
      canDelete: true,
    },
    {
      fdiseq: "CJ202608020012",
      deviceId: "DEV-LH-GC",
      fileName: "AGILENT7890A_挥发性有机物.csv",
      fileType: "CSV",
      parserClass: "Agilent7890A",
      fileSize: 269926,
      collectTime: "2026-08-02 11:08:57",
      parseStatus: "解析失败",
      dataCount: 0,
      canDelete: true,
    },
    {
      fdiseq: "CJ202608010021",
      deviceId: "DEV-XA-MBY",
      fileName: "IMARX_抗体检测结果.txt",
      fileType: "TXT",
      parserClass: "ElisaTxt",
      fileSize: 89264,
      collectTime: "2026-08-01 17:12:43",
      parseStatus: "解析成功",
      dataCount: 40,
      canDelete: true,
    },
    {
      fdiseq: "CJ202608010020",
      deviceId: "DEV-LH-IC",
      fileName: "850_生活饮用水离子检测.xlsx",
      fileType: "Excel",
      parserClass: "ExcelDIONEXICS5000",
      fileSize: 276410,
      collectTime: "2026-08-01 10:22:35",
      parseStatus: "解析成功",
      dataCount: 96,
      canDelete: true,
    },
    {
      fdiseq: "CJ202607310030",
      deviceId: "DEV-JF-PCR",
      fileName: "GeneXpert_结核分枝杆菌检测.csv",
      fileType: "CSV",
      parserClass: "GeneXpert",
      fileSize: 412906,
      collectTime: "2026-07-31 16:38:44",
      parseStatus: "解析成功",
      dataCount: 32,
      canDelete: true,
    },
    {
      fdiseq: "CJ202607310029",
      deviceId: "DEV-ZF-DOSE",
      fileName: "RGD3D_个人剂量检测结果.xlsx",
      fileType: "Excel",
      parserClass: "RGD3D",
      fileSize: 1690240,
      collectTime: "2026-07-31 13:16:09",
      parseStatus: "解析成功",
      dataCount: 64,
      canDelete: true,
    },
  ];
  function createDataSources(fields) {
    var labels = {
      sampleNo: "样品编号",
      sampleCategoryName: "样品类别",
      sampleName: "样品名称",
      projectName: "检测项目",
      result: "检测结果",
      unit: "结果单位",
      experimentTime: "实验时间",
      collectTime: "采集时间",
      deviceName: "仪器设备",
      fileName: "来源文件",
    };
    return fields.map(function (field, index) {
      return {
        sourceId: "SRC-" + field,
        field: field,
        displayName: labels[field] || field,
        sourceObject: field === "collectTime" || field === "fileName" ? "采集文件" : field === "deviceName" ? "仪器设备" : "解析数据",
        dataType: /Time$/.test(field) ? "日期时间" : field === "result" ? "数值/文本" : "文本",
        required: ["sampleNo", "projectName", "result"].indexOf(field) >= 0,
        visible: true,
        format: /Time$/.test(field) ? "yyyy-MM-dd HH:mm:ss" : "",
        order: index + 1,
      };
    });
  }
  var defaultSourceFields = ["sampleNo", "sampleCategoryName", "sampleName", "projectName", "result", "unit", "experimentTime", "deviceName", "fileName"];
  var templates = [
    {
      templateId: "TPL-ICPMS-01",
      name: "金属元素检测原始记录",
      mode: "样品模式",
      departmentId: "DEPT-LH",
      deviceTypes: ["ICPMS"],
      deviceIds: ["DEV-LH-ICPMS"],
      sampleCategories: ["ENV-WATER-DRINKING", "ENV-WATER-SURFACE", "ENV-WATER-GROUND"],
      fileName: "金属元素检测原始记录模板.xlsx",
      fileType: "Excel",
      version: "V1.2",
      description: "适用于水质样品金属元素检测原始数据记录。",
      dataSources: createDataSources(defaultSourceFields),
      status: "启用",
      updateTime: "2026-08-03 16:20:18",
      updateUser: "监*一",
    },
    {
      templateId: "TPL-HPLC-01",
      name: "液相色谱检测原始记录",
      mode: "项目模式",
      departmentId: "DEPT-LH",
      deviceTypes: ["AGILENT-1200"],
      deviceIds: ["DEV-LH-HPLC"],
      sampleCategories: ["FOOD-GENERAL", "FOOD-BEVERAGE", "FOOD-ADDITIVE"],
      fileName: "液相色谱检测原始记录模板.xlsx",
      fileType: "Excel",
      version: "V1.1",
      description: "适用于食品及相关产品液相色谱检测。",
      dataSources: createDataSources(defaultSourceFields),
      status: "启用",
      updateTime: "2026-08-02 14:12:36",
      updateUser: "李*梅",
    },
    {
      templateId: "TPL-PCR-01",
      name: "实时荧光PCR检测原始记录",
      mode: "样品模式",
      departmentId: "DEPT-JC",
      deviceTypes: ["LightCycler480"],
      deviceIds: ["DEV-JC-PCR"],
      sampleCategories: ["BIO-THROAT-SWAB", "BIO-NASAL-SWAB", "MICRO-VIRUS"],
      fileName: "实时荧光PCR检测原始记录模板.docx",
      fileType: "Word",
      version: "V2.0",
      description: "适用于呼吸道病原体实时荧光PCR检测。",
      dataSources: createDataSources(defaultSourceFields),
      status: "启用",
      updateTime: "2026-08-02 10:08:45",
      updateUser: "张*华",
    },
    {
      templateId: "TPL-MBY-01",
      name: "酶联免疫检测原始记录",
      mode: "样品模式",
      departmentId: "DEPT-WSW",
      deviceTypes: ["MBY2", "ElisaTxt"],
      deviceIds: ["DEV-WSW-MBY"],
      sampleCategories: ["BIO-SERUM", "BIO-PLASMA", "BIO-WHOLE-BLOOD"],
      fileName: "酶联免疫检测原始记录模板.xlsx",
      fileType: "Excel",
      version: "V1.3",
      description: "适用于血清、血浆等生物样本酶联免疫检测。",
      dataSources: createDataSources(defaultSourceFields),
      status: "启用",
      updateTime: "2026-08-01 17:32:06",
      updateUser: "王*敏",
    },
    {
      templateId: "TPL-GXP-01",
      name: "结核分枝杆菌分子检测原始记录",
      mode: "样品模式",
      departmentId: "DEPT-JF",
      deviceTypes: ["GENEXPERT"],
      deviceIds: ["DEV-JF-PCR"],
      sampleCategories: ["BIO-SPUTUM"],
      fileName: "结核分枝杆菌分子检测原始记录模板.docx",
      fileType: "Word",
      version: "V1.0",
      description: "适用于痰液样品结核分枝杆菌分子检测。",
      dataSources: createDataSources(defaultSourceFields),
      status: "启用",
      updateTime: "2026-07-31 16:05:24",
      updateUser: "赵*强",
    },
  ];
  var dataRows = [
    {
      dataId: "DATA-0001",
      fdiseq: "CJ202608030001",
      deviceId: "DEV-LH-ICPMS",
      sampleNo: "26S0803001",
      sampleCategory: "ENV-WATER-DRINKING",
      sampleCategoryName: "生活饮用水",
      sampleName: "生活饮用水-01",
      projectCode: "Pb",
      projectName: "铅(Pb)",
      result: "0.012",
      unit: "mg/L",
      experimentTime: "2026-08-03 08:40:12",
    },
    {
      dataId: "DATA-0002",
      fdiseq: "CJ202608030001",
      deviceId: "DEV-LH-ICPMS",
      sampleNo: "26S0803001",
      sampleCategory: "ENV-WATER-DRINKING",
      sampleCategoryName: "生活饮用水",
      sampleName: "生活饮用水-01",
      projectCode: "Cd",
      projectName: "镉(Cd)",
      result: "0.002",
      unit: "mg/L",
      experimentTime: "2026-08-03 08:40:12",
    },
    {
      dataId: "DATA-0003",
      fdiseq: "CJ202608030001",
      deviceId: "DEV-LH-ICPMS",
      sampleNo: "26S0803002",
      sampleCategory: "ENV-WATER-DRINKING",
      sampleCategoryName: "生活饮用水",
      sampleName: "生活饮用水-02",
      projectCode: "As",
      projectName: "砷(As)",
      result: "0.008",
      unit: "mg/L",
      experimentTime: "2026-08-03 08:46:35",
    },
    {
      dataId: "DATA-0004",
      fdiseq: "CJ202608030002",
      deviceId: "DEV-LH-HPLC",
      sampleNo: "26S0803011",
      sampleCategory: "FOOD-BEVERAGE",
      sampleCategoryName: "饮料",
      sampleName: "饮料样品-01",
      projectCode: "SA",
      projectName: "山梨酸",
      result: "12.41",
      unit: "mg/kg",
      experimentTime: "2026-08-03 08:10:28",
    },
    {
      dataId: "DATA-0005",
      fdiseq: "CJ202608030002",
      deviceId: "DEV-LH-HPLC",
      sampleNo: "26S0803011",
      sampleCategory: "FOOD-BEVERAGE",
      sampleCategoryName: "饮料",
      sampleName: "饮料样品-01",
      projectCode: "BA",
      projectName: "苯甲酸",
      result: "6.82",
      unit: "mg/kg",
      experimentTime: "2026-08-03 08:10:28",
    },
    {
      dataId: "DATA-0006",
      fdiseq: "CJ202608030003",
      deviceId: "DEV-WSW-MBY",
      sampleNo: "26S0803021",
      sampleCategory: "BIO-SERUM",
      sampleCategoryName: "血清",
      sampleName: "血清样品-01",
      projectCode: "AB",
      projectName: "抗体检测",
      result: "阴性",
      unit: "--",
      experimentTime: "2026-08-03 08:20:09",
    },
    {
      dataId: "DATA-0007",
      fdiseq: "CJ202608030003",
      deviceId: "DEV-WSW-MBY",
      sampleNo: "26S0803022",
      sampleCategory: "BIO-SERUM",
      sampleCategoryName: "血清",
      sampleName: "血清样品-02",
      projectCode: "AB",
      projectName: "抗体检测",
      result: "阳性",
      unit: "--",
      experimentTime: "2026-08-03 08:22:46",
    },
    {
      dataId: "DATA-0008",
      fdiseq: "CJ202608020013",
      deviceId: "DEV-JC-PCR",
      sampleNo: "26S0803061",
      sampleCategory: "BIO-THROAT-SWAB",
      sampleCategoryName: "咽拭子",
      sampleName: "咽拭子-01",
      projectCode: "FLUA",
      projectName: "甲型流感病毒",
      result: "阳性（Ct 22.48）",
      unit: "--",
      experimentTime: "2026-08-02 13:18:31",
    },
    {
      dataId: "DATA-0009",
      fdiseq: "CJ202608020013",
      deviceId: "DEV-JC-PCR",
      sampleNo: "26S0803062",
      sampleCategory: "BIO-THROAT-SWAB",
      sampleCategoryName: "咽拭子",
      sampleName: "咽拭子-02",
      projectCode: "FLUA",
      projectName: "甲型流感病毒",
      result: "阴性",
      unit: "--",
      experimentTime: "2026-08-02 13:20:14",
    },
    {
      dataId: "DATA-0010",
      fdiseq: "CJ202608010021",
      deviceId: "DEV-XA-MBY",
      sampleNo: "26S0803072",
      sampleCategory: "BIO-SERUM",
      sampleCategoryName: "血清",
      sampleName: "血清样品-12",
      projectCode: "HIVAB",
      projectName: "HIV抗体",
      result: "阳性（S/CO 6.15）",
      unit: "--",
      experimentTime: "2026-08-01 15:31:02",
    },
    {
      dataId: "DATA-0011",
      fdiseq: "CJ202607310030",
      deviceId: "DEV-JF-PCR",
      sampleNo: "26S0731018",
      sampleCategory: "BIO-SPUTUM",
      sampleCategoryName: "痰液",
      sampleName: "痰液样品-18",
      projectCode: "MTB",
      projectName: "结核分枝杆菌",
      result: "检出",
      unit: "--",
      experimentTime: "2026-07-31 15:48:19",
    },
    {
      dataId: "DATA-0012",
      fdiseq: "CJ202607310029",
      deviceId: "DEV-ZF-DOSE",
      sampleNo: "PD202607001",
      sampleCategory: "RAD-DOSIMETER",
      sampleCategoryName: "个人剂量计",
      sampleName: "个人剂量计-001",
      projectCode: "DOSE",
      projectName: "个人剂量",
      result: "0.36",
      unit: "mSv",
      experimentTime: "2026-07-31 11:25:47",
    },
  ];
  var spectra = [
    {
      spectrumId: "TP202608030001",
      dataId: "DATA-0001",
      fdiseq: "CJ202608030001",
      deviceId: "DEV-LH-ICPMS",
      name: "ICPMS_铅同位素信号曲线",
      sampleNo: "26S0803001",
      project: "铅(Pb)",
      type: "质谱图",
      time: "2026-08-03 09:26:18",
      series: [14, 18, 28, 52, 91, 44, 22, 16],
    },
    {
      spectrumId: "TP202608030002",
      dataId: "DATA-0002",
      fdiseq: "CJ202608030001",
      deviceId: "DEV-LH-ICPMS",
      name: "ICPMS_镉同位素信号曲线",
      sampleNo: "26S0803001",
      project: "镉(Cd)",
      type: "质谱图",
      time: "2026-08-03 09:25:42",
      series: [9, 16, 24, 67, 42, 25, 17, 11],
    },
    {
      spectrumId: "TP202608030003",
      dataId: "DATA-0004",
      fdiseq: "CJ202608030002",
      deviceId: "DEV-LH-HPLC",
      name: "山梨酸标准品色谱图",
      sampleNo: "26S0803011",
      project: "山梨酸",
      type: "色谱图",
      time: "2026-08-03 09:18:46",
      series: [3, 5, 8, 82, 9, 6, 4, 3],
    },
    {
      spectrumId: "TP202608020004",
      dataId: "DATA-0008",
      fdiseq: "CJ202608020013",
      deviceId: "DEV-JC-PCR",
      name: "甲型流感病毒扩增曲线",
      sampleNo: "26S0803061",
      project: "甲型流感病毒",
      type: "扩增曲线",
      time: "2026-08-02 14:33:29",
      series: [2, 2, 3, 5, 12, 31, 68, 94],
    },
  ];
  var clients = [
    {
      clientId: "LL-Agilent1200-01",
      deviceId: "DEV-LH-HPLC",
      labId: "YNCDC-LL",
      clientType: "go",
      clientVersion: "1.0.0",
      osInfo: "Windows 7 32位",
      installTime: "2026-08-01 08:20:16",
      lastHeartbeat: "2026-08-04 10:35:42",
      reportedStatus: "running",
      runningMode: "http",
      uploadSuccess: 186,
      uploadFail: 3,
      uptimeSec: 35642,
      heartbeatInterval: 60,
    },
    {
      clientId: "LW-NewAutofex-01",
      deviceId: "DEV-WSW-MALDI",
      labId: "YNCDC-LW",
      clientType: "go",
      clientVersion: "1.0.0",
      osInfo: "Windows 7 32位",
      installTime: "2026-08-01 09:10:08",
      lastHeartbeat: "2026-08-04 10:34:58",
      reportedStatus: "running",
      runningMode: "http",
      uploadSuccess: 94,
      uploadFail: 1,
      uptimeSec: 34191,
      heartbeatInterval: 60,
    },
    {
      clientId: "LL-IcaptqICPMS-01",
      deviceId: "DEV-LH-ICPMS",
      labId: "YNCDC-LL",
      clientType: "python",
      clientVersion: "2.0.0",
      osInfo: "Windows 10 64位",
      installTime: "2026-08-02 08:16:31",
      lastHeartbeat: "2026-08-04 10:36:03",
      reportedStatus: "running",
      runningMode: "http",
      uploadSuccess: 128,
      uploadFail: 2,
      uptimeSec: 31972,
      heartbeatInterval: 60,
    },
    {
      clientId: "JC-CFX96deep-01",
      deviceId: "DEV-JC-PCR",
      labId: "YNCDC-JC",
      clientType: "python",
      clientVersion: "2.0.0",
      osInfo: "Windows 11 64位",
      installTime: "2026-08-02 11:08:45",
      lastHeartbeat: "2026-08-04 10:31:18",
      reportedStatus: "stopped",
      runningMode: "http",
      uploadSuccess: 72,
      uploadFail: 0,
      uptimeSec: 28164,
      heartbeatInterval: 60,
    },
    {
      clientId: "LL-Agilent7890A-01",
      deviceId: "DEV-LH-GC",
      labId: "YNCDC-LL",
      clientType: "python",
      clientVersion: "2.0.0",
      osInfo: "Windows 10 64位",
      installTime: "2026-08-03 07:56:22",
      lastHeartbeat: "2026-08-04 09:48:11",
      reportedStatus: "running",
      runningMode: "http",
      uploadSuccess: 51,
      uploadFail: 4,
      uptimeSec: 17706,
      heartbeatInterval: 60,
    },
  ];
  var heartbeatLogs = [
    ["LL-Agilent1200-01", "2026-08-04 10:31:42", "running", 181, 3, 35402],
    ["LL-Agilent1200-01", "2026-08-04 10:32:42", "running", 183, 3, 35462],
    ["LL-Agilent1200-01", "2026-08-04 10:33:42", "running", 184, 3, 35522],
    ["LL-Agilent1200-01", "2026-08-04 10:34:42", "running", 185, 3, 35582],
    ["LL-Agilent1200-01", "2026-08-04 10:35:42", "running", 186, 3, 35642],
    ["LW-NewAutofex-01", "2026-08-04 10:30:58", "running", 91, 1, 33951],
    ["LW-NewAutofex-01", "2026-08-04 10:31:58", "running", 92, 1, 34011],
    ["LW-NewAutofex-01", "2026-08-04 10:32:58", "running", 93, 1, 34071],
    ["LW-NewAutofex-01", "2026-08-04 10:33:58", "running", 93, 1, 34131],
    ["LW-NewAutofex-01", "2026-08-04 10:34:58", "running", 94, 1, 34191],
    ["LL-IcaptqICPMS-01", "2026-08-04 10:32:03", "running", 124, 2, 31732],
    ["LL-IcaptqICPMS-01", "2026-08-04 10:33:03", "running", 125, 2, 31792],
    ["LL-IcaptqICPMS-01", "2026-08-04 10:34:03", "running", 126, 2, 31852],
    ["LL-IcaptqICPMS-01", "2026-08-04 10:35:03", "running", 127, 2, 31912],
    ["LL-IcaptqICPMS-01", "2026-08-04 10:36:03", "running", 128, 2, 31972],
    ["JC-CFX96deep-01", "2026-08-04 10:27:18", "running", 70, 0, 27924],
    ["JC-CFX96deep-01", "2026-08-04 10:28:18", "running", 71, 0, 27984],
    ["JC-CFX96deep-01", "2026-08-04 10:29:18", "running", 72, 0, 28044],
    ["JC-CFX96deep-01", "2026-08-04 10:30:18", "running", 72, 0, 28104],
    ["JC-CFX96deep-01", "2026-08-04 10:31:18", "stopped", 72, 0, 28164],
    ["LL-Agilent7890A-01", "2026-08-04 09:44:11", "running", 49, 3, 17466],
    ["LL-Agilent7890A-01", "2026-08-04 09:45:11", "running", 50, 3, 17526],
    ["LL-Agilent7890A-01", "2026-08-04 09:46:11", "running", 50, 4, 17586],
    ["LL-Agilent7890A-01", "2026-08-04 09:47:11", "running", 51, 4, 17646],
    ["LL-Agilent7890A-01", "2026-08-04 09:48:11", "running", 51, 4, 17706],
  ];
  var clientLogs = [
    { logId: "LOG202608040016", clientId: "LL-IcaptqICPMS-01", deviceId: "DEV-LH-ICPMS", eventTime: "2026-08-04 10:35:51", receiveTime: "2026-08-04 10:35:52", logType: "文件上传", level: "INFO", result: "成功", fileName: "ICPMS_金属元素批量检测结果.xlsx", fileSize: 284672, requestGuid: "REQ-ICPMS-0804-0016", fdiseq: "CJ202608030001", message: "成功读取文件：D:\\仪器数据\\ICPMS\\ICPMS_金属元素批量检测结果.xlsx", detail: "[2026-08-04 10:35:51] 成功读取文件：D:\\仪器数据\\ICPMS\\ICPMS_金属元素批量检测结果.xlsx" },
    { logId: "LOG202608040015", clientId: "LL-Agilent1200-01", deviceId: "DEV-LH-HPLC", eventTime: "2026-08-04 10:34:26", receiveTime: "2026-08-04 10:34:27", logType: "文件上传", level: "INFO", result: "成功", fileName: "HPLC_食品添加剂检测报告.pdf", fileSize: 1857634, requestGuid: "REQ-HPLC-0804-0015", fdiseq: "CJ202608030002", message: "成功: HPLC_食品添加剂检测报告.pdf", detail: "[2026-08-04 10:34:26] 成功: HPLC_食品添加剂检测报告.pdf" },
    { logId: "LOG202608040014", clientId: "LW-NewAutofex-01", deviceId: "DEV-WSW-MALDI", eventTime: "2026-08-04 10:33:08", receiveTime: "2026-08-04 10:33:09", logType: "运行状态", level: "INFO", result: "提示", fileName: "", fileSize: 0, requestGuid: "", fdiseq: "", message: "监听运行中 | 目录 12 个文件 | 上传 1 跳过 11 失败 0", detail: "监听运行中 | 目录 12 个文件 | 上传 1 跳过 11 失败 0" },
    { logId: "LOG202608040013", clientId: "LL-Agilent7890A-01", deviceId: "DEV-LH-GC", eventTime: "2026-08-04 09:48:10", receiveTime: "2026-08-04 09:48:11", logType: "文件上传", level: "ERROR", result: "失败", fileName: "GCMS_室内空气检测.csv", fileSize: 276378, requestGuid: "REQ-GC-0804-0013", fdiseq: "", message: "失败: GCMS_室内空气检测.csv - 服务器返回失败", detail: "响应：{\"result\":\"error\",\"params\":{},\"errors\":{}}" },
    { logId: "LOG202608040012", clientId: "JC-CFX96deep-01", deviceId: "DEV-JC-PCR", eventTime: "2026-08-04 10:31:18", receiveTime: "2026-08-04 10:31:19", logType: "监听停止", level: "INFO", result: "提示", fileName: "", fileSize: 0, requestGuid: "", fdiseq: "", message: "[HTTP] 监听已停止", detail: "stopped" },
    { logId: "LOG202608040011", clientId: "LL-Agilent1200-01", deviceId: "DEV-LH-HPLC", eventTime: "2026-08-04 09:56:42", receiveTime: "2026-08-04 09:56:43", logType: "运行状态", level: "INFO", result: "提示", fileName: "", fileSize: 0, requestGuid: "", fdiseq: "", message: "监听运行中 | 目录 8 个文件 | 上传 0 跳过 8 失败 0", detail: "监听运行中 | 目录 8 个文件 | 上传 0 跳过 8 失败 0" },
    { logId: "LOG202608040010", clientId: "LL-IcaptqICPMS-01", deviceId: "DEV-LH-ICPMS", eventTime: "2026-08-04 09:32:17", receiveTime: "2026-08-04 09:32:18", logType: "文件上传", level: "ERROR", result: "失败", fileName: "ICPMS_质控样检测结果.xlsx", fileSize: 238624, requestGuid: "REQ-ICPMS-0804-0010", fdiseq: "", message: "读取文件失败：服务器返回异常", detail: "[2026-08-04 09:32:17] 读取文件：D:\\仪器数据\\ICPMS\\ICPMS_质控样检测结果.xlsx  失败！服务器返回异常 | {\"result\":\"error\",\"params\":{},\"errors\":{}}" },
    { logId: "LOG202608040009", clientId: "LW-NewAutofex-01", deviceId: "DEV-WSW-MALDI", eventTime: "2026-08-04 09:20:51", receiveTime: "2026-08-04 09:20:52", logType: "文件上传", level: "INFO", result: "成功", fileName: "Microflex_菌种鉴定结果.pdf", fileSize: 2279618, requestGuid: "REQ-MALDI-0804-0009", fdiseq: "CJ202608020004", message: "成功: Microflex_菌种鉴定结果.pdf", detail: "[2026-08-04 09:20:51] 成功: Microflex_菌种鉴定结果.pdf" },
    { logId: "LOG202608040008", clientId: "JC-CFX96deep-01", deviceId: "DEV-JC-PCR", eventTime: "2026-08-04 08:58:13", receiveTime: "2026-08-04 08:58:14", logType: "文件上传", level: "INFO", result: "成功", fileName: "CFX96_呼吸道病毒检测结果.xlsx", fileSize: 956278, requestGuid: "REQ-PCR-0804-0008", fdiseq: "CJ202608020005", message: "成功读取文件：D:\\仪器数据\\CFX96\\CFX96_呼吸道病毒检测结果.xlsx", detail: "[2026-08-04 08:58:13] 成功读取文件：D:\\仪器数据\\CFX96\\CFX96_呼吸道病毒检测结果.xlsx" },
    { logId: "LOG202608040007", clientId: "LL-Agilent1200-01", deviceId: "DEV-LH-HPLC", eventTime: "2026-08-04 08:42:09", receiveTime: "2026-08-04 08:42:10", logType: "客户端启动", level: "INFO", result: "提示", fileName: "", fileSize: 0, requestGuid: "", fdiseq: "", message: "==== instrument monitor (Go) started ====", detail: "config dir: D:\\instrument-monitor\\Agilent1200 | tray ready" },
    { logId: "LOG202608030006", clientId: "LL-IcaptqICPMS-01", deviceId: "DEV-LH-ICPMS", eventTime: "2026-08-03 16:25:41", receiveTime: "2026-08-03 16:25:42", logType: "运行状态", level: "INFO", result: "提示", fileName: "", fileSize: 0, requestGuid: "", fdiseq: "", message: "监听运行中 | 目录 18 个文件 | 已追踪 18 个", detail: "监听运行中 | 目录 18 个文件 | 已追踪 18 个" },
    { logId: "LOG202608030005", clientId: "LL-Agilent7890A-01", deviceId: "DEV-LH-GC", eventTime: "2026-08-03 15:51:24", receiveTime: "2026-08-03 15:51:25", logType: "文件上传", level: "INFO", result: "成功", fileName: "GCMS_农残检测批次20260803.csv", fileSize: 452812, requestGuid: "REQ-GC-0803-0005", fdiseq: "CJ202608020006", message: "成功读取文件：D:\\仪器数据\\GCMS\\GCMS_农残检测批次20260803.csv", detail: "[2026-08-03 15:51:24] 成功读取文件：D:\\仪器数据\\GCMS\\GCMS_农残检测批次20260803.csv" },
    { logId: "LOG202608030004", clientId: "LW-NewAutofex-01", deviceId: "DEV-WSW-MALDI", eventTime: "2026-08-03 14:12:36", receiveTime: "2026-08-03 14:12:37", logType: "监听启动", level: "INFO", result: "提示", fileName: "", fileSize: 0, requestGuid: "", fdiseq: "", message: "开始监听目录: D:\\仪器数据\\NewAutoflex (间隔 20s)", detail: "[HTTP] 开始监听目录: D:\\仪器数据\\NewAutoflex (间隔 20s)" },
    { logId: "LOG202608030003", clientId: "JC-CFX96deep-01", deviceId: "DEV-JC-PCR", eventTime: "2026-08-03 11:38:05", receiveTime: "2026-08-03 11:38:06", logType: "文件上传", level: "ERROR", result: "失败", fileName: "CFX96_甲型流感检测.xlsx", fileSize: 884736, requestGuid: "REQ-PCR-0803-0003", fdiseq: "", message: "读取文件失败：服务器返回异常", detail: "[2026-08-03 11:38:05] 读取文件：D:\\仪器数据\\CFX96\\CFX96_甲型流感检测.xlsx  失败！服务器返回异常 | {\"result\":\"error\",\"params\":{},\"errors\":{}}" },
    { logId: "LOG202608020002", clientId: "LL-Agilent1200-01", deviceId: "DEV-LH-HPLC", eventTime: "2026-08-02 16:45:32", receiveTime: "2026-08-02 16:45:33", logType: "文件上传", level: "INFO", result: "成功", fileName: "6_液相色谱仪.pdf", fileSize: 1857634, requestGuid: "REQ-HPLC-0802-0002", fdiseq: "CJ202608030002", message: "成功: 6_液相色谱仪.pdf", detail: "[2026-08-02 16:45:32] 成功: 6_液相色谱仪.pdf" },
    { logId: "LOG202608010001", clientId: "LL-IcaptqICPMS-01", deviceId: "DEV-LH-ICPMS", eventTime: "2026-08-01 08:16:31", receiveTime: "2026-08-01 08:16:32", logType: "追踪文件", level: "WARN", result: "失败", fileName: "", fileSize: 0, requestGuid: "", fdiseq: "", message: "读取追踪文件失败，将重新初始化", detail: "读取追踪文件失败，将重新初始化：D:\\instrument-monitor\\ICPMS\\uploaded_files.json" },
  ];
  var strategyLogs = [
    { auditId: "AUD202608040007", strategyId: "STR-LL-HPLC-01", strategyName: "安捷伦1200文件夹监听策略", clientId: "LL-Agilent1200-01", deviceId: "DEV-LH-HPLC", operationType: "修改", operationTime: "2026-08-04 10:12:36", operator: "监*一", operationSource: "采集配置管理", syncResult: "同步成功", changeSummary: "扫描间隔由20秒调整为10秒", changes: [{ field: "扫描间隔", before: "20秒", after: "10秒" }] },
    { auditId: "AUD202608040006", strategyId: "STR-LL-ICPMS-01", strategyName: "ICP-MS结果文件采集策略", clientId: "LL-IcaptqICPMS-01", deviceId: "DEV-LH-ICPMS", operationType: "启用", operationTime: "2026-08-04 09:28:14", operator: "监*一", operationSource: "采集配置管理", syncResult: "同步成功", changeSummary: "策略状态由停用调整为启用", changes: [{ field: "策略状态", before: "停用", after: "启用" }] },
    { auditId: "AUD202608030005", strategyId: "STR-JC-PCR-01", strategyName: "CFX96结果文件采集策略", clientId: "JC-CFX96deep-01", deviceId: "DEV-JC-PCR", operationType: "修改", operationTime: "2026-08-03 16:42:08", operator: "赵*楠", operationSource: "采集配置管理", syncResult: "同步成功", changeSummary: "调整监听目录并启用文件追踪", changes: [{ field: "监听目录", before: "D:\\仪器数据\\CFX96_old\\", after: "D:\\仪器数据\\CFX96\\" }, { field: "文件追踪", before: "关闭", after: "启用" }] },
    { auditId: "AUD202608030004", strategyId: "STR-LW-MALDI-01", strategyName: "布鲁克质谱报告采集策略", clientId: "LW-NewAutofex-01", deviceId: "DEV-WSW-MALDI", operationType: "修改", operationTime: "2026-08-03 14:08:52", operator: "杨*顺", operationSource: "采集配置管理", syncResult: "同步失败", changeSummary: "修改监听目录，客户端暂未完成同步", changes: [{ field: "监听目录", before: "D:\\仪器数据\\Autofex\\", after: "D:\\仪器数据\\NewAutofex\\" }] },
    { auditId: "AUD202608020003", strategyId: "STR-LL-GC-01", strategyName: "气相色谱结果文件采集策略", clientId: "LL-Agilent7890A-01", deviceId: "DEV-LH-GC", operationType: "新增", operationTime: "2026-08-02 11:32:19", operator: "刘*辉", operationSource: "采集配置管理", syncResult: "同步成功", changeSummary: "新增文件夹监听采集策略", changes: [{ field: "采集方式", before: "--", after: "文件夹监听" }, { field: "扫描间隔", before: "--", after: "20秒" }] },
    { auditId: "AUD202608020002", strategyId: "STR-JC-PCR-01", strategyName: "CFX96结果文件采集策略", clientId: "JC-CFX96deep-01", deviceId: "DEV-JC-PCR", operationType: "停用", operationTime: "2026-08-02 10:16:44", operator: "赵*楠", operationSource: "采集配置管理", syncResult: "同步成功", changeSummary: "暂停结果文件自动采集", changes: [{ field: "策略状态", before: "启用", after: "停用" }] },
    { auditId: "AUD202608010001", strategyId: "STR-LL-HPLC-01", strategyName: "安捷伦1200文件夹监听策略", clientId: "LL-Agilent1200-01", deviceId: "DEV-LH-HPLC", operationType: "新增", operationTime: "2026-08-01 09:06:27", operator: "熊*菀", operationSource: "采集配置管理", syncResult: "同步成功", changeSummary: "建立客户端与仪器采集策略", changes: [{ field: "采集方式", before: "--", after: "文件夹监听" }, { field: "监听目录", before: "--", after: "D:\\仪器数据\\Agilent1200\\" }] },
  ];
  var collectionStrategies = [
    { strategyId: "STR-LL-ICPMS-01", strategyName: "ICP-MS结果文件采集策略", departmentId: "DEPT-LH", deviceId: "DEV-LH-ICPMS", clientId: "LL-IcaptqICPMS-01", owner: "监*一", collectionMode: "HTTP文件夹监听", interfaceType: "http", filepath: "D:\\仪器数据\\IcaptqICPMS\\", frequency: 20, service: "8897", startrow: 1, sampcolflag: "样品名称", trackMode: "启用", heartbeatInterval: 60, archiveMode: "上传成功后记录追踪", outputDir: "", filenameTemplate: "{instno}_{datetime}_{seq}.csv", status: "启用", version: "V1.2", scriptId: "SCRIPT-ICPMS-01", updateTime: "2026-08-04 09:28:14" },
    { strategyId: "STR-LL-HPLC-01", strategyName: "安捷伦1200文件夹监听策略", departmentId: "DEPT-LH", deviceId: "DEV-LH-HPLC", clientId: "LL-Agilent1200-01", owner: "熊*菀", collectionMode: "HTTP文件夹监听", interfaceType: "http", filepath: "D:\\仪器数据\\Agilent1200\\", frequency: 10, service: "8897", startrow: 1, sampcolflag: "Sample Name", trackMode: "启用", heartbeatInterval: 60, archiveMode: "上传成功后记录追踪", outputDir: "", filenameTemplate: "{instno}_{datetime}_{seq}.csv", status: "启用", version: "V1.3", scriptId: "SCRIPT-HPLC-01", updateTime: "2026-08-04 10:12:36" },
    { strategyId: "STR-LW-MALDI-01", strategyName: "布鲁克质谱报告采集策略", departmentId: "DEPT-WSW", deviceId: "DEV-WSW-MALDI", clientId: "LW-NewAutofex-01", owner: "监*一", collectionMode: "HTTP文件夹监听", interfaceType: "http", filepath: "D:\\仪器数据\\NewAutofex\\", frequency: 20, service: "8897", startrow: 1, sampcolflag: "样品编号", trackMode: "启用", heartbeatInterval: 60, archiveMode: "上传成功后记录追踪", outputDir: "", filenameTemplate: "{instno}_{datetime}_{seq}.pdf", status: "启用", version: "V1.1", scriptId: "SCRIPT-MALDI-01", updateTime: "2026-08-03 14:08:52" },
    { strategyId: "STR-JC-PCR-01", strategyName: "CFX96结果文件采集策略", departmentId: "DEPT-JC", deviceId: "DEV-JC-PCR", clientId: "JC-CFX96deep-01", owner: "赵*楠", collectionMode: "HTTP文件夹监听", interfaceType: "http", filepath: "D:\\仪器数据\\CFX96\\", frequency: 20, service: "8897", startrow: 1, sampcolflag: "Sample", trackMode: "启用", heartbeatInterval: 60, archiveMode: "上传成功后记录追踪", outputDir: "", filenameTemplate: "{instno}_{datetime}_{seq}.xlsx", status: "停用", version: "V2.0", scriptId: "SCRIPT-PCR-01", updateTime: "2026-08-03 16:42:08" },
    { strategyId: "STR-LL-GC-01", strategyName: "气相色谱结果文件采集策略", departmentId: "DEPT-LH", deviceId: "DEV-LH-GC", clientId: "LL-Agilent7890A-01", owner: "监*一", collectionMode: "USB存储采集", interfaceType: "usb", filepath: "D:\\仪器数据\\Agilent7890A\\", frequency: 20, service: "8897", startrow: 1, sampcolflag: "Sample", trackMode: "启用", heartbeatInterval: 60, archiveMode: "本地复制后上传", usbMode: "mass_storage", usbPollInterval: 5, outputDir: "D:\\仪器数据\\Agilent7890A\\", filenameTemplate: "{instno}_{datetime}_{seq}.csv", status: "启用", version: "V1.0", scriptId: "", updateTime: "2026-08-02 11:32:19" }
  ];
  var strategyScripts = [
    { scriptId: "SCRIPT-ICPMS-01", strategyId: "STR-LL-ICPMS-01", scriptName: "ICP-MS文件解析前置规则", scriptType: "采集规则脚本", version: "V1.2", status: "启用", updateBy: "监*一", updateTime: "2026-08-04 09:20:11", content: "function prepare(file) {\n  return { instno: 'ICPMS', startrow: 1, sampleColumn: '样品名称' };\n}" },
    { scriptId: "SCRIPT-HPLC-01", strategyId: "STR-LL-HPLC-01", scriptName: "安捷伦液相文件筛选规则", scriptType: "文件筛选脚本", version: "V1.3", status: "启用", updateBy: "熊*菀", updateTime: "2026-08-04 10:08:04", content: "function accept(file) {\n  return /\\.(pdf|xlsx|csv)$/i.test(file.name);\n}" },
    { scriptId: "SCRIPT-MALDI-01", strategyId: "STR-LW-MALDI-01", scriptName: "布鲁克报告归档规则", scriptType: "归档规则脚本", version: "V1.1", status: "启用", updateBy: "杨*顺", updateTime: "2026-08-03 14:03:20", content: "function archive(file) {\n  return { directory: 'NewAutofex', keepOriginal: true };\n}" },
    { scriptId: "SCRIPT-PCR-01", strategyId: "STR-JC-PCR-01", scriptName: "CFX96结果文件识别规则", scriptType: "文件筛选脚本", version: "V2.0", status: "停用", updateBy: "赵*楠", updateTime: "2026-08-03 16:35:28", content: "function accept(file) {\n  return /CFX96.*\\.xlsx$/i.test(file.name);\n}" }
  ];
  var scriptDebugRecords = [
    { debugId: "DEBUG-20260804001", scriptId: "SCRIPT-ICPMS-01", debugTime: "2026-08-04 09:22:36", operator: "监*一", inputFile: "ICPMS_金属元素批量检测结果.xlsx", result: "成功", output: "识别仪器编号 ICPMS，数据起始行 1。" },
    { debugId: "DEBUG-20260804002", scriptId: "SCRIPT-HPLC-01", debugTime: "2026-08-04 10:09:18", operator: "熊*菀", inputFile: "HPLC_食品添加剂检测报告.pdf", result: "成功", output: "文件扩展名 pdf，符合采集规则。" }
  ];
  var projectMappings = [
    { mappingId: "MAP-ICPMS-PB", departmentId: "DEPT-LH", deviceId: "DEV-LH-ICPMS", sourceCode: "Pb", sourceName: "铅(Pb)", standardCode: "JCXM-PB", standardName: "铅", unit: "mg/L", status: "启用", updateBy: "监*一", updateTime: "2026-08-04 09:15:30" },
    { mappingId: "MAP-ICPMS-CD", departmentId: "DEPT-LH", deviceId: "DEV-LH-ICPMS", sourceCode: "Cd", sourceName: "镉(Cd)", standardCode: "JCXM-CD", standardName: "镉", unit: "mg/L", status: "启用", updateBy: "监*一", updateTime: "2026-08-04 09:16:08" },
    { mappingId: "MAP-ICPMS-AS", departmentId: "DEPT-LH", deviceId: "DEV-LH-ICPMS", sourceCode: "As", sourceName: "砷(As)", standardCode: "JCXM-AS", standardName: "砷", unit: "mg/L", status: "启用", updateBy: "监*一", updateTime: "2026-08-04 09:16:42" },
    { mappingId: "MAP-HPLC-BHA", departmentId: "DEPT-LH", deviceId: "DEV-LH-HPLC", sourceCode: "BHA", sourceName: "丁基羟基茴香醚", standardCode: "JCXM-BHA", standardName: "丁基羟基茴香醚", unit: "mg/kg", status: "启用", updateBy: "熊*菀", updateTime: "2026-08-03 16:20:17" },
    { mappingId: "MAP-HPLC-BHT", departmentId: "DEPT-LH", deviceId: "DEV-LH-HPLC", sourceCode: "BHT", sourceName: "二丁基羟基甲苯", standardCode: "JCXM-BHT", standardName: "二丁基羟基甲苯", unit: "mg/kg", status: "启用", updateBy: "熊*菀", updateTime: "2026-08-03 16:21:09" },
    { mappingId: "MAP-PCR-CT", departmentId: "DEPT-JC", deviceId: "DEV-JC-PCR", sourceCode: "Ct", sourceName: "Ct值", standardCode: "JCXM-PCR-CT", standardName: "循环阈值", unit: "", status: "停用", updateBy: "赵*楠", updateTime: "2026-08-02 10:18:32" }
  ];
  var configDataSources = [
    { sourceId: "DS-ICPMS-RESULT", sourceName: "ICP-MS检测结果数据源", sourceType: "Oracle", purpose: "原始记录生成", departmentId: "DEPT-LH", connectionString: "oracle://htlis:******@lisdb", sql: "select sampno, itemseq, rslt, unit from lis_instdata_new where fguid = :fguid", status: "启用", description: "按采集文件标识查询ICP-MS解析结果。", references: ["TPL-ICPMS-01"], updateBy: "监*一", updateTime: "2026-08-04 09:10:12" },
    { sourceId: "DS-HPLC-RESULT", sourceName: "液相色谱检测结果数据源", sourceType: "Oracle", purpose: "原始记录生成", departmentId: "DEPT-LH", connectionString: "oracle://htlis:******@lisdb", sql: "select sampno, itemseq, rslt from lis_instdata_new where finstno = :instno and fguid = :fguid", status: "启用", description: "液相色谱原始记录数据源。", references: ["TPL-HPLC-01"], updateBy: "熊*菀", updateTime: "2026-08-03 15:48:21" },
    { sourceId: "DS-PROJECT-MAP", sourceName: "仪器项目标准对照数据源", sourceType: "平台查询", purpose: "项目对照", departmentId: "DEPT-LH", connectionString: "ynjk/project-mapping", sql: "select source_code, standard_code, standard_name, unit from syssjcj_project_mapping where status = '启用'", status: "启用", description: "提供仪器项目与标准项目对应关系。", references: ["TPL-ICPMS-01", "TPL-HPLC-01"], updateBy: "监*一", updateTime: "2026-08-02 11:05:33" },
    { sourceId: "DS-PCR-RESULT", sourceName: "PCR结果数据源", sourceType: "Oracle", purpose: "报告模板", departmentId: "DEPT-JC", connectionString: "oracle://htlis:******@lisdb", sql: "select sampno, rslt1, rslt2, rsltdesc from lis_instdata_new where fguid = :fguid", status: "停用", description: "PCR检测结果查询。", references: [], updateBy: "赵*楠", updateTime: "2026-08-01 14:28:09" }
  ];

  var records = [
    {
      recordId: "REC202608030001",
      name: "生活饮用水金属元素检测原始记录",
      templateId: "TPL-ICPMS-01",
      mode: "样品模式",
      departmentId: "DEPT-LH",
      deviceId: "DEV-LH-ICPMS",
      dataIds: ["DATA-0001", "DATA-0002"],
      sampleCategories: ["ENV-WATER-DRINKING"],
      sampleCount: 1,
      projectCount: 2,
      experimentRange: "2026-08-03 08:40:12 至 2026-08-03 08:40:12",
      createTime: "2026-08-03 10:05:22",
      creator: "监*一",
    },
    {
      recordId: "REC202608020002",
      name: "呼吸道病毒实时荧光PCR检测原始记录",
      templateId: "TPL-PCR-01",
      mode: "项目模式",
      departmentId: "DEPT-JC",
      deviceId: "DEV-JC-PCR",
      dataIds: ["DATA-0008", "DATA-0009"],
      sampleCategories: ["BIO-THROAT-SWAB"],
      sampleCount: 2,
      projectCount: 1,
      experimentRange: "2026-08-02 13:18:31 至 2026-08-02 13:20:14",
      createTime: "2026-08-02 15:10:06",
      creator: "监*一",
    },
  ];

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }
  function find(list, key, value) {
    return (
      list.find(function (item) {
        return item[key] === value;
      }) || null
    );
  }
  function enrichDocument(documentItem) {
    var result = clone(documentItem),
      device = find(devices, "deviceId", result.deviceId) || {};
    result.instno = device.instno || "";
    result.deviceName = device.name || "";
    result.departmentId = device.departmentId || "";
    result.lastParseTime = result.lastParseTime || result.collectTime;
    return result;
  }
  function enrichSpectrum(item) {
    var result = clone(item),
      device = find(devices, "deviceId", result.deviceId) || {},
      file = find(documents, "fdiseq", result.fdiseq) || {};
    result.instno = device.instno || "";
    result.device = device.name || "";
    result.file = file.fileName || "";
    return result;
  }
  function read(key, fallback) {
    try {
      return JSON.parse(
        global.sessionStorage.getItem(key) || JSON.stringify(fallback),
      );
    } catch (error) {
      return clone(fallback);
    }
  }
  function write(key, value) {
    try {
      global.sessionStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn("标准模拟数据保存失败：", error);
    }
  }
  function getDocuments() {
    return read(KEYS.documents, documents).map(enrichDocument);
  }
  function setDocuments(value) {
    write(
      KEYS.documents,
      value.map(function (item) {
        var copy = clone(item);
        delete copy.deviceName;
        delete copy.instno;
        delete copy.departmentId;
        return copy;
      }),
    );
  }
  function getRecords() {
    return read(KEYS.records, records);
  }
  function setRecords(value) {
    write(KEYS.records, value);
  }
  function getTemplates() {
    return read(KEYS.templates, templates);
  }
  function setTemplates(value) {
    write(KEYS.templates, value);
  }
  function getClients() {
    return read(KEYS.clients, clients);
  }
  function setClients(value) {
    write(KEYS.clients, value);
  }
  function getClientLogs() {
    return read(KEYS.clientLogs, clientLogs);
  }
  function setClientLogs(value) {
    write(KEYS.clientLogs, value);
  }
  function getStrategyLogs() {
    return read(KEYS.strategyLogs, strategyLogs);
  }
  function setStrategyLogs(value) {
    write(KEYS.strategyLogs, value);
  }
  function getCollectionStrategies() {
    return read(KEYS.collectionStrategies, collectionStrategies);
  }
  function setCollectionStrategies(value) {
    write(KEYS.collectionStrategies, value);
  }
  function getStrategyScripts() {
    return read(KEYS.strategyScripts, strategyScripts);
  }
  function setStrategyScripts(value) {
    write(KEYS.strategyScripts, value);
  }
  function getScriptDebugRecords() {
    return read(KEYS.scriptDebugRecords, scriptDebugRecords);
  }
  function setScriptDebugRecords(value) {
    write(KEYS.scriptDebugRecords, value);
  }
  function getProjectMappings() {
    return read(KEYS.projectMappings, projectMappings);
  }
  function setProjectMappings(value) {
    write(KEYS.projectMappings, value);
  }
  function getConfigDataSources() {
    return read(KEYS.configDataSources, configDataSources);
  }
  function setConfigDataSources(value) {
    write(KEYS.configDataSources, value);
  }
  function getDashboardData() {
    var docs = getDocuments(),
      recordList = getRecords(),
      map = {};
    docs.forEach(function (item) {
      var day = item.collectTime.slice(0, 10),
        key = day + "|" + item.deviceId;
      if (!map[key]) {
        map[key] = [day, item.deviceId, 0, 0, 0];
      }
      map[key][2] += 1;
      map[key][3] += Number(item.dataCount) || 0;
    });
    recordList.forEach(function (item) {
      var day = item.createTime.slice(0, 10),
        key = day + "|" + item.deviceId;
      if (!map[key]) {
        map[key] = [day, item.deviceId, 0, 0, 0];
      }
      map[key][4] += 1;
    });
    return {
      devices: devices.map(function (item) {
        return [item.deviceId, item.name];
      }),
      daily: Object.keys(map).map(function (key) {
        return map[key];
      }),
    };
  }
  function reset() {
    Object.keys(KEYS).forEach(function (name) {
      global.sessionStorage.removeItem(KEYS[name]);
    });
  }

  global.SyssjcjMockData = {
    version: VERSION,
    keys: clone(KEYS),
    getDepartments: function () {
      return clone(departments);
    },
    getDevices: function () {
      return clone(devices);
    },
    getDocuments: getDocuments,
    setDocuments: setDocuments,
    getTemplates: getTemplates,
    setTemplates: setTemplates,
    getClients: getClients,
    setClients: setClients,
    getClientLogs: getClientLogs,
    setClientLogs: setClientLogs,
    getHeartbeatLogs: function () {
      return clone(heartbeatLogs);
    },
    getStrategyLogs: getStrategyLogs,
    setStrategyLogs: setStrategyLogs,
    getCollectionStrategies: getCollectionStrategies,
    setCollectionStrategies: setCollectionStrategies,
    getStrategyScripts: getStrategyScripts,
    setStrategyScripts: setStrategyScripts,
    getScriptDebugRecords: getScriptDebugRecords,
    setScriptDebugRecords: setScriptDebugRecords,
    getProjectMappings: getProjectMappings,
    setProjectMappings: setProjectMappings,
    getConfigDataSources: getConfigDataSources,
    setConfigDataSources: setConfigDataSources,
    getDataRows: function () {
      return clone(dataRows);
    },
    getSpectra: function () {
      return spectra.map(enrichSpectrum);
    },
    getRecords: getRecords,
    setRecords: setRecords,
    getDashboardData: getDashboardData,
    getDepartment: function (id) {
      return clone(find(departments, "departmentId", id));
    },
    getDevice: function (id) {
      return clone(find(devices, "deviceId", id));
    },
    getDocument: function (id) {
      return clone(find(getDocuments(), "fdiseq", id));
    },
    reset: reset,
  };
})(window);
