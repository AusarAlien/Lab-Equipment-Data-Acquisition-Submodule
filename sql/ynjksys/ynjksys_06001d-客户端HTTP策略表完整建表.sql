-- 客户端 HTTP 采集策略及审计日志
-- 适用：LIS_CLIENT_POLICY、LIS_CLIENT_POLICY_LOG 均不存在的环境。

create table HTLIS.LIS_CLIENT_POLICY
(
  FGUID                 VARCHAR2(60) not null,
  CLIENT_ID             VARCHAR2(100) not null,
  INSTNO                VARCHAR2(100) not null,
  POLICY_NAME           VARCHAR2(200) not null,
  FDPTNO                VARCHAR2(60),
  FOWNEREMPID           VARCHAR2(60),
  CONFIG_VER            VARCHAR2(40) not null,
  POLICY_STATUS         VARCHAR2(20) default 'DRAFT' not null,
  INTERFACE_TYPE        VARCHAR2(20) default 'http' not null,
  FILE_PATH             VARCHAR2(1000),
  SCAN_INTERVAL         NUMBER(10),
  SERVICE_URL           VARCHAR2(500),
  START_ROW             NUMBER(10),
  SAMP_COL_FLAG         VARCHAR2(100),
  TRACK_MODE            NUMBER(2) default 0 not null,
  ALLOWED_EXTENSIONS    VARCHAR2(500),
  MAX_COMPANION_FILES  NUMBER(10) default 0 not null,
  HEARTBEAT_INTERVAL    NUMBER(10),
  ARCHIVE_MODE          VARCHAR2(40),
  DATA_MODE             VARCHAR2(40),
  OUTPUT_DIR            VARCHAR2(1000),
  FILE_NAME_TEMPLATE    VARCHAR2(500),
  FPUBLISHEDDT          DATE,
  FEMPID                VARCHAR2(60) not null,
  FOPDT                 DATE default sysdate not null,
  FHIINO                NUMBER(12) not null,
  constraint PK_LIS_CLIENT_POLICY primary key (FGUID),
  constraint UK_LCP_CLIENT unique (CLIENT_ID),
  constraint CK_LCP_STATUS check (POLICY_STATUS in ('DRAFT','PUBLISHED','DISABLED')),
  constraint CK_LCP_INTERFACE check (lower(INTERFACE_TYPE) = 'http'),
  constraint CK_LCP_NUMBER check ((SCAN_INTERVAL is null or SCAN_INTERVAL > 0) and
                                  (START_ROW is null or START_ROW >= 0) and
                                  TRACK_MODE in (0,1) and
                                  MAX_COMPANION_FILES >= 0 and
                                  (HEARTBEAT_INTERVAL is null or HEARTBEAT_INTERVAL > 0)),
  constraint CK_LCP_PUBLISHED check
    (POLICY_STATUS <> 'PUBLISHED' or
      (FILE_PATH is not null and SCAN_INTERVAL is not null and SERVICE_URL is not null and
       ALLOWED_EXTENSIONS is not null and HEARTBEAT_INTERVAL is not null and FPUBLISHEDDT is not null))
)
tablespace HTLIS;

comment on table HTLIS.LIS_CLIENT_POLICY is '每个客户端当前唯一的HTTP文件夹监听策略';
comment on column HTLIS.LIS_CLIENT_POLICY.POLICY_NAME is '平台展示和审计名称，不进入客户端配置摘要';
comment on column HTLIS.LIS_CLIENT_POLICY.CONFIG_VER is '发布时间戳与版本标识组合，客户端据此判断更新';
comment on column HTLIS.LIS_CLIENT_POLICY.ARCHIVE_MODE is '客户端文件追踪或本地归档方式，不代表服务器业务归档';

create index HTLIS.IDX_LCP_HII_STATUS on HTLIS.LIS_CLIENT_POLICY(FHIINO,POLICY_STATUS);
create index HTLIS.IDX_LCP_HII_OWNER on HTLIS.LIS_CLIENT_POLICY(FHIINO,FOWNEREMPID);
create index HTLIS.IDX_LCP_HII_OPDT on HTLIS.LIS_CLIENT_POLICY(FHIINO,FOPDT);
create index HTLIS.IDX_LCP_INST on HTLIS.LIS_CLIENT_POLICY(FHIINO,INSTNO);

create table HTLIS.LIS_CLIENT_POLICY_LOG
(
  FGUID              VARCHAR2(60) not null,
  POLICY_GUID        VARCHAR2(60) not null,
  CLIENT_ID          VARCHAR2(100) not null,
  CONFIG_VER         VARCHAR2(40) not null,
  POLICY_NAME        VARCHAR2(200),
  ACTION_TYPE        VARCHAR2(40) not null,
  FOPERATORTYPE      VARCHAR2(20) not null,
  BEFORE_JSON        CLOB,
  AFTER_JSON         CLOB,
  RESULT_STATUS      VARCHAR2(20) not null,
  RESULT_MESSAGE     VARCHAR2(2000),
  CHANGE_SUMMARY     VARCHAR2(1000),
  OPERATION_SOURCE   VARCHAR2(100),
  FEMPID             VARCHAR2(60) not null,
  FOPDT              DATE default sysdate not null,
  FHIINO             NUMBER(12) not null,
  constraint PK_LIS_CLIENT_POLICY_LOG primary key (FGUID),
  constraint CK_LCPL_OPERATOR check (FOPERATORTYPE in ('USER','CLIENT','SYSTEM')),
  constraint CK_LCPL_RESULT check (RESULT_STATUS in ('PENDING','SUCCESS','FAILED')),
  constraint CK_LCPL_ACTION check (ACTION_TYPE in
    ('CREATE','MODIFY','PUBLISH','ENABLE','DISABLE','DOWNLOAD','CLIENT_PULL','APPLY_SUCCESS','APPLY_FAIL'))
)
tablespace HTLIS;

comment on table HTLIS.LIS_CLIENT_POLICY_LOG is '采集策略人工维护、客户端下载和应用回执审计日志';
create index HTLIS.IDX_LCPL_HII_TIME on HTLIS.LIS_CLIENT_POLICY_LOG(FHIINO,FOPDT);
create index HTLIS.IDX_LCPL_CLIENT_VER on HTLIS.LIS_CLIENT_POLICY_LOG(CLIENT_ID,CONFIG_VER,ACTION_TYPE);
create index HTLIS.IDX_LCPL_POLICY_TIME on HTLIS.LIS_CLIENT_POLICY_LOG(POLICY_GUID,FOPDT);
create index HTLIS.IDX_LCPL_RESULT_TIME on HTLIS.LIS_CLIENT_POLICY_LOG(RESULT_STATUS,FOPDT);

-- 不为 POLICY_LOG 的 CLIENT_PULL 建全局唯一约束：同一版本允许多次真实拉取留痕。
-- UploadClientConfigAck 对 APPLY_SUCCESS/APPLY_FAIL 使用 MERGE，正常情况下每种结果各保留一条。
