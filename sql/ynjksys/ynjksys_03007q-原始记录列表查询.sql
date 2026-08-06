declare
  id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob;
  thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000);
  resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob;
  bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
  id := 'ynjksys_03007q'; name := '原始记录列表查询'; direct := '0';
  cndxml := '<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>';
  cndxsl := ''; thesql := ''; dispsql := ''; param := ''; cfgxml := '';
  resulttype := 'ntable'; header := ''; footer := '';
  delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS');
  delete from query_vws_cnd where fid=id;
  insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter)
  values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);

  bsql := q'~with category_distinct as (
  select distinct d.forigguid, d.fsampcategorynm
    from dcb_tbs_instorigd d
   where d.fifvalid = '是' and d.fsampcategorynm is not null
), category_agg as (
  select forigguid,
         listagg(fsampcategorynm, '、') within group(order by fsampcategorynm) category_names
    from category_distinct
   group by forigguid
), filtered as (
  select m.*, c.category_names
    from dcb_tbs_instorigm m
    left join category_agg c on c.forigguid = m.forigguid
   where m.fifvalid = '是'
     and (nvl(?, 0) = 0 or m.fdatahiino = ?)
     and (? is null or m.ftemplseq = ?)
     and (? is null or m.fcreatedt >= to_date(?, 'yyyy-mm-dd'))
     and (? is null or m.fcreatedt < to_date(?, 'yyyy-mm-dd') + 1)
), numbered as (
  select f.*, count(*) over() total_count,
         row_number() over(order by f.fcreatedt desc, f.forigseq desc) rn
    from filtered f
)
select forigguid 原始记录标识, forigno 原始记录编号, forignm 原始记录名称,
       frecordstatus 记录状态, fgeneratemode 生成方式代码,
       case fgeneratemode when 'FILE' then '按来源文件生成'
                          when 'SAMPLE' then '按样品生成'
                          when 'ITEM' then '按检测项目生成'
                          else fgeneratemode end 记录生成方式,
       ftemplseq 模板编号, ftemplnm 模板名称, ftemplver 模板版本,
       finstno 仪器编号, finstnm 仪器设备, fdptno 部门编号, fdptnm 部门名称,
       nvl(category_names, '--') 样品类别,
       fsamplecount 样品数量, fitemcount 项目数量, fdatacount 数据数量,
       fsourcefilecount 来源文件数量,
       to_char(fdatabegindt, 'yyyy-mm-dd hh24:mi:ss') 实验开始时间,
       to_char(fdataenddt, 'yyyy-mm-dd hh24:mi:ss') 实验结束时间,
       to_char(fcreatedt, 'yyyy-mm-dd hh24:mi:ss') 生成时间,
       fcreateempid 生成人账号, fcreateempnm 生成人, total_count 总数
  from numbered
 where rn between ((nvl(?,1)-1)*nvl(?,10)+1) and (nvl(?,1)*nvl(?,10))
 order by rn~';
  bsql_pv := 'hiino_sql_equal,hiino_sql_equal,template_id_sql_equal,template_id_sql_equal,start_date_sql_equal,start_date_sql_equal,end_date_sql_equal,end_date_sql_equal,page_sql_equal,page_size_sql_equal,page_sql_equal,page_size_sql_equal;';
  bsql_pt := 'N,N,V,V,V,V,V,V,N,N,N,N;';
  insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt)
  values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;
