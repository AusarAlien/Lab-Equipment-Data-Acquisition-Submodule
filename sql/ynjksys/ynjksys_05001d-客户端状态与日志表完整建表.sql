-- 客户端状态、心跳与采集消息日志：全新环境建表脚本
-- 适用：三张表均不存在的 HTLIS 模式。已有初版表请改用 05002d 增量升级脚本。

create table HTLIS.LIS_CLIENT_INFO
(
  FGUID              VARCHAR2(60) not null,
  CLIENT_ID          VARCHAR2(100) not null,
  CLIENT_TYPE        VARCHAR2(20),
  CLIENT_VER         VARCHAR2(40),
  LAB_ID             VARCHAR2(50),
  INSTNO             VARCHAR2(100) not null,
  FDPTNO             VARCHAR2(60),
  OS_INFO             VARCHAR2(200),
  INSTALL_TIME        DATE default sysdate not null,
  LAST_HEARTBEAT      DATE,
  CURRENT_STATUS      VARCHAR2(20) default 'STOPPED' not null,
  RUNNING_MODE        VARCHAR2(30) default 'http' not null,
  UPLOAD_TOTAL        NUMBER(20) default 0 not null,
  UPLOAD_FAIL         NUMBER(20) default 0 not null,
  UPTIME_SEC          NUMBER(20) default 0 not null,
  FREGEMPID           VARCHAR2(60) not null,
  FREGDT              DATE default sysdate not null,
  FENABLE             VARCHAR2(10) default '是' not null,
  FAPPLIEDVER         VARCHAR2(40),
  FAPPLYSTATUS        VARCHAR2(20) default 'NONE' not null,
  FAPPLYMSG           VARCHAR2(2000),
  FLASTCONFIGDT       DATE,
  FAUTHKEYID          VARCHAR2(60),
  FAUTHSECRETENC      VARCHAR2(1000),
  FAUTHSTATUS         VARCHAR2(20) default 'DISABLED' not null,
  FEMPID              VARCHAR2(60) not null,
  FOPDT               DATE default sysdate not null,
  FHIINO              NUMBER(12) not null,
  constraint PK_LIS_CLIENT_INFO primary key (CLIENT_ID),
  constraint UK_LCI_FGUID unique (FGUID),
  constraint CK_LCI_ENABLE check (FENABLE in ('是','否')),
  constraint CK_LCI_STATUS check (CURRENT_STATUS in ('RUNNING','STOPPED','ERROR')),
  constraint CK_LCI_MODE check (lower(RUNNING_MODE) = 'http'),
  constraint CK_LCI_APPLY check (FAPPLYSTATUS in ('NONE','PENDING','SUCCESS','FAILED')),
  constraint CK_LCI_AUTH check (FAUTHSTATUS in ('ACTIVE','DISABLED','EXPIRED')),
  constraint CK_LCI_COUNT check (UPLOAD_TOTAL >= 0 and UPLOAD_FAIL >= 0 and UPTIME_SEC >= 0)
)
tablespace HTLIS;

comment on table HTLIS.LIS_CLIENT_INFO is '采集客户端登记及最新运行状态';
comment on column HTLIS.LIS_CLIENT_INFO.FGUID is '平台业务全局唯一标识';
comment on column HTLIS.LIS_CLIENT_INFO.CLIENT_ID is '客户端唯一编号，当前直接使用负责仪器的INSTNO';
comment on column HTLIS.LIS_CLIENT_INFO.FEMPID is '最近操作主体；客户端自动操作时为认证CLIENT_ID';
comment on column HTLIS.LIS_CLIENT_INFO.FHIINO is '可信机构编号，不接受客户端报文覆盖';
comment on column HTLIS.LIS_CLIENT_INFO.FAUTHSECRETENC is 'AES加密后的客户端密钥，禁止页面回显';

create index HTLIS.IDX_LCI_HII_ENABLE on HTLIS.LIS_CLIENT_INFO(FHIINO,FENABLE);
create index HTLIS.IDX_LCI_HII_INST on HTLIS.LIS_CLIENT_INFO(FHIINO,INSTNO);
create index HTLIS.IDX_LCI_HII_HEART on HTLIS.LIS_CLIENT_INFO(FHIINO,LAST_HEARTBEAT);
create index HTLIS.IDX_LCI_STATUS_HEART on HTLIS.LIS_CLIENT_INFO(CURRENT_STATUS,LAST_HEARTBEAT);

create sequence HTLIS.SEQ_HEARTBEAT_LOG
  start with 1 increment by 1 minvalue 1 nomaxvalue cache 100 nocycle;

create table HTLIS.LIS_HEARTBEAT_LOG
(
  SEQ_ID              NUMBER(20) not null,
  FGUID               VARCHAR2(60) not null,
  CLIENT_ID           VARCHAR2(100) not null,
  HEARTBEAT_SEQ       NUMBER(20) not null,
  HEARTBEAT_TIME      DATE default sysdate not null,
  STATUS              VARCHAR2(20) not null,
  RUNNING_MODE        VARCHAR2(30) not null,
  UPLOAD_TOTAL        NUMBER(20) default 0 not null,
  UPLOAD_FAIL         NUMBER(20) default 0 not null,
  UPTIME_SEC          NUMBER(20) default 0 not null,
  ERROR_MSG           VARCHAR2(2000),
  INSTNO              VARCHAR2(100) not null,
  CLIENT_VER          VARCHAR2(40),
  FEMPID              VARCHAR2(60) not null,
  FOPDT               DATE default sysdate not null,
  FHIINO              NUMBER(12) not null,
  constraint PK_LIS_HEARTBEAT_LOG primary key (SEQ_ID),
  constraint UK_LHL_FGUID unique (FGUID),
  constraint CK_LHL_STATUS check (STATUS in ('RUNNING','STOPPED','ERROR')),
  constraint CK_LHL_MODE check (lower(RUNNING_MODE) = 'http'),
  constraint CK_LHL_COUNT check (HEARTBEAT_SEQ >= 0 and UPLOAD_TOTAL >= 0 and UPLOAD_FAIL >= 0 and UPTIME_SEC >= 0)
)
tablespace HTLIS;

comment on table HTLIS.LIS_HEARTBEAT_LOG is '采集客户端心跳历史快照';
create index HTLIS.IDX_LHL_HII_TIME on HTLIS.LIS_HEARTBEAT_LOG(FHIINO,HEARTBEAT_TIME);
create index HTLIS.IDX_LHL_CLIENT_TIME on HTLIS.LIS_HEARTBEAT_LOG(CLIENT_ID,HEARTBEAT_TIME);
create index HTLIS.IDX_LHL_CLIENT_SEQ on HTLIS.LIS_HEARTBEAT_LOG(CLIENT_ID,HEARTBEAT_SEQ);
create index HTLIS.IDX_LHL_INST_TIME on HTLIS.LIS_HEARTBEAT_LOG(INSTNO,HEARTBEAT_TIME);

create sequence HTLIS.SEQ_ACQ_LOG
  start with 1 increment by 1 minvalue 1 nomaxvalue cache 100 nocycle;

create table HTLIS.LIS_ACQUISITION_LOG
(
  SEQ_ID              NUMBER(20) not null,
  FGUID               VARCHAR2(60) not null,
  CLIENT_ID           VARCHAR2(100) not null,
  LOG_TIME            DATE default sysdate not null,
  LOG_LEVEL           VARCHAR2(10) not null,
  LOG_TYPE            VARCHAR2(40) not null,
  INSTNO              VARCHAR2(100) not null,
  FILE_NAME           VARCHAR2(500),
  FILE_SIZE           NUMBER(20),
  MESSAGE             VARCHAR2(2000),
  RAW_DETAIL          CLOB,
  FDISEQ              NUMBER(20),
  RESULT_STATUS       VARCHAR2(20) not null,
  HTTP_STATUS         NUMBER(10),
  DURATION_MS         NUMBER(20),
  RETRY_COUNT         NUMBER(10) default 0 not null,
  ERROR_CODE          VARCHAR2(100),
  REQUEST_GUID        VARCHAR2(100) not null,
  FEMPID              VARCHAR2(60) not null,
  FOPDT               DATE default sysdate not null,
  FHIINO              NUMBER(12) not null,
  constraint PK_LIS_ACQUISITION_LOG primary key (SEQ_ID),
  constraint UK_LAL_FGUID unique (FGUID),
  constraint UK_LAL_CLIENT_REQ unique (CLIENT_ID,REQUEST_GUID),
  constraint CK_LAL_LEVEL check (LOG_LEVEL in ('INFO','WARN','ERROR')),
  constraint CK_LAL_RESULT check (RESULT_STATUS in ('SUCCESS','FAILED','INFO')),
  constraint CK_LAL_NUMBER check ((FILE_SIZE is null or FILE_SIZE >= 0) and
                                  (DURATION_MS is null or DURATION_MS >= 0) and
                                  RETRY_COUNT >= 0)
)
tablespace HTLIS;

comment on table HTLIS.LIS_ACQUISITION_LOG is '客户端文件发现、上传和配置相关业务消息日志';
create index HTLIS.IDX_LAL_HII_TIME on HTLIS.LIS_ACQUISITION_LOG(FHIINO,LOG_TIME);
create index HTLIS.IDX_LAL_CLIENT_TIME on HTLIS.LIS_ACQUISITION_LOG(CLIENT_ID,LOG_TIME);
create index HTLIS.IDX_LAL_INST_TIME on HTLIS.LIS_ACQUISITION_LOG(INSTNO,LOG_TIME);
create index HTLIS.IDX_LAL_TYPE_TIME on HTLIS.LIS_ACQUISITION_LOG(LOG_TYPE,LOG_TIME);
create index HTLIS.IDX_LAL_RESULT_TIME on HTLIS.LIS_ACQUISITION_LOG(RESULT_STATUS,LOG_TIME);
create index HTLIS.IDX_LAL_FDISEQ on HTLIS.LIS_ACQUISITION_LOG(FDISEQ);
