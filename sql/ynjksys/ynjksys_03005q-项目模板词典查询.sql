declare
  id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob;
  thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000);
  resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob;
  bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
  id := 'ynjksys_03005q'; name := '项目模板词典查询'; direct := '0';
  cndxml := '<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>';
  cndxsl := ''; thesql := ''; dispsql := ''; param := ''; cfgxml := '';
  resulttype := 'ntable'; header := ''; footer := '';
  delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS');
  delete from query_vws_cnd where fid=id;
  insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter)
  values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);
  bsql := q'~select template_id 模板编号, template_name 模板名称,
       default_generate_mode 组织规则,
       default_generate_mode 默认组织规则,
       allowed_generate_modes 允许组织规则,
       department_id 部门编号,
       instno 仪器编号, category_ids 适用样品类别, version_no 模板版本,
       sort_no 排序号
  from (
    select 'TPL-HPLC-01' template_id, '液相色谱检测原始记录' template_name,
           '来源文件模式' default_generate_mode,
           '来源文件模式,样品模式,项目模式' allowed_generate_modes,
           'DEPT-LH' department_id,
           'AGILENT-1200' instno,
           'FOOD-GENERAL,FOOD-BEVERAGE,FOOD-ADDITIVE,QC-REFERENCE,QC-CONTROL,QC-BLANK' category_ids,
           'V1.1' version_no, 1 sort_no
      from dual
    union all
    select 'TPL-BRUKER-01', '微生物质谱鉴定原始记录',
           '样品模式', '来源文件模式,样品模式',
           'DEPT-WSW', 'BRUKER-MICROFLEX',
           'MICRO-CULTURE,MICRO-ISOLATE,QC-REFERENCE,QC-CONTROL',
           'V1.0', 2
      from dual
  )
 order by sort_no~';
  bsql_pv := '';
  bsql_pt := '';
  insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt)
  values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;
