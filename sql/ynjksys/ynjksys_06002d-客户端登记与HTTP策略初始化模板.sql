-- 客户端登记与 HTTP 策略初始化模板
-- 使用前必须替换所有 &变量；凭证值来自 ClientCredentialTool，禁止把明文 CLIENT_SECRET 写入本文件。

define v_client_id       = 'AGILENT-1200'
define v_instno          = 'AGILENT-1200'
define v_client_type     = 'python'
define v_client_ver      = 'v2_YYYYMMDDHH24MISS'
define v_hiino           = '请替换真实机构号'
define v_dptno           = ''
define v_reg_empid       = '请替换平台注册操作员编号'
define v_auth_key_id     = '请替换工具输出的AUTH_KEY_ID'
define v_auth_secret_enc = '请替换工具输出的FAUTHSECRETENC'
define v_policy_name     = 'AGILENT-1200 HTTP文件监听配置'
define v_config_ver      = 'v1_YYYYMMDDHH24MISS'
define v_file_path       = 'D:\InstrumentData'
define v_service_url     = 'http://172.16.27.4:8801/yncdc/UploadInstDataFilesNew.m'
define v_extensions      = '.pdf'





merge into HTLIS.LIS_CLIENT_INFO t
using (select '&v_client_id' CLIENT_ID from dual) s
   on (t.CLIENT_ID = s.CLIENT_ID)
when matched then update set
  t.CLIENT_TYPE='&v_client_type', t.CLIENT_VER='&v_client_ver',
  t.INSTNO='&v_instno', t.FDPTNO=nullif('&v_dptno',''), t.FHIINO=to_number('&v_hiino'),
  t.FENABLE='是', t.FAUTHKEYID='&v_auth_key_id',
  t.FAUTHSECRETENC='&v_auth_secret_enc', t.FAUTHSTATUS='ACTIVE',
  t.FEMPID='&v_reg_empid', t.FOPDT=sysdate
when not matched then insert
  (FGUID,CLIENT_ID,CLIENT_TYPE,CLIENT_VER,INSTNO,FDPTNO,INSTALL_TIME,
   CURRENT_STATUS,RUNNING_MODE,UPLOAD_TOTAL,UPLOAD_FAIL,UPTIME_SEC,
   FREGEMPID,FREGDT,FENABLE,FAPPLYSTATUS,FAUTHKEYID,FAUTHSECRETENC,FAUTHSTATUS,
   FEMPID,FOPDT,FHIINO)
values
  (rawtohex(sys_guid()),'&v_client_id','&v_client_type','&v_client_ver','&v_instno',
   nullif('&v_dptno',''),sysdate,'STOPPED','http',0,0,0,
   '&v_reg_empid',sysdate,'是','NONE','&v_auth_key_id','&v_auth_secret_enc','ACTIVE',
   '&v_reg_empid',sysdate,to_number('&v_hiino'));

merge into HTLIS.LIS_CLIENT_POLICY t
using (select '&v_client_id' CLIENT_ID from dual) s
   on (t.CLIENT_ID = s.CLIENT_ID)
when matched then update set
  t.INSTNO='&v_instno', t.POLICY_NAME='&v_policy_name', t.CONFIG_VER='&v_config_ver',
  t.POLICY_STATUS='PUBLISHED', t.INTERFACE_TYPE='http', t.FILE_PATH='&v_file_path',
  t.SCAN_INTERVAL=10, t.SERVICE_URL='&v_service_url', t.START_ROW=1,
  t.TRACK_MODE=1, t.ALLOWED_EXTENSIONS='&v_extensions', t.MAX_COMPANION_FILES=0,
  t.HEARTBEAT_INTERVAL=60, t.ARCHIVE_MODE='TRACK_UPLOADED', t.DATA_MODE='FILE_FIRST',
  t.FPUBLISHEDDT=sysdate, t.FEMPID='&v_reg_empid', t.FOPDT=sysdate,
  t.FHIINO=to_number('&v_hiino'), t.FDPTNO=nullif('&v_dptno','')
when not matched then insert
  (FGUID,CLIENT_ID,INSTNO,POLICY_NAME,FDPTNO,FOWNEREMPID,CONFIG_VER,POLICY_STATUS,
   INTERFACE_TYPE,FILE_PATH,SCAN_INTERVAL,SERVICE_URL,START_ROW,SAMP_COL_FLAG,
   TRACK_MODE,ALLOWED_EXTENSIONS,MAX_COMPANION_FILES,HEARTBEAT_INTERVAL,
   ARCHIVE_MODE,DATA_MODE,FPUBLISHEDDT,FEMPID,FOPDT,FHIINO)
values
  (rawtohex(sys_guid()),'&v_client_id','&v_instno','&v_policy_name',nullif('&v_dptno',''),
   '&v_reg_empid','&v_config_ver','PUBLISHED','http','&v_file_path',10,'&v_service_url',1,null,
   1,'&v_extensions',0,60,'TRACK_UPLOADED','FILE_FIRST',sysdate,
   '&v_reg_empid',sysdate,to_number('&v_hiino'));

commit;

select CLIENT_ID,INSTNO,FHIINO,FENABLE,FAUTHKEYID,FAUTHSTATUS,FAPPLIEDVER
  from HTLIS.LIS_CLIENT_INFO where CLIENT_ID='&v_client_id';
select CLIENT_ID,INSTNO,CONFIG_VER,POLICY_STATUS,INTERFACE_TYPE,FILE_PATH,SERVICE_URL
  from HTLIS.LIS_CLIENT_POLICY where CLIENT_ID='&v_client_id';
