-- 采集客户端静态发布包元数据及仪器适配关系。
-- EXE/ZIP 不进入数据库；文件部署在 /static/ynjksys/client_packages/，数据库只保存可维护的发布清单。

create table HTLIS.LIS_CLIENT_PACKAGE
(
  FGUID        VARCHAR2(60) not null,
  FPACKAGEID   VARCHAR2(80) not null,
  FCLIENTTYPE  VARCHAR2(20) not null,
  FCLIENTVER   VARCHAR2(80) not null,
  FOSNAME      VARCHAR2(80) not null,
  FARCH        VARCHAR2(20) not null,
  FFORMAT      VARCHAR2(20) default 'ZIP' not null,
  FFILENM      VARCHAR2(300) not null,
  FSTATICPATH  VARCHAR2(1000) not null,
  FFILESIZE    NUMBER(20) default 0 not null,
  FSHA256      VARCHAR2(64) not null,
  FRELEASEDT   DATE not null,
  FIFLATEST    NUMBER(1) default 0 not null,
  FSTATUS      VARCHAR2(20) default 'DRAFT' not null,
  FREMARK      VARCHAR2(2000),
  FEMPID       VARCHAR2(60) not null,
  FOPDT        DATE default sysdate not null,
  FHIINO       NUMBER(12) not null,
  constraint PK_LIS_CLIENT_PACKAGE primary key (FGUID),
  constraint UK_LIS_CLIENT_PACKAGE_ID unique (FPACKAGEID),
  constraint CK_LCPKG_TYPE check (FCLIENTTYPE in ('PYTHON','GO')),
  constraint CK_LCPKG_ARCH check (FARCH in ('X86','X64')),
  constraint CK_LCPKG_FORMAT check (FFORMAT in ('ZIP')),
  constraint CK_LCPKG_LATEST check (FIFLATEST in (0,1)),
  constraint CK_LCPKG_STATUS check (FSTATUS in ('DRAFT','ENABLED','DISABLED')),
  constraint CK_LCPKG_SIZE check (FFILESIZE >= 0),
  constraint CK_LCPKG_PATH check (substr(FSTATICPATH,1,32)='/static/ynjksys/client_packages/')
)
tablespace HTLIS;

comment on table HTLIS.LIS_CLIENT_PACKAGE is '采集客户端静态发布包元数据';
comment on column HTLIS.LIS_CLIENT_PACKAGE.FSTATICPATH is 'ynjksys静态目录下的发布包URL，不存服务器物理绝对路径';
comment on column HTLIS.LIS_CLIENT_PACKAGE.FSHA256 is '发布ZIP文件SHA-256摘要';
comment on column HTLIS.LIS_CLIENT_PACKAGE.FIFLATEST is '同一适用范围内是否推荐最新版本：1是、0否';

create index HTLIS.IDX_LCPKG_HII_STATUS on HTLIS.LIS_CLIENT_PACKAGE(FHIINO,FSTATUS,FRELEASEDT);
create index HTLIS.IDX_LCPKG_TYPE_VER on HTLIS.LIS_CLIENT_PACKAGE(FCLIENTTYPE,FCLIENTVER);

create table HTLIS.LIS_CLIENT_PACKAGE_INST
(
  FGUID       VARCHAR2(60) not null,
  FPACKAGEID  VARCHAR2(80) not null,
  FINSTNO     VARCHAR2(100) not null,
  FINSTNM     VARCHAR2(300) not null,
  FRECOMMEND  NUMBER(1) default 0 not null,
  FEMPID      VARCHAR2(60) not null,
  FOPDT       DATE default sysdate not null,
  FHIINO      NUMBER(12) not null,
  constraint PK_LIS_CLIENT_PACKAGE_INST primary key (FGUID),
  constraint UK_LCPKGI_PACKAGE_INST unique (FPACKAGEID,FINSTNO,FHIINO),
  constraint CK_LCPKGI_RECOMMEND check (FRECOMMEND in (0,1))
)
tablespace HTLIS;

comment on table HTLIS.LIS_CLIENT_PACKAGE_INST is '客户端发布包与仪器设备的多对多适配关系';
create index HTLIS.IDX_LCPKGI_INST on HTLIS.LIS_CLIENT_PACKAGE_INST(FHIINO,FINSTNO,FPACKAGEID);
