declare
  id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob;
  thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000);
  resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob;
  bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
  id := 'ynjksys_01002q'; name := '采集主页汇总查询'; direct := '0';
  cndxml := '<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>';
  cndxsl := ''; thesql := ''; dispsql := ''; param := ''; cfgxml := '';
  resulttype := 'ntable'; header := ''; footer := '';
  delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS');
  delete from query_vws_cnd where fid=id;
  insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter)
  values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);
  bsql := q'~with inst_file as (
  select distinct b.fdiseq
    from hii.ib_tbs_tbldat b
   where upper(trim(b.ftblnm)) = 'INSTFILE'
     and trim(b.fpkseq2) = 'F'
), parse_summary as (
  select t.fdiseq,
         min(t.finstno) keep (dense_rank first order by t.fopdt desc nulls last) finstno,
         count(*) parsed_count
    from htlis.lis_instdata_new t
   group by t.fdiseq
), base_data as (
  select d.fdiseq, d.fopdt collect_time, p.finstno,
         nvl(p.parsed_count, 0) parsed_count
    from hii.ib_tbs_detailedinf d
    join inst_file f on f.fdiseq = d.fdiseq
    left join parse_summary p on p.fdiseq = d.fdiseq
   where (nvl(?, 0) = 0 or d.fhiino = ?)
     and nvl(trim(d.finvalidflag), '0') = '0'
     and (p.finstno in ('AGILENT-1200','BRUKER-MICROFLEX') or p.finstno is null)
)
select count(*) 采集文件数量,
       nvl(sum(b.parsed_count), 0) 采集数据数量,
       cast(null as number) 原始记录数量
  from base_data b
 where (? is null or b.collect_time >= to_date(?, 'yyyy-mm-dd'))
   and (? is null or b.collect_time < to_date(?, 'yyyy-mm-dd') + 1)
   and (? is null or b.finstno = ?)~';
  bsql_pv := 'hiino_sql_equal,hiino_sql_equal,start_date_sql_equal,start_date_sql_equal,end_date_sql_equal,end_date_sql_equal,instno_sql_equal,instno_sql_equal;';
  bsql_pt := 'N,N,V,V,V,V,V,V;';
  insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt)
  values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;
