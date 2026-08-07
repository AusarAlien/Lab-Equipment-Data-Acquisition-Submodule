# 架构与工作流程

## 目录

1. 组件职责
2. 文件采集链路
3. 心跳与日志链路
4. 文件查看与业务操作
5. 跨层故障定位

## 组件职责

### 仪器与客户端

仪器在本地目录、USB 存储或串口产生数据。客户端负责发现、去重、上传和运行日志，不负责解析业务数据。

Python 主程序：

```text
D:\Desktop\接口监听程序\src\Listenmain.py
```

发布目录：

```text
D:\Desktop\接口监听程序\监听 程序 listener exe\Flistener_Python_v2.0_20260803
```

面向 Windows 10 及以上。支持目录监听、USB 存储、USB 串口等模式，上传文件到 `UploadInstDataFilesNew.m`，心跳到 `UploadClientLog.m`。

Go 源码：

```text
D:\Desktop\接口监听程序\监听 程序 listener exe\FlistenerGOWK
```

主要发布目录：

```text
D:\Desktop\接口监听程序\监听 程序 listener exe\LISTENERGO_Win7_x86_v1.0_20260803
D:\Desktop\接口监听程序\监听 程序 listener exe\LISTENERGO_Win10_x64_v1.0_20260803
```

Go 版本主要解决 Windows 7 32 位非 SP1 环境兼容。维护功能时应对齐 Python 版本的配置和协议语义。

### Java 服务端

开发工作区：

```text
D:\Desktop\CodeTalkers\inst\data
```

SVN 正式工程：

```text
D:\svn\Repository\trunk\HTFiles\系统文档\卫生许可监督系统\SRC\Java\project\szapp\inst\data
```

服务上下文：

```text
http://172.16.27.4:8801/yncdc
```

客户端 `config.ini` 的 `service` 指向该上下文，不包含具体 `.m` 接口名。

### 智源功能平台

前端采用 Django 模板、平台静态 JS/CSS、SQL 注册查询和提交。页面不直接访问数据库，也不以 Java 替代平台已有的普通查询/提交机制。BLOB 流式下载、PDF inline 预览、PDF 页图像渲染等适合由 Java 提供。

## 文件采集链路

```text
1. 仪器产生 PDF/Excel/CSV/TXT/图像或其他文件。
2. 客户端扫描 filepath 或读取 USB/串口。
3. track_mode=1 时以 processed_files.json 记录已成功上传文件，源文件保留原位。
4. 客户端 POST 至 /yncdc/UploadInstDataFilesNew.m，提交文件和 instno。
5. UploadInstDataFilesNew 保存归档关系和 BLOB。
6. Factory.getInstance(instno) 读取 instnoClass.properties。
7. 具体 InstFileExpDAO/解析器执行 parse。
8. 解析明细写入 HTLIS.LIS_INSTDATA_NEW。
9. 页面以 FDISEQ 关联归档文件与解析数据。
```

关键判断：客户端上传成功不等于解析成功。`LIS_INSTDATA_NEW` 存在对应 `FDISEQ` 行才表示解析成功；无行表示解析失败。

## 心跳与日志链路

客户端按 `heartbeat_interval` 发送：

```text
client_id, client_type, client_ver, lab_id, instno,
heartbeat_seq, status, mode, upload_total, upload_fail,
uptime_sec, os
```

接口：

```text
/yncdc/UploadClientLog.m
```

Java `UploadClientLog.java`：

- UPSERT `HTLIS.LIS_CLIENT_INFO`。
- INSERT `HTLIS.LIS_HEARTBEAT_LOG`。

页面消息日志不能凭空构造客户端不会产生的消息。运行状态以心跳表为主，文件上传成功/失败还应结合真实客户端日志及归档/解析数据判断。

## 文件查看与业务操作

Java 流接口：

```text
/yncdc/InstFileDownload.m?fdiseq=...
/yncdc/PdfView.m?fdiseq=...
/yncdc/PdfPageImage.m?fdiseq=...&page=1&dpi=150
```

- `InstFileDownload`：下载 `HII.IB_TBS_DETAILEDINF.FCONTENT` 中的任意归档源文件。
- `PdfView`：PDF inline 预览，也可 download 模式。
- `PdfPageImage`：使用 PDFBox 2.0.27 将指定 PDF 页渲染为 PNG，供图谱缩略图和原图查看。
- 所有接口必须校验 `FDISEQ`、有效 `INSTFILE` 关系、机构/会话权限、MIME 和响应头。

数据库删除与原始记录生成优先使用平台注册提交 SQL，以同一事务完成校验、写入/删除、提交或回滚。重新解析需要服务端重新调用解析器，执行“旧解析数据删除后重新插入”，期间前端加遮罩。

## 跨层故障定位

按链路从前到后检查：

1. 客户端日志是否发现文件、是否请求正确 URL、服务器响应是否成功。
2. `IB_TBS_DETAILEDINF` 是否生成归档行和 BLOB。
3. `IB_TBS_TBLDAT` 是否存在 `FTBLNM='INSTFILE' AND FPKSEQ2='F'` 关系。
4. `instnoClass.properties` 是否存在精确 `instno` 映射。
5. Java 解析器是否被实例化并成功解析。
6. `LIS_INSTDATA_NEW` 是否按 `FDISEQ` 产生行。
7. qid 是否注册到 `ynjk`，参数和字段别名是否一致。
8. 页面是否传递正确的 `sessionId/dbnm/hp`。

不要在后端错误时先改前端，也不要在静态资源 404 时先改 SQL。
