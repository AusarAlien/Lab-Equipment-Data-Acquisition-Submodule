# 仪器清单与能力分级

## 清单来源

```text
D:\Desktop\实验室数据采集子模块\已调研对接仪器清单(1).xlsx
```

清单为 2026-08-06 开发背景下的调研基线。Sheet1 共 234 台设备，字段包括部门、设备名称、品牌、型号、固定资产编号、网络条件、接口情况、位置、负责人、对接方式和是否收集结果文件。

部门分布：

| 部门 | 数量 |
|---|---:|
| 检验中心理化室 | 48 |
| 急传所 | 44 |
| 检验中心微生物室 | 32 |
| 结防所 | 22 |
| 免规所 | 16 |
| 检验中心毒理室 | 15 |
| 学校卫生所 | 14 |
| 性艾所 | 10 |
| 职放所 | 10 |
| 麻防所 | 8 |
| 消毒病媒所 | 6 |
| 环卫所 | 5 |
| 体检中心 | 4 |

调研状态中，“可接入”124 台、“已接入”9 台、“无法接入”87 台，另有部分行未填写；74 台标记需要收集结果文件。清单反映现场条件和规划，不证明当前采集子模块已经完成接入。

## 四级能力模型

为每台设备明确以下状态，页面词典和项目计划不得跨级推断：

1. **已调研**：只存在清单信息。
2. **可配置**：已经规划 `instno/client_id/lab_id/filepath` 或接入方式。
3. **解析器存在**：`instnoClass.properties` 能实例化对应 Java 类。
4. **已验证投产**：客户端、Java、数据库链路已有真实成功数据并完成页面核验。

当前正式页面可靠范围：

| FINSTNO | 清单设备 | 部门 | 资产编号 | 位置 | 当前证据 |
|---|---|---|---|---|---|
| AGILENT-1200 | Agilent 1200 液相色谱仪 | 检验中心理化室 | 000008145 | 4号楼508 | Java 解析器、接口配置、真实归档和解析入库数据 |
| BRUKER-MICROFLEX | BRUKER New autofex 飞行时间质谱 | 检验中心微生物室 | TY2016000034 | 4号楼308 | Java 解析器、接口配置、真实归档和解析入库数据 |

只在获得新的 `LIS_INSTIFC_DEF`、`instnoClass.properties`、客户端配置、归档数据和 `LIS_INSTDATA_NEW` 实际结果后，才把其他设备加入正式页面设备词典。

## 配置规划来源

```text
D:\Desktop\接口监听程序\仪器设备专属配置清单.md
```

该文档包含大量设备的建议 `instno`、`client_id`、实验室编号和文件路径。它可用于生成配置和规划批次，但其中“已有解析器”仍需与当前 SVN `instnoClass.properties` 及服务器部署包核对。

常用 `config.ini` 字段：

```text
type
instno
filepath
frequency
service
startrow
sampcolflag
track_mode
usb_mode
usb_drive_letters
usb_poll_interval
usb_local_copy_dir
com_port/com_baudrate/com_bytesize/com_stopbits/com_parity/com_timeout
data_mode
usb_output_dir
usb_filename_template
stream_format/frame_header/frame_footer/frame_length
client_id
client_type
client_ver
lab_id
heartbeat_interval
```

`client_id` 应唯一对应“实验室—物理设备—客户端实例”；不要仅使用可能被多台同型号设备共享的 `instno` 作为客户端唯一键。

## 前端词典规则

- 部门和设备的展示属性可从清单构建，但真实查询选项只显示已有可靠数据库映射的设备。
- 固定资产编号是展示/查询属性，不是跨表主键。
- 设备业务关联优先使用稳定 `FINSTNO` 加机构/客户端实例；多台同型号设备需要额外设备实例键。
- 清单中的负责人不在当前设备详情页面展示，也不作为主列表筛选条件。
- 样品类别是业务分类，不等于生成方式；模板适用范围应与仪器、样品类别分别建模。
