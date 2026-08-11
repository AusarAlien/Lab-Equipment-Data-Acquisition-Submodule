-- 采集文件重新解析支撑表
-- 执行顺序：先建本文件两张表，再部署包含 InstFileReparse 的 Java 包。

create table HTLIS.LIS_INSTFILE_PART
(
  FGUID       VARCHAR2(60) not null,
  FDISEQ      NUMBER(12) not null,
  PART_SEQ    NUMBER(6) not null,
  INSTNO      VARCHAR2(100) not null,
  FILE_NAME   VARCHAR2(500) not null,
  FILE_EXT    VARCHAR2(30),
  FILE_ROLE   VARCHAR2(20) default 'COMPANION' not null,
  FILE_SIZE   NUMBER(20) default 0 not null,
  FCONTENT    BLOB,
  FEMPID      VARCHAR2(60) not null,
  FOPDT       DATE default sysdate not null,
  FHIINO      NUMBER(12) not null,
  constraint PK_LIS_INSTFILE_PART primary key (FGUID),
  constraint UK_LIFP_FILE unique (FDISEQ,PART_SEQ),
  constraint CK_LIFP_ROLE check (FILE_ROLE in ('PRIMARY','COMPANION')),
  constraint CK_LIFP_SIZE check (FILE_SIZE >= 0)
)
tablespace HTLIS
lob (FCONTENT) store as (tablespace HTLIS);

comment on table HTLIS.LIS_INSTFILE_PART is '仪器采集文件组成及重新解析所需伴生文件';
comment on column HTLIS.LIS_INSTFILE_PART.FDISEQ is 'HII.IB_TBS_DETAILEDINF归档文件标识';
comment on column HTLIS.LIS_INSTFILE_PART.PART_SEQ is '上传文件组内顺序，1为主文件';
comment on column HTLIS.LIS_INSTFILE_PART.FILE_ROLE is 'PRIMARY主文件只登记元数据，COMPANION伴生文件保存BLOB';
comment on column HTLIS.LIS_INSTFILE_PART.FCONTENT is '伴生文件原始内容；主文件内容仍以HII归档BLOB为准';

create index HTLIS.IDX_LIFP_HII_FILE
  on HTLIS.LIS_INSTFILE_PART(FHIINO,FDISEQ);
create index HTLIS.IDX_LIFP_INST_FILE
  on HTLIS.LIS_INSTFILE_PART(INSTNO,FDISEQ);

create table HTLIS.LIS_INST_REPARSE_LOG
(
  FGUID          VARCHAR2(60) not null,
  FDISEQ         NUMBER(12) not null,
  INSTNO         VARCHAR2(100) not null,
  REPARSE_REASON VARCHAR2(1000) not null,
  START_TIME     DATE default sysdate not null,
  END_TIME       DATE,
  RESULT_STATUS  VARCHAR2(20) not null,
  BEFORE_COUNT   NUMBER(20) default 0 not null,
  AFTER_COUNT    NUMBER(20) default 0 not null,
  ERROR_MESSAGE  VARCHAR2(2000),
  FEMPID         VARCHAR2(60) not null,
  FOPDT          DATE default sysdate not null,
  FHIINO         NUMBER(12) not null,
  constraint PK_LIS_INST_REPARSE_LOG primary key (FGUID),
  constraint CK_LIRL_STATUS check (RESULT_STATUS in ('SUCCESS','FAILED')),
  constraint CK_LIRL_COUNT check (BEFORE_COUNT >= 0 and AFTER_COUNT >= 0)
)
tablespace HTLIS;

comment on table HTLIS.LIS_INST_REPARSE_LOG is '采集归档文件重新解析审计记录';
comment on column HTLIS.LIS_INST_REPARSE_LOG.REPARSE_REASON is '用户提交的重新解析审计原因';
comment on column HTLIS.LIS_INST_REPARSE_LOG.RESULT_STATUS is '只保存SUCCESS或FAILED，不保存处理中状态';
comment on column HTLIS.LIS_INST_REPARSE_LOG.FEMPID is '执行重新解析的平台操作员编号';

create index HTLIS.IDX_LIRL_HII_FILE_TIME
  on HTLIS.LIS_INST_REPARSE_LOG(FHIINO,FDISEQ,START_TIME);
create index HTLIS.IDX_LIRL_INST_TIME
  on HTLIS.LIS_INST_REPARSE_LOG(INSTNO,START_TIME);

-- 部署后检查
select table_name from all_tables
 where owner='HTLIS'
   and table_name in ('LIS_INSTFILE_PART','LIS_INST_REPARSE_LOG');
