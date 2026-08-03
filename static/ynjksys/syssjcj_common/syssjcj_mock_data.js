(function (global) {
  "use strict";

  var VERSION = "20260804.4";
  var KEYS = {
    documents: "syssjcj_mock_documents_v1",
    records: "syssjcj_mock_records_v2",
    templates: "syssjcj_mock_templates_v1",
    selectedSpectrum: "syssjcj_mock_selected_spectrum_v1",
    generationContext: "syssjcj_mock_generation_context_v1",
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
