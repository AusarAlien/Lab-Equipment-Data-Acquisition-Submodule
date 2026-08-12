# 采集客户端发布目录

该目录只存放可供平台下载的客户端 ZIP 发布包。页面不硬编码版本清单；正式环境由
`HTLIS.LIS_CLIENT_PACKAGE` 与 `HTLIS.LIS_CLIENT_PACKAGE_INST` 提供发布包和适用仪器信息。

发布新版本时：

1. 将包含 EXE、`config.ini` 和使用说明的 ZIP 上传到本目录。
2. 计算并登记 ZIP 的文件大小和 SHA-256。
3. 向发布包表新增一条记录，并在适用仪器关系表登记一个或多个 `FINSTNO`。
4. 将旧版本的 `FIFLATEST` 调整为 `0`，新版本设为 `1`；停用包设置为 `DISABLED`。
5. 无需修改 `syssjcj_cjkh_list.js`、HTML 或 CSS。

数据库中的 `FSTATICPATH` 只能使用：

```text
/static/ynjksys/client_packages/文件名.zip
```

