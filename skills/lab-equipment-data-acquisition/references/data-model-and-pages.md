# 数据模型、页面与查询号

## 核心数据关系

### 归档文件

```text
HII.IB_TBS_DETAILEDINF
```

- `FDISEQ`：归档文件业务标识。
- `FFILENM`：URL 编码或原始文件名。
- `FCONTENT`：源文件 BLOB。
- `FOPDT`：归档/采集时间口径。
- `FHIINO`：数据归属机构。

该表包含大量其他业务附件，不能直接当仪器采集文件总表使用。

必须使用：

```text
HII.IB_TBS_TBLDAT
```

限定：

```sql
upper(trim(FTBLNM)) = 'INSTFILE'
and trim(FPKSEQ2) = 'F'
```

再按 `FDISEQ` 关联归档文件。

### 解析数据

```text
HTLIS.LIS_INSTDATA_NEW
```

- `FGUID`：解析数据行唯一标识。
- `FDISEQ`：关联归档文件。
- `FINSTNO`：接口/仪器编号。
- `SAMPNO/ITEMSEQ`：样品和检测项目关联字段。
- `RSLT/RSLT1...RSLT6/RSLTDESC/MW`：通用结果槽位，含义由解析器决定。
- `FOPDT`：解析入库时间。

个性表头不能从 `RSLT1...RSLT6` 字段名直接推导，应按 `FINSTNO` 使用解析器配置和项目对照映射。项目名称优先关联 `HTLIS.LP_TBC_INSTCHKITEM`。

当前固定结果单位：

- `AGILENT-1200`：主结果为峰面积，单位 `mAU*s`。
- `BRUKER-MICROFLEX`：主结果为最佳匹配 Score，单位“无量纲”。

### 接口定义

```text
HTLIS.LIS_INSTIFC_DEF
```

保存 `FINSTNO/FINSTNM/FDPTNO/FILETYPE/FSAMPCOLFLAG/FSTARROW` 等接口配置。Java 运行时类映射仍由 `instnoClass.properties` 决定，两者需要保持一致。

### 客户端状态

```text
HTLIS.LIS_CLIENT_INFO
HTLIS.LIS_HEARTBEAT_LOG
```

前者保存客户端当前状态，后者保存心跳轨迹。Java `UploadClientLog` 已实现对应 UPSERT/INSERT，但服务器部署状态必须单独确认。

### 原始记录

```text
HII.DCB_TBS_INSTORIGM  主表
HII.DCB_TBS_INSTORIGD  明细快照表
```

生成时按所选 `LIS_INSTDATA_NEW.FGUID` 在同一事务写主表和明细。主表 `FTEMPLSEQ` 必须为 `VARCHAR2(64)`，因为模板编号为 `TPL-HPLC-01` 等字符业务标识；若仍为 NUMBER 会出现 `ORA-01722`。

生成方式：

- `FILE`：所选数据来自同一 `FDISEQ`。
- `SAMPLE`：所选数据具有同一样品编号。
- `ITEM`：所选数据具有同一检测项目。

## 页面体系

### 采集主页

```text
hf=syssjcj_cjzy_home
01001q 设备选项
01002q 汇总
01003q 趋势
```

展示采集文件数量、采集数据数量和原始记录数量。采集数据量按解析入库行数统计；不展示解析成功率。三个指标卡可切换下方对应趋势。

### 采集文档和数据管理

```text
hf=syssjcj_cjwd_list
02001q 文件列表
02002q 文件详情
02003q 解析数据
02004q 设备选项
02005q 图谱文件
02006q 归档文件删除
02007q 解析数据删除
```

内部页：

- `syssjcj_cjwd_detail`：文件详情、解析摘要、文件预览、下载。
- `syssjcj_cjwd_parse_workspace`：查看/删除解析数据、解析信息、重新解析入口。
- `syssjcj_cjwd_spectrum_list`：图谱卡片查询。
- `syssjcj_cjwd_image_view`：原图缩放、原始大小、适合窗口。

主列表下载为直接操作；详情页不再重复进入解析工作页。重新解析期间禁止其他操作，成功后提示并刷新同一工作页。

### 实验室设备数据管理

```text
hf=syssjcj_sbsj_list
03001q 采集数据查询
03002q 设备词典
03003q 部门词典
03004q 样品类别词典
03005q 项目模板词典
03006q 原始记录生成写入
03007q 原始记录列表
03008q 原始记录详情
03009q 原始记录明细
```

主查询只放能直接过滤 `LIS_INSTDATA_NEW` 的部门、仪器、样品编号、检测项目和入库时间。样品类别、模板和生成方式放到生成工作页。跨页勾选必须以 `FGUID` 持久保存。

### 设备报告管理

```text
hf=syssjcj_sbbg_list
```

维护原始记录模板：上传、查看、数据源配置、顺序、在线编辑、下载、启停及适用范围。适用设备和样品类别使用树状勾选下拉，不使用难以编辑的多选滚动槽。当前真实数据库链路仍需继续落地。

### 采集数据日志

```text
hf=syssjcj_sjrq_list
```

包含客户端消息日志和采集策略维护日志。客户端数量、在线数量、上传成功和上传失败使用保守横向统计表。两个趋势图代码保留但暂不挂载。真实数据服务切换点位于 `syssjcj_sjrq_service.js`。

### 采集配置管理

```text
hf=syssjcj_cjpz_list
```

包含采集策略、项目对照表和数据源管理。脚本存储、发布和调试链路尚未具备，因此脚本相关渲染代码保留但注释隐藏。真实服务切换点位于 `syssjcj_cjpz_service.js`。

## 状态与分页规范

- 解析状态仅“解析成功/解析失败”。
- 分页固定采用上一页、页码、下一页、总页数、总条数、跳页；不展示“每页 N 条”选择框。
- 操作列始终放第一列。
- 删除后刷新当前列表或工作页，并保持查询条件。
- 长文本省略显示但必须通过 `title` 或统一悬浮组件展示全文。

## 物联监控与环境监测页面

`syswljk_*` 页面不沿用仪器文件解析表作为环境监测数据源。环境监测正式使用 `LIS_LIBDEF / LP_TBC_INSTFILE / LP_TBC_CIRCUDEFM / LIS_MCIRCSLOG / LIS_DCIRCSLOG`，其中 `LIS_DCIRCSLOG` 是正式项目值明细表。完整表关系、查询号、当前空数据事实和厂家后续接入边界见 [iot-monitoring-submodule.md](iot-monitoring-submodule.md)。

开发时必须区分：对象/项目档案已可展示、监测明细当前为 0 行、平台注册查询是否已更新、厂家接口是否已经联通。这四项不能合并表述为“已完成数据接入”。
