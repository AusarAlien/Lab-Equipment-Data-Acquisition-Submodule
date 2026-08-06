declare
  id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob;
  thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000);
  resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob;
  bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
  id := 'ynjksys_03001q'; name := '实验室设备采集数据查询'; direct := '0';
  cndxml := '<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>';
  cndxsl := ''; thesql := ''; dispsql := ''; param := ''; cfgxml := '';
  resulttype := 'ntable'; header := ''; footer := '';
  delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS');
  delete from query_vws_cnd where fid=id;
  insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter)
  values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);
  bsql := q'~with device_dict as (
  select 'AGILENT-1200' instno, 'DEPT-LH' department_id,
         '检验中心理化室' department_name, '液相色谱仪' device_name
    from dual
  union all
  select 'BRUKER-MICROFLEX', 'DEPT-WSW',
         '检验中心微生物室', '飞行时间质谱（含电脑、UPS、打印机）'
    from dual
), inst_file as (
  select distinct b.fdiseq
    from hii.ib_tbs_tbldat b
   where upper(trim(b.ftblnm)) = 'INSTFILE'
     and trim(b.fpkseq2) = 'F'
), item_map as (
  select upper(trim(m.instno)) instno, trim(m.itemsysseq) itemsysseq,
         max(nvl(trim(m.itemname), trim(m.instchkitemnm))) item_name
    from htlis.lp_tbc_instchkitem m
   group by upper(trim(m.instno)), trim(m.itemsysseq)
), base_data as (
  select t.fguid, t.fdiseq, t.finstno, t.sampseq, t.sampno, t.itemseq,
         dd.department_id, dd.department_name,
         nvl(i.item_name,
             case when t.finstno = 'AGILENT-1200' then nvl(t.rslt6, t.itemseq)
                  else t.itemseq end) project_name,
         t.rslt result_value,
         case t.finstno
           when 'AGILENT-1200' then 'mAU*s'
           when 'BRUKER-MICROFLEX' then '无量纲'
           else trim(t.mw) end result_unit,
         t.fopdt data_time,
         d.fopdt collect_time, d.ffilenm, dd.device_name
    from htlis.lis_instdata_new t
    join device_dict dd on dd.instno = upper(trim(t.finstno))
    join inst_file f on f.fdiseq = t.fdiseq
    join hii.ib_tbs_detailedinf d on d.fdiseq = t.fdiseq
    left join item_map i
      on i.instno = upper(trim(t.finstno))
     and i.itemsysseq = trim(t.itemseq)
   where (nvl(?, 0) = 0 or t.fhiino = ?)
     and (t.fhiino is null or d.fhiino = t.fhiino)
     and nvl(trim(d.finvalidflag), '0') = '0'
), filtered as (
  select b.*
    from base_data b
   where (? is null or b.department_id = ?)
     and (? is null or b.finstno = ?)
     and (? is null or lower(b.sampno) like '%' || lower(?) || '%')
     and (? is null or lower(nvl(b.itemseq,'') || ' ' || nvl(b.project_name,''))
                         like '%' || lower(?) || '%')
     and (? is null or b.data_time >= to_date(?, 'yyyy-mm-dd'))
     and (? is null or b.data_time < to_date(?, 'yyyy-mm-dd') + 1)
), numbered as (
  select f.*, count(*) over() total_count,
         row_number() over(order by f.data_time desc nulls last, f.fdiseq desc, f.fguid) rn
    from filtered f
)
select fguid 数据标识, fdiseq 文件序号, finstno 仪器编号, device_name 仪器设备,
       department_id 部门编号, department_name 部门名称,
       sampseq 样品序号, sampno 样品编号, itemseq 检测项目编号,
       project_name 检测项目, result_value 结果摘要, result_unit 单位,
       to_char(data_time,'yyyy-mm-dd hh24:mi:ss') 数据入库时间,
       to_char(collect_time,'yyyy-mm-dd hh24:mi:ss') 采集时间,
       ffilenm 来源文件, total_count 总数
  from numbered
 where rn between ((nvl(?,1)-1)*nvl(?,10)+1) and (nvl(?,1)*nvl(?,10))
 order by rn~';
  bsql_pv := 'hiino_sql_equal,hiino_sql_equal,department_sql_equal,department_sql_equal,instno_sql_equal,instno_sql_equal,sampno_sql_equal,sampno_sql_equal,item_keyword_sql_equal,item_keyword_sql_equal,start_date_sql_equal,start_date_sql_equal,end_date_sql_equal,end_date_sql_equal,page_sql_equal,page_size_sql_equal,page_sql_equal,page_size_sql_equal;';
  bsql_pt := 'N,N,V,V,V,V,V,V,V,V,V,V,V,V,N,N,N,N;';
  insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt)
  values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;
