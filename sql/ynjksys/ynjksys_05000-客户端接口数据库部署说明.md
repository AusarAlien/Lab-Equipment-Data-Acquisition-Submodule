# 客户端日志与 HTTP 配置接口数据库部署说明

## 1. 适用接口

| Java 接口 | 数据库对象 |
|---|---|
| `UploadClientLog` | `LIS_CLIENT_INFO`、`LIS_HEARTBEAT_LOG`、`SEQ_HEARTBEAT_LOG` |
| `UploadClientEvent` | `LIS_ACQUISITION_LOG`、`SEQ_ACQ_LOG` |
| `GetClientConfig` | `LIS_CLIENT_INFO`、`LIS_CLIENT_POLICY`、`LIS_CLIENT_POLICY_LOG` |
| `UploadClientConfigAck` | `LIS_CLIENT_INFO`、`LIS_CLIENT_POLICY`、`LIS_CLIENT_POLICY_LOG` |
| `ClientApiSupport` | `LIS_CLIENT_INFO`（客户端登记、机构归属和凭证） |
| `ClientCredentialTool` | 不直接访问数据库；生成登记所需的凭证字段 |

## 2. 脚本清单与执行顺序

### 全新数据库

1. `ynjksys_05001d-客户端状态与日志表完整建表.sql`
2. `ynjksys_06001d-客户端HTTP策略表完整建表.sql`
3. `ynjksys_06002d-客户端登记与HTTP策略初始化模板.sql`（按实际客户端修改变量后执行）
4. `ynjksys_06003d-客户端接口数据库校验.sql`

### 已存在初版三张客户端表的数据库

1. 先备份相关表并执行 `ynjksys_05002d-既有客户端表增量升级.sql`
2. 执行 `ynjksys_06001d-客户端HTTP策略表完整建表.sql`（仅限两张策略表尚不存在）
3. 执行 `ynjksys_05003d-客户端日志幂等约束启用.sql`
4. 按实际客户端执行初始化模板
5. 执行数据库校验脚本

## 3. 平台固定字段口径

本模块按当前已确认的平台字段口径使用：

- `FGUID`：业务全局唯一标识；
- `FEMPID`：操作主体编号。客户端自动写入时为已认证的 `CLIENT_ID`，平台人工维护时取 `window.parent.reEcdtJ.sInfo.opNo`；
- `FOPDT`：服务端数据库操作时间；
- `FHIINO`：机构编号。客户端接口只能采用 `LIS_CLIENT_INFO` 中预登记的可信值；
- `FDPTNO`：所属部门编号，仅在客户端登记和策略中保存。

五张业务表均保留 `FGUID VARCHAR2(60)`、`FEMPID VARCHAR2(60)`、`FOPDT DATE`、`FHIINO NUMBER(12)` 四个公共字段。日志表可在此基础上使用 `SEQ_ID` 作为高频时序数据的物理主键，但不得省略 `FGUID`。

客户端上报的 `INSTNO` 仅用于一致性核对，不能覆盖预登记的机构、仪器或部门归属。

## 4. 凭证登记

1. 在受控机器上运行 `ClientCredentialTool`；
2. 妥善保存工具输出的客户端明文密钥，只写入对应客户端 `config.ini`；
3. 数据库只保存 `FAUTHKEYID` 和 `FAUTHSECRETENC`；
4. Java 运行环境通过 JVM 参数 `syssjcj.client.masterKey` 或环境变量 `SYSSJCJ_CLIENT_MASTER_KEY`取得主密钥；
5. SQL 文件不得保存客户端明文密钥或主密钥。

## 5. 状态词典

- 客户端：`RUNNING / STOPPED / ERROR`
- 凭证：`ACTIVE / DISABLED / EXPIRED`
- 策略：`DRAFT / PUBLISHED / DISABLED`
- 策略应用：`NONE / PENDING / SUCCESS / FAILED`
- 业务日志级别：`INFO / WARN / ERROR`
- 业务日志结果：`SUCCESS / FAILED / INFO`
- 策略日志操作主体：`USER / CLIENT / SYSTEM`

## 6. 边界

当前仅实现 HTTP 文件夹监听策略。串口、USB 存储等模式不得通过这组表和接口伪装为已经完成。策略表中的归档字段只表达客户端已具备的文件追踪/归档行为，不负责服务器业务文件归档。

当前 Python/Go 客户端的 `HEARTBEAT_SEQ` 会在进程重启后从 1 重新计数，因此数据库不对 `(CLIENT_ID, HEARTBEAT_SEQ)` 建唯一约束。`UploadClientLog` 后续应增加每次进程启动唯一的 `RUN_ID`，再以 `(CLIENT_ID, RUN_ID, HEARTBEAT_SEQ)` 完成严格幂等；在该字段进入客户端和 Java 契约前，不得用现有序号误判全生命周期唯一。
