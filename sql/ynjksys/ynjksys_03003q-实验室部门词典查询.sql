declare
  id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob;
  thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000);
  resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob;
  bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
  id := 'ynjksys_03003q'; name := '实验室部门词典查询'; direct := '0';
  cndxml := '<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>';
  cndxsl := ''; thesql := ''; dispsql := ''; param := ''; cfgxml := '';
  resulttype := 'ntable'; header := ''; footer := '';
  delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS');
  delete from query_vws_cnd where fid=id;
  insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter)
  values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);
  bsql := q'~select department_id 部门编号, department_name 部门名称, sort_no 排序号
  from (
    select 'DEPT-LH' department_id, '检验中心理化室' department_name, 1 sort_no from dual union all
    select 'DEPT-WSW', '检验中心微生物室', 2 from dual union all
    select 'DEPT-DL', '检验中心毒理室', 3 from dual union all
    select 'DEPT-XA', '性艾所', 4 from dual union all
    select 'DEPT-JC', '急传所', 5 from dual union all
    select 'DEPT-ZF', '职放所', 6 from dual union all
    select 'DEPT-JF', '结防所', 7 from dual union all
    select 'DEPT-MF', '麻防所', 8 from dual union all
    select 'DEPT-TJ', '体检中心', 9 from dual union all
    select 'DEPT-HW', '环卫所', 10 from dual union all
    select 'DEPT-MG', '免规所', 11 from dual union all
    select 'DEPT-XW', '学校卫生所', 12 from dual union all
    select 'DEPT-XD', '消毒病媒所', 13 from dual
  )
 order by sort_no~';
  bsql_pv := '';
  bsql_pt := '';
  insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt)
  values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;

