# 实验室物联监控子模块

## 使用范围与事实来源

本参考适用于 `D:\Desktop\CodeTalkers\实验室物联监控子模块` 中的 `syswljk_*` 页面、`sql/ynjksys` 注册 SQL、基础前后端交互和本地 Conda 同步。当前范围不新增 Java 接口。

事实优先级为：数据库表结构和实际查询结果、仓库 `开发指导与数据关联边界.md`、平台注册 SQL、页面服务映射、前端展示。页面示例和 Mock 不能反向定义数据库语义。

## 环境监测正式业务模型

正式环境业务使用以下五张表：

| 表 | 职责 |
| --- | --- |
| `HTLIS.LIS_LIBDEF` | 检验室/实验室档案及实验室温度、湿度、压力上下限 |
| `HTLIS.LP_TBC_INSTFILE` | 仪器设备主档，`INSTID` 为仪器业务主键 |
| `HTLIS.LP_TBC_CIRCUDEFM` | 环境项目定义 |
| `HTLIS.LIS_MCIRCSLOG` | 一次环境/仪器监测记录主表 |
| `HTLIS.LIS_DCIRCSLOG` | 正式项目值明细表 |

固定关系：

```text
LIS_LIBDEF.LIBSEQ -> LP_TBC_INSTFILE.LIBSEQ
LIS_LIBDEF.LIBSEQ -> LIS_MCIRCSLOG.LIBSEQ
LP_TBC_INSTFILE.INSTID -> LIS_MCIRCSLOG.INSTID
LIS_MCIRCSLOG.CIRCSLOGSEQ -> LIS_DCIRCSLOG.CIRCSLOGSEQ
LP_TBC_CIRCUDEFM.CIRCUITEMID -> LIS_DCIRCSLOG.CIRCUITEMID
```

稳定页面标识：

- 实验室对象：`LAB:<LIBSEQ>`；
- 仪器对象：`INST:<INSTID>`；
- 环境条件要求：`LAB:<LIBSEQ>:<项目编码>`；
- 监测明细：`<CIRCSLOGSEQ>:<CIRCUITEMID>`。

当主记录同时具有 `INSTID` 和 `LIBSEQ` 时，以仪器为监测对象、实验室为归属环境，不重复生成实验室监测记录。历史项目名称和单位优先使用 `LIS_DCIRCSLOG.ITEMNAME/MEASUREWORD` 快照，定义表只作缺失回填。项目级历史判定使用明细 `IFOK`，不得用当前阈值重算并覆盖历史结论。

`ITEMVALUE/OKVALUE1/OKVALUE2/VALUEDEF` 是字符字段。趋势和数值统计只能接纳通过显式数值校验的值，避免 `ORA-01722`。厂家未确认 `IFOK/FTYPE/FMODE` 代码含义前，只展示原始状态值，不翻译为正常、超限或采集方式。

## 当前数据事实（2026-08-20）

实际 `count(*)`：

```text
LIS_LIBDEF       202
LP_TBC_INSTFILE  244
LP_TBC_CIRCUDEFM 3
LIS_MCIRCSLOG    33
LIS_DCIRCSLOG    0
```

33 条主记录当前均不能关联现有实验室和仪器档案；正式明细表为 0 行。因此当前只能真实展示实验室、仪器、项目定义和实验室温湿压要求，不能展示监测值、最新值、趋势或数值汇总。成功且 0 行是正常空结果，不得切换 Mock，也不得用主表 `IFOK` 伪造项目值。

## 已固定的页面与查询

| 查询号 | 页面职责 | 正式来源 |
| --- | --- | --- |
| `ynjksys_hjjc_wsd_sb01q` | 环境监测对象 | `LIS_LIBDEF + LP_TBC_INSTFILE` |
| `ynjksys_hjjc_wsd_bz01q` | 环境项目定义 | `LP_TBC_CIRCUDEFM` |
| `ynjksys_hjjc_hjyq01q` | 实验室环境条件要求 | `LIS_LIBDEF` |
| `ynjksys_hjjc_wsd_jl01q` | 监测记录明细 | `LIS_MCIRCSLOG + LIS_DCIRCSLOG` |
| `ynjksys_hjjc_wsd_jl02q` | 监测记录汇总 | 同上 |
| `ynjksys_hjjc_wsd_zx01q` | 最新项目值 | 同上 |
| `ynjksys_hjjc_wsd_qs01q` | 数值趋势 | 同上 |

页面现状：

- 维护环境条件项目改为项目定义只读视图；写权限和公共字典维护归属确认前，不开放新增、修改或停用。
- 环境设备条件一览表展示 `LIS_LIBDEF` 中可结构化的温度、湿度、压力要求；不把 `INSTFILE.ENVIRONMENT` 自由文本拆成阈值。
- 环境条件采集与环境记录保留动态项目、真实单位、对象筛选、明细、最新值、趋势和汇总字段契约；明细无数据时正常显示空结果。
- 数据采集管理和物联查询统计复用环境记录服务；非数值原始值可进明细，只有数值可进图表和统计。
- 智能预警继续使用独立预警事件、通知和处置数据。`MCIRCSLOG/DCIRCSLOG` 只能证明历史监测结果，不能代替预警闭环。

上述 SQL 和前端源码已完成，相关静态与模板已同步本地 Conda；仍须由使用者在平台注册/更新 7 个查询号并在服务启动后完成实际入口验证。不要把“代码已完成”写成“数据库已有明细”或“厂家接口已接通”。

## 其他业务边界

- 能耗：`INSTID` 关联仪器，`FSSID` 仅表示智能插座/采集端。历史、最新状态和累计值是不同概念；旧能耗数据无法匹配现档案时保留左连接回退，不改写业务键。
- 物联配置：仪器与实验室档案可提供基本信息，但 IP、端口、周期、预警启用、账号、权限和硬件绑定需要独立配置表或厂家接口。
- 状态监测：仪器档案 `STATUS` 不能冒充在线、离线、关机等实时状态。
- 预警：旧 `IP_TBS_MONITORALARM` 可支持历史事件；通知结果、处理过程和关闭审计必须来自独立真实数据。
- 门禁：`USERINFO.USERID -> CHECKINOUT.USERID`，`LABAREA.SN -> CHECKINOUT.SN`。历史出入不能冒充门状态、控制器在线状态或远程开锁能力。
- 一卡通：只查询外部人员主档与人员活动，不在本模块维护人员、卡、人脸或权限。
- 全局不引入水浸设备、指标、筛选或 Mock 内容。

## 厂家对接后的推进顺序

1. 确认厂家采集对象如何稳定对应 `LIBSEQ/INSTID`，不得按名称或页面顺序猜测。
2. 确认一次采集如何事务写入一条 `MCIRCSLOG` 和多条 `DCIRCSLOG`，以及幂等键、重传、失败回滚和原始报文留存方案。
3. 确认 `CIRCUITEMID/ITEMCODE`、单位、精度、`IFOK/FTYPE/FMODE` 字典和设备时钟口径。
4. 取得至少包含多对象、多项目、正常/异常、重复上报和断线补传的真实样例，再验证 7 个查询号。
5. 明确机构隔离链路。环境表缺少 `FHIINO` 时，只能通过可信仪器档案或已确认的部门链路限定范围，不能无范围返回全库。
6. 再接外部接口、实时状态、采集执行日志和预警闭环；这些能力使用各自的数据源，不挤入环境监测主细表。
7. 最后根据已确认字典开放状态中文翻译、图表统计、预警判断和必要的维护入口。

验收时分别报告：代码与映射是否完成、查询号是否注册、数据库是否已有明细、厂家接口是否联通、本地 Conda 是否验证、服务器是否部署。任一项未验证都必须明确保留为待办。
