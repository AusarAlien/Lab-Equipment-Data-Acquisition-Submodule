declare
  id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob;
  thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000);
  resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob;
  bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
  id := 'ynjksys_01005q'; name := '采集图谱文件查询'; direct := '0';
  cndxml := '<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>';
  cndxsl := ''; thesql := ''; dispsql := ''; param := ''; cfgxml := ''; resulttype := 'ntable'; header := ''; footer := '';
  delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS'); delete from query_vws_cnd where fid=id;
  insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter)
  values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);
  bsql := q'~with p as (
  select t.fdiseq, min(t.sampno) sample_no, min(t.itemseq) item_seq, count(*) parsed_count
    from htlis.lis_instdata_new t where t.finstno='AGILENT-1200' group by t.fdiseq
), base_data as (
  select d.fdiseq, d.ffilenm, nvl(dbms_lob.getlength(d.fcontent),0) file_size,
         d.fopdt collect_time, p.sample_no, p.item_seq, count(*) over() total_count,
         row_number() over(order by d.fopdt desc nulls last,d.fdiseq desc) rn
    from hii.ib_tbs_detailedinf d
    join p on p.fdiseq=d.fdiseq and p.parsed_count>0
   where (nvl(?,0)=0 or d.fhiino=?)
     and nvl(trim(d.finvalidflag),'0')='0'
     and exists (select 1 from hii.ib_tbs_tbldat b where b.fdiseq=d.fdiseq
                 and upper(trim(b.ftblnm))='INSTFILE' and trim(b.fpkseq2)='F')
     and (? is null or p.sample_no like '%'||?||'%')
     and (? is null or d.fopdt>=to_date(?,'yyyy-mm-dd'))
     and (? is null or d.fopdt<to_date(?,'yyyy-mm-dd')+1)
)
select fdiseq 文件序号, ffilenm 文件名称, 'PDF' 文件类型, file_size 文件大小,
       'AGILENT-1200' 仪器编号, '安捷伦1200液相色谱仪' 仪器设备,
       to_char(collect_time,'yyyy-mm-dd hh24:mi:ss') 采集时间,
       '解析成功' 解析状态, 1 解析数据量, sample_no 样品编号,
       nvl(item_seq,'色谱分析') 检测项目, '色谱图' 图谱类型,
       ffilenm||' - 色谱图' 图谱名称, 1 原图页码, total_count 总数
  from base_data
 where rn between ((nvl(?,1)-1)*nvl(?,12)+1) and (nvl(?,1)*nvl(?,12))
 order by rn~';
  bsql_pv := 'hiino_sql_equal,hiino_sql_equal,sample_no_sql_equal,sample_no_sql_equal,start_date_sql_equal,start_date_sql_equal,end_date_sql_equal,end_date_sql_equal,page_sql_equal,page_size_sql_equal,page_sql_equal,page_size_sql_equal;';
  bsql_pt := 'N,N,V,V,V,V,V,V,N,N,N,N;';
  insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt)
  values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;
