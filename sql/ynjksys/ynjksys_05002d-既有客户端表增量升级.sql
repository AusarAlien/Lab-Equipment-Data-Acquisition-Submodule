-- 既有客户端三张表增量升级
-- 原则：只增加字段、序列和普通索引；不删除表、不删除列、不修改历史业务数据。
-- 执行用户需具备 HTLIS 对象 DDL 权限。

declare
  procedure add_col(p_table varchar2, p_definition varchar2) is
  begin
    execute immediate 'alter table HTLIS.' || p_table || ' add (' || p_definition || ')';
  exception
    when others then
      if sqlcode != -1430 then raise; end if; -- ORA-01430：字段已存在
  end;

  procedure add_idx(p_sql varchar2) is
  begin
    execute immediate p_sql;
  exception
    when others then
      if sqlcode not in (-955, -1408) then raise; end if;
  end;

  procedure ensure_seq(p_name varchar2, p_table varchar2) is
    v_count number;
    v_start number;
  begin
    select count(*) into v_count
      from all_sequences
     where sequence_owner = 'HTLIS' and sequence_name = upper(p_name);
    if v_count = 0 then
      execute immediate 'select nvl(max(seq_id),0)+1 from HTLIS.' || p_table into v_start;
      execute immediate 'create sequence HTLIS.' || p_name ||
        ' start with ' || to_char(v_start) ||
        ' increment by 1 minvalue 1 nomaxvalue cache 100 nocycle';
    end if;
  end;
begin
  -- LIS_CLIENT_INFO：公共字段及四个客户端接口读取/更新字段。
  add_col('LIS_CLIENT_INFO', 'FGUID VARCHAR2(60)');
  add_col('LIS_CLIENT_INFO', 'FDPTNO VARCHAR2(60)');
  add_col('LIS_CLIENT_INFO', 'FREGEMPID VARCHAR2(60)');
  add_col('LIS_CLIENT_INFO', 'FREGDT DATE');
  add_col('LIS_CLIENT_INFO', 'FENABLE VARCHAR2(10) DEFAULT ''是''');
  add_col('LIS_CLIENT_INFO', 'FAPPLIEDVER VARCHAR2(40)');
  add_col('LIS_CLIENT_INFO', 'FAPPLYSTATUS VARCHAR2(20) DEFAULT ''NONE''');
  add_col('LIS_CLIENT_INFO', 'FAPPLYMSG VARCHAR2(2000)');
  add_col('LIS_CLIENT_INFO', 'FLASTCONFIGDT DATE');
  add_col('LIS_CLIENT_INFO', 'FAUTHKEYID VARCHAR2(60)');
  add_col('LIS_CLIENT_INFO', 'FAUTHSECRETENC VARCHAR2(1000)');
  add_col('LIS_CLIENT_INFO', 'FAUTHSTATUS VARCHAR2(20) DEFAULT ''DISABLED''');
  add_col('LIS_CLIENT_INFO', 'FEMPID VARCHAR2(60)');
  add_col('LIS_CLIENT_INFO', 'FOPDT DATE');
  add_col('LIS_CLIENT_INFO', 'FHIINO NUMBER(12)');

  -- LIS_HEARTBEAT_LOG：公共字段、可信仪器快照和客户端版本。
  add_col('LIS_HEARTBEAT_LOG', 'FGUID VARCHAR2(60)');
  add_col('LIS_HEARTBEAT_LOG', 'FEMPID VARCHAR2(60)');
  add_col('LIS_HEARTBEAT_LOG', 'FOPDT DATE');
  add_col('LIS_HEARTBEAT_LOG', 'FHIINO NUMBER(12)');
  add_col('LIS_HEARTBEAT_LOG', 'INSTNO VARCHAR2(100)');
  add_col('LIS_HEARTBEAT_LOG', 'CLIENT_VER VARCHAR2(40)');

  -- LIS_ACQUISITION_LOG：公共字段和事件接口完整字段。
  add_col('LIS_ACQUISITION_LOG', 'FGUID VARCHAR2(60)');
  add_col('LIS_ACQUISITION_LOG', 'FEMPID VARCHAR2(60)');
  add_col('LIS_ACQUISITION_LOG', 'FOPDT DATE');
  add_col('LIS_ACQUISITION_LOG', 'FHIINO NUMBER(12)');
  add_col('LIS_ACQUISITION_LOG', 'FDISEQ NUMBER(20)');
  add_col('LIS_ACQUISITION_LOG', 'RESULT_STATUS VARCHAR2(20)');
  add_col('LIS_ACQUISITION_LOG', 'HTTP_STATUS NUMBER(10)');
  add_col('LIS_ACQUISITION_LOG', 'DURATION_MS NUMBER(20)');
  add_col('LIS_ACQUISITION_LOG', 'RETRY_COUNT NUMBER(10) DEFAULT 0');
  add_col('LIS_ACQUISITION_LOG', 'ERROR_CODE VARCHAR2(100)');
  add_col('LIS_ACQUISITION_LOG', 'REQUEST_GUID VARCHAR2(100)');

  -- 可安全推导的历史公共字段回填。FHIINO、FDPTNO 必须由真实登记数据回填，不能猜测。
  execute immediate q'[
    update HTLIS.LIS_CLIENT_INFO
       set FGUID = nvl(FGUID, rawtohex(sys_guid())),
           FEMPID = nvl(FEMPID, CLIENT_ID),
           FOPDT = nvl(FOPDT, nvl(LAST_HEARTBEAT, nvl(INSTALL_TIME, sysdate))),
           FREGEMPID = nvl(FREGEMPID, CLIENT_ID),
           FREGDT = nvl(FREGDT, nvl(INSTALL_TIME, sysdate)),
           FENABLE = nvl(FENABLE, '是'),
           FAPPLYSTATUS = nvl(FAPPLYSTATUS, 'NONE'),
           FAUTHSTATUS = nvl(FAUTHSTATUS, 'DISABLED')
  ]';

  execute immediate q'[
    update HTLIS.LIS_HEARTBEAT_LOG h
       set FGUID = nvl(h.FGUID, rawtohex(sys_guid())),
           FEMPID = nvl(h.FEMPID, h.CLIENT_ID),
           FOPDT = nvl(h.FOPDT, nvl(h.HEARTBEAT_TIME, sysdate)),
           INSTNO = nvl(h.INSTNO,
                    (select min(c.INSTNO) from HTLIS.LIS_CLIENT_INFO c
                      where c.CLIENT_ID = h.CLIENT_ID)),
           FHIINO = nvl(h.FHIINO,
                    (select min(c.FHIINO) from HTLIS.LIS_CLIENT_INFO c
                      where c.CLIENT_ID = h.CLIENT_ID))
  ]';

  execute immediate q'[
    update HTLIS.LIS_ACQUISITION_LOG a
       set FGUID = nvl(a.FGUID, rawtohex(sys_guid())),
           FEMPID = nvl(a.FEMPID, a.CLIENT_ID),
           FOPDT = nvl(a.FOPDT, nvl(a.LOG_TIME, sysdate)),
           FHIINO = nvl(a.FHIINO,
                    (select min(c.FHIINO) from HTLIS.LIS_CLIENT_INFO c
                      where c.CLIENT_ID = a.CLIENT_ID)),
           RESULT_STATUS = nvl(a.RESULT_STATUS,
             case when upper(a.LOG_LEVEL) = 'ERROR' then 'FAILED' else 'INFO' end),
           RETRY_COUNT = nvl(a.RETRY_COUNT, 0),
           REQUEST_GUID = nvl(a.REQUEST_GUID, a.FGUID)
  ]';

  ensure_seq('SEQ_HEARTBEAT_LOG', 'LIS_HEARTBEAT_LOG');
  ensure_seq('SEQ_ACQ_LOG', 'LIS_ACQUISITION_LOG');

  add_idx('create index HTLIS.IDX_LCI_HII_ENABLE on HTLIS.LIS_CLIENT_INFO(FHIINO,FENABLE)');
  add_idx('create index HTLIS.IDX_LCI_HII_INST on HTLIS.LIS_CLIENT_INFO(FHIINO,INSTNO)');
  add_idx('create index HTLIS.IDX_LCI_HII_HEART on HTLIS.LIS_CLIENT_INFO(FHIINO,LAST_HEARTBEAT)');
  add_idx('create index HTLIS.IDX_LHL_HII_TIME on HTLIS.LIS_HEARTBEAT_LOG(FHIINO,HEARTBEAT_TIME)');
  add_idx('create index HTLIS.IDX_LHL_CLIENT_TIME on HTLIS.LIS_HEARTBEAT_LOG(CLIENT_ID,HEARTBEAT_TIME)');
  add_idx('create index HTLIS.IDX_LAL_HII_TIME on HTLIS.LIS_ACQUISITION_LOG(FHIINO,LOG_TIME)');
  add_idx('create index HTLIS.IDX_LAL_CLIENT_TIME on HTLIS.LIS_ACQUISITION_LOG(CLIENT_ID,LOG_TIME)');
  add_idx('create index HTLIS.IDX_LAL_FDISEQ on HTLIS.LIS_ACQUISITION_LOG(FDISEQ)');
end;
/

commit;

-- 必须先为客户端登记真实机构号，再执行 05003d 启用非空和幂等约束。
select CLIENT_ID, INSTNO, FHIINO, FDPTNO, FGUID, FEMPID, FOPDT,
       FENABLE, FAUTHSTATUS
  from HTLIS.LIS_CLIENT_INFO
 order by CLIENT_ID;
