declare
  id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob;
  thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000);
  resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob;
  bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
  id := 'ynjksys_03008q'; name := '原始记录详情查询'; direct := '0';
  cndxml := '<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>';
  cndxsl := ''; thesql := ''; dispsql := ''; param := ''; cfgxml := '';
  resulttype := 'ntable'; header := ''; footer := '';
  delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS');
  delete from query_vws_cnd where fid=id;
  insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter)
  values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);
  bsql := q'~select m.forigguid 原始记录标识, m.forigno 原始记录编号,
       m.forignm 原始记录名称, m.frecordstatus 记录状态,
       m.fgeneratemode 生成方式代码, m.ftemplseq 模板编号,
       m.ftemplnm 模板名称, m.ftemplver 模板版本,
       m.ftemplsnapshot 模板快照, m.finstno 仪器编号,
       m.finstnm 仪器设备, m.fdptno 部门编号, m.fdptnm 部门名称,
       to_char(m.fdatabegindt,'yyyy-mm-dd hh24:mi:ss') 实验开始时间,
       to_char(m.fdataenddt,'yyyy-mm-dd hh24:mi:ss') 实验结束时间,
       m.fsamplecount 样品数量, m.fitemcount 项目数量,
       m.fdatacount 数据数量, m.fsourcefilecount 来源文件数量,
       to_char(m.fcreatedt,'yyyy-mm-dd hh24:mi:ss') 生成时间,
       m.fcreateempid 生成人账号, m.fcreateempnm 生成人,
       m.fdatahiino 数据归属机构, m.fsrvhiino 系统归属机构
  from dcb_tbs_instorigm m
 where m.forigguid = ?
   and m.fifvalid = '是'
   and (nvl(?, 0) = 0 or m.fdatahiino = ?)~';
  bsql_pv := 'record_guid_sql_equal,hiino_sql_equal,hiino_sql_equal;';
  bsql_pt := 'V,N,N;';
  insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt)
  values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;
