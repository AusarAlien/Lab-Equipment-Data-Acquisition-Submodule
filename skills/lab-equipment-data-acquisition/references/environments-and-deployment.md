# 环境、命名与部署

## 源码与仓库

模块源码：

```text
D:\Desktop\实验室数据采集子模块
```

Git 远程仓库：

```text
https://github.com/AusarAlien/Lab-Equipment-Data-Acquisition-Submodule.git
```

监听客户端工作区：

```text
D:\Desktop\接口监听程序
```

Java 接口工作区与正式 SVN 路径见 `architecture-and-workflow.md`。

## 平台参数

```text
hp=ynjksys
dbnm=ynjk
```

入口基线：

```text
/isimpxls/?act=hf&hp=ynjksys&hf=<页面名>&dbnm=ynjk
```

本地：

```text
http://127.0.0.1:10099/isimpxls/?act=hf&hp=ynjksys&hf=<页面名>&dbnm=ynjk
```

服务器：

```text
http://200.100.8.17:8801/isimpxls/?act=hf&hp=ynjksys&hf=<页面名>&dbnm=ynjk
```

不要在入口写 `sessionId=None`。平台登录后继承有效 session。

## 源码目录与部署扁平化

源码按三级功能分文件夹：

```text
templates/ynjksys/syssjcj_cjzy/
templates/ynjksys/syssjcj_cjwd/
templates/ynjksys/syssjcj_sbsj/
templates/ynjksys/syssjcj_sbbg/
templates/ynjksys/syssjcj_sjrq/
templates/ynjksys/syssjcj_cjpz/

static/ynjksys/<同名三级目录>/
```

部署时不保留三级目录，直接平铺：

```text
D:\conda_env\isauto\ispyfr\templates\ynjksys\
D:\conda_env\isauto\ispyfr\static\ynjksys\
D:\conda_env\isauto\ispyfr\sql\ynjksys\

/data/conda_envs/isauto/ispyfr/templates/ynjksys/
/data/conda_envs/isauto/ispyfr/static/ynjksys/
/data/conda_envs/isauto/ispyfr/sql/ynjksys/
```

本地与服务器均不创建 `syssjcj_cjwd` 等三级功能目录。

## 命名

- 页面/静态文件：`syssjcj_<三级功能缩写>_<页面描述>`。
- 采集主页：`syssjcj_cjzy_*`。
- 采集文档：`syssjcj_cjwd_*`。
- 设备数据：`syssjcj_sbsj_*`。
- 设备报告：`syssjcj_sbbg_*`。
- 数据日志：`syssjcj_sjrq_*`。
- 采集配置：`syssjcj_cjpz_*`。

SQL 查询号：

```text
01001 起  采集主页
02001 起  采集文档和数据管理
03001 起  实验室设备数据管理
04001 起  设备报告管理
05001 起  采集数据日志
06001 起  采集配置管理
07001 起  采集客户端（预留）
08001 起  设备接口（预留）
09001 起  数据文件采集（预留）
```

## 前端依赖与交互

- Django 模板使用 `{% static %}` 引用资源。
- 公共查询使用 `isqrydata.js`。
- 新增、编辑、删除使用 `issubmit.js`。
- 页面/模态参数用平台已有全局参数初始化逻辑。
- 图表使用平台现有 ECharts，项目参考路径 `static/lib/echarts`，服务器相对路径一致。
- 子页以平台模态方式打开，遮罩父页并提供右上角叉号；不重复放置“关闭”按钮。

## 同步与发布顺序

1. 在模块源码目录修改。
2. 运行 JS/SQL/页面最小验证。
3. 同步到本地 Conda 的扁平 `ynjksys` 目录。
4. 在本地入口完成实际页面验证。
5. 列出需要注册的 SQL 和需要上传的文件。
6. Java 在 CodeTalkers 验证后同步 SVN，编译打包再上传服务端。
7. 服务器上传后检查静态资源、接口 URL、SQL 注册和权限。
8. 最后提交 Git；不要覆盖用户未提交的无关改动。

每次交付区分：源码已修改、本地 Conda 已同步、SQL 已注册、Java 已打包、服务器已上传。未实际完成的步骤不得写成已完成。
