declare
  id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob;
  thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000);
  resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob;
  bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
  id := 'ynjksys_07001q'; name := '采集客户端发布包查询'; direct := '0';
  cndxml := '<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>';
  cndxsl := ''; thesql := ''; dispsql := ''; param := ''; cfgxml := '';
  resulttype := 'ntable'; header := ''; footer := '';
  delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS');
  delete from query_vws_cnd where fid=id;
  insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter)
  values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);
  bsql := q'~select p.FPACKAGEID 发布包编号,
       nvl((select listagg(x.FINSTNO,',') within group(order by x.FINSTNO)
              from HTLIS.LIS_CLIENT_PACKAGE_INST x
             where x.FPACKAGEID=p.FPACKAGEID and x.FHIINO=p.FHIINO),'') 仪器编号,
       nvl((select listagg(x.FINSTNM,'、') within group(order by x.FINSTNO)
              from HTLIS.LIS_CLIENT_PACKAGE_INST x
             where x.FPACKAGEID=p.FPACKAGEID and x.FHIINO=p.FHIINO),'未限定仪器') 适用仪器,
       p.FCLIENTTYPE 客户端类型, p.FCLIENTVER 版本号, p.FOSNAME 操作系统,
       p.FARCH 系统架构, p.FFILENM 文件名称, p.FSTATICPATH 静态路径,
       p.FFILESIZE 文件大小, p.FSHA256 文件摘要,
       to_char(p.FRELEASEDT,'yyyy-mm-dd hh24:mi:ss') 发布时间,
       p.FIFLATEST 是否最新, p.FSTATUS 发布状态, p.FREMARK 发布说明
  from HTLIS.LIS_CLIENT_PACKAGE p
 where p.FHIINO=nvl(?,p.FHIINO)
   and p.FCLIENTTYPE=nvl(?,p.FCLIENTTYPE)
   and p.FOSNAME=nvl(?,p.FOSNAME)
   and upper(p.FCLIENTVER) like '%'||upper(nvl(?,p.FCLIENTVER))||'%'
   and exists (select 1 from HTLIS.LIS_CLIENT_PACKAGE_INST m
                where m.FPACKAGEID=p.FPACKAGEID and m.FHIINO=p.FHIINO
                  and m.FINSTNO=nvl(?,m.FINSTNO))
 order by p.FIFLATEST desc,p.FRELEASEDT desc,p.FCLIENTTYPE,p.FCLIENTVER desc~';
  bsql_pv := 'hiino_sql_equal,clienttype_sql_equal,osname_sql_equal,clientver_sql_like,instno_sql_equal;';
  bsql_pt := 'N,V,V,V,V;';
  insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt)
  values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;

