---
name: lab-equipment-data-acquisition
description: Develop, diagnose, test, and deploy the 云南省疾控实验室设备数据采集子模块 across its Windows Python/Go collection clients, 智源 Java service interfaces, Oracle tables, Django/SQL-registration platform pages, local Conda environment, and server environment. Use for work involving syssjcj_* pages, ynjksys SQL registrations, instrument parsers, file/BLOB preview or download, client heartbeat/logging, original-record generation, equipment dictionaries, or end-to-end laboratory instrument acquisition workflows.
---

# 实验室设备数据采集子模块开发

## 开始工作

1. 先阅读现有文件和用户指定的开发规范，不凭记忆重建平台约定。
2. 先判断任务属于客户端、Java 服务、Oracle、智源前端、部署或跨层联调。
3. 根据任务读取对应参考资料：
   - 全链路与组件职责：`references/architecture-and-workflow.md`
   - 路径、命名与部署：`references/environments-and-deployment.md`
   - 数据表、页面和查询号：`references/data-model-and-pages.md`
   - 仪器清单与能力分级：`references/equipment-inventory-and-capability.md`
   - 当前完成度和后续路线：`references/current-status-and-roadmap.md`
4. 优先沿用 `D:\Desktop\云南省疾控实验室ai\智源Conda分层部署开发Skill.md` 中的平台交互、参数传递和部署规则。
5. 用户处于功能规划阶段时，只输出边界、页面、按钮、跳转和交互方案；获得明确批准后再开发页面。

## 事实优先级

按以下顺序判断系统真实能力：

1. 当前数据库结构、真实查询结果和运行日志。
2. 已部署并验证的客户端 EXE 与 Java 接口。
3. SVN 正式工程代码和 `instnoClass.properties`。
4. CodeTalkers 开发工作区代码。
5. 《已调研对接仪器清单(1).xlsx》与配置规划。
6. 前端模拟数据。

不得把“清单中可接入”“已有解析器类”“已配置客户端”和“已产生可靠入库数据”混为一谈。当前正式页面默认只把已有可靠数据的 `AGILENT-1200`、`BRUKER-MICROFLEX` 视为已验证设备；扩展前必须取得相应数据库证据。

## 核心业务通路

围绕以下主链路开发和排障：

```text
仪器输出文件
  -> Windows 客户端监听目录/USB/串口
  -> HTTP POST /yncdc/UploadInstDataFilesNew.m
  -> Factory.getInstance(instno)
  -> instnoClass.properties 对应解析器.parse
  -> HII 归档文件与 HTLIS 解析数据入库
  -> ynjksys 注册 SQL 查询/提交
  -> syssjcj_* 页面展示、分析和业务操作
```

客户端心跳使用：

```text
客户端 -> /yncdc/UploadClientLog.m
       -> HTLIS.LIS_CLIENT_INFO + HTLIS.LIS_HEARTBEAT_LOG
       -> 采集数据日志页面
```

## 开发约束

- 前端不得直接连接 Oracle；查询使用 `isqrydata.query()`，增删改使用 `issubmit` 与平台注册 SQL。
- 页面公共参数固定以 `hp=ynjksys`、`dbnm=ynjk` 为基线，继承有效 `sessionId`，不得写入 `sessionId=None`。
- 源码按三级功能分文件夹；同步到本地 Conda 和服务器时，HTML/JS/CSS 直接平铺在 `ynjksys` 下，不保留三级目录。
- 文件名使用 `syssjcj_<三级功能缩写>_*`；SQL 查询号按 `01001/02001/...` 功能分段。
- 页面下钻使用遮罩悬浮窗，不另开浏览器窗口；操作列放第一列；长文本和完整时间提供悬浮全文。
- 解析状态只使用“解析成功/解析失败”。有解析入库行即成功；客户端已上传但无解析入库行即失败。解析执行期间用遮罩阻止其他操作。
- 模拟数据保留为可回档代码，但真实链路启用后用注释或配置开关隔离，不删除历史模拟实现。
- 不修改无关全局环境、平台公共代码、既有解析器或 PDFBox 依赖；当前新增 PDF 功能以 PDFBox 2.0.27 开发。
- Java 新接口先在 `D:\Desktop\CodeTalkers\inst\data` 开发验证，再同步到 SVN 正式路径，最后编译打包上传服务端。
- 删除、重解析和原始记录生成必须由服务端或注册 SQL 在事务中完成，并校验身份、机构、对象存在性及影响行数。
- 不把数据库密码、生产会话或个人敏感信息写入 Skill、前端 JS 或版本库。

## 任务工作流

### 修改客户端

1. 判断目标系统：Python 客户端面向 Windows 10+；Go 客户端面向 Windows 7 32 位兼容场景，也存在 Win10 x64 构建。
2. 核对 `config.ini` 的 `instno`、`filepath`、`service`、`client_id`、`lab_id`、监听模式和心跳间隔。
3. 保持 Python 与 Go 的上传、去重跟踪、日志和心跳语义一致。
4. 用真实样例文件和实际客户端日志验证，不臆造客户端不会产生的日志文本。

### 修改解析器或 Java 接口

1. 从 `UploadInstDataFilesNew.java`、`Factory.java`、`instnoClass.properties` 追踪调用。
2. 核对接口配置表 `LIS_INSTIFC_DEF` 和解析结果列 `RSLT/RSLT1...RSLT6` 的仪器语义。
3. 在 CodeTalkers 工作区修改；需要进入正式工程时，仅同步本次相关文件到 SVN 路径。
4. 用 Eclipse/本地测试类验证，再打包部署；不要假定源码存在即代表服务器已部署。

### 修改数据库或平台注册 SQL

1. 先用 PL/SQL 验证表、字段类型、数据归属和关联基数。
2. 使用显式转换，避免 Oracle 隐式转换引发 `ORA-01722`。
3. 结构变更先检查现有列、约束、索引和数据量，再执行升级脚本。
4. SQL 文件落在 `sql/ynjksys`，注册后再接前端。
5. 对真实数据查询统一限定有效 `INSTFILE` 归档关系，避免把 `IB_TBS_DETAILEDINF` 中其他业务附件误当仪器采集文件。

### 修改页面

1. 先确认页面功能边界，不添加需求未提出且非业务必需的模块。
2. 复用平台公共控件、查询、提交、弹窗和 ECharts。
3. 查询条件只保留能真实作用于主列表的字段；生成业务的约束放到生成工作页。
4. 多选跨页时按稳定唯一键保存选择，不按页内索引保存。
5. 修改后同步本地 Conda，检查静态资源、控制台、查询参数、弹窗链路和分页。

## 验证与交付

至少执行与改动相称的检查：

- JavaScript：`node --check`。
- SQL：PL/SQL 最小参数测试、字段类型检查、影响行数检查。
- Java：Eclipse 编译或目标测试类，必要时本地数据库下载/预览链路测试。
- Go：`go test` 和目标架构构建。
- Python：相关逻辑运行或打包前检查。
- 页面：本地 Conda 实际入口验证，确认资源无 404、参数正确、弹窗关闭和父页刷新正常。
- 部署：列出精确上传/注册/打包文件，不声称未执行的服务器操作已经完成。

最终说明本次影响了哪一层、验证了什么、仍有哪些依赖未部署，以及本地 Conda、SVN、服务器分别需要同步什么。
