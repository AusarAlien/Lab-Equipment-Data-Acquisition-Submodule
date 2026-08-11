-- 执行前提：05002d 已执行，下面三组查重/缺失查询均返回 0 行。
-- 本脚本不删除重复数据；如有重复，必须先人工确认保留记录。

select FGUID, count(*) CNT from HTLIS.LIS_CLIENT_INFO
 group by FGUID having FGUID is null or count(*) > 1;

select CLIENT_ID, REQUEST_GUID, count(*) CNT from HTLIS.LIS_ACQUISITION_LOG
 group by CLIENT_ID, REQUEST_GUID having REQUEST_GUID is null or count(*) > 1;

select 'LIS_CLIENT_INFO' TBL, count(*) CNT from HTLIS.LIS_CLIENT_INFO
 where FGUID is null or FEMPID is null or FOPDT is null or FHIINO is null
union all
select 'LIS_HEARTBEAT_LOG', count(*) from HTLIS.LIS_HEARTBEAT_LOG
 where FGUID is null or FEMPID is null or FOPDT is null or FHIINO is null
union all
select 'LIS_ACQUISITION_LOG', count(*) from HTLIS.LIS_ACQUISITION_LOG
 where FGUID is null or FEMPID is null or FOPDT is null or FHIINO is null;

-- 确认上述结果无异常后再执行以下 DDL。
alter table HTLIS.LIS_CLIENT_INFO modify
  (FGUID not null, FEMPID not null, FOPDT not null, FHIINO not null,
   FENABLE not null, FAPPLYSTATUS not null, FAUTHSTATUS not null);
alter table HTLIS.LIS_CLIENT_INFO add constraint UK_LCI_FGUID unique (FGUID);

alter table HTLIS.LIS_HEARTBEAT_LOG modify
  (FGUID not null, FEMPID not null, FOPDT not null, FHIINO not null,
   INSTNO not null, HEARTBEAT_SEQ not null);
alter table HTLIS.LIS_HEARTBEAT_LOG add constraint UK_LHL_FGUID unique (FGUID);

alter table HTLIS.LIS_ACQUISITION_LOG modify
  (FGUID not null, FEMPID not null, FOPDT not null, FHIINO not null,
   RESULT_STATUS not null, RETRY_COUNT not null, REQUEST_GUID not null);
alter table HTLIS.LIS_ACQUISITION_LOG add constraint UK_LAL_FGUID unique (FGUID);
alter table HTLIS.LIS_ACQUISITION_LOG add constraint UK_LAL_CLIENT_REQ unique (CLIENT_ID,REQUEST_GUID);

-- 对已有历史值采用 NOVALIDATE：约束启用后新增/修改数据必须符合词典，历史异常值可另行治理。
alter table HTLIS.LIS_CLIENT_INFO add constraint CK_LCI_ENABLE
  check (FENABLE in ('是','否')) enable novalidate;
alter table HTLIS.LIS_CLIENT_INFO add constraint CK_LCI_APPLY
  check (FAPPLYSTATUS in ('NONE','PENDING','SUCCESS','FAILED')) enable novalidate;
alter table HTLIS.LIS_CLIENT_INFO add constraint CK_LCI_AUTH
  check (FAUTHSTATUS in ('ACTIVE','DISABLED','EXPIRED')) enable novalidate;
alter table HTLIS.LIS_ACQUISITION_LOG add constraint CK_LAL_RESULT
  check (RESULT_STATUS in ('SUCCESS','FAILED','INFO')) enable novalidate;
