declare
  id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob;
  thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000);
  resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob;
  bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
  id := 'ynjksys_03009q'; name := '原始记录明细查询'; direct := '0';
  cndxml := '<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>';
  cndxsl := ''; thesql := ''; dispsql := ''; param := ''; cfgxml := '';
  resulttype := 'ntable'; header := ''; footer := '';
  delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS');
  delete from query_vws_cnd where fid=id;
  insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter)
  values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);
  bsql := q'~select d.frowseq 行号, d.fsourcefguid 来源数据标识,
       d.fsourcefdiseq 来源文件序号, d.fsourceinstno 仪器编号,
       d.fsourcesampseq 来源样品序号, d.fsourcesampno 来源样品编号,
       d.fsourceitemseq 来源项目编号,
       d.fsampno 样品编号, d.fsampnm 样品名称,
       d.fsampcategoryno 样品类别编号, d.fsampcategorynm 样品类别,
       d.fitemseq 检测项目编号, d.fitemnm 检测项目,
       d.frslt 检测结果, d.frslt1 结果1, d.frslt2 结果2,
       d.frslt3 结果3, d.frslt4 结果4, d.frslt5 结果5, d.frslt6 结果6,
       d.frsltdesc 结果说明, d.fmw 原单位字段, d.fresultunit 单位,
       d.ffilenm 来源文件,
       to_char(d.fcollectdt,'yyyy-mm-dd hh24:mi:ss') 采集时间,
       to_char(d.fsourceopdt,'yyyy-mm-dd hh24:mi:ss') 数据入库时间
  from dcb_tbs_instorigd d
  join dcb_tbs_instorigm m on m.forigguid = d.forigguid
 where d.forigguid = ?
   and d.fifvalid = '是' and m.fifvalid = '是'
   and (nvl(?, 0) = 0 or m.fdatahiino = ?)
 order by d.frowseq~';
  bsql_pv := 'record_guid_sql_equal,hiino_sql_equal,hiino_sql_equal;';
  bsql_pt := 'V,N,N;';
  insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt)
  values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;
