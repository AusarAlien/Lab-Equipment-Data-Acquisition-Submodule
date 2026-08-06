declare
  id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob;
  thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000);
  resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob;
  bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
  id := 'ynjksys_01001q'; name := '采集文档列表查询'; direct := '0';
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
         count(*) parsed_count,
         count(distinct t.sampno) sample_count,
         min(t.fopdt) first_parse_time,
         max(t.fopdt) last_parse_time
    from htlis.lis_instdata_new t
   group by t.fdiseq
), base_data as (
  select d.fdiseq,
         d.ffilenm,
         case lower(regexp_substr(d.ffilenm, '[^.]+$'))
           when 'pdf' then 'PDF' when 'xls' then 'Excel' when 'xlsx' then 'Excel'
           when 'csv' then 'CSV' when 'txt' then 'TXT' when 'png' then '图像'
           when 'jpg' then '图像' when 'jpeg' then '图像' else '其他' end file_type,
         nvl(dbms_lob.getlength(d.fcontent), 0) file_size,
         d.fopdt collect_time,
         p.finstno,
         case p.finstno
           when 'AGILENT-1200' then '安捷伦1200液相色谱仪'
           when 'BRUKER-MICROFLEX' then '布鲁克飞行时间质谱仪'
           else '--' end device_name,
         case p.finstno
           when 'AGILENT-1200' then 'Agilent1200'
           when 'BRUKER-MICROFLEX' then 'BrukerMicroflex'
           else '--' end parser_class,
         case when nvl(p.parsed_count, 0) > 0 then '解析成功' else '解析失败' end parse_status,
         nvl(p.parsed_count, 0) parsed_count,
         nvl(p.sample_count, 0) sample_count,
         p.first_parse_time,
         p.last_parse_time
    from hii.ib_tbs_detailedinf d
    join inst_file f on f.fdiseq = d.fdiseq
    left join parse_summary p on p.fdiseq = d.fdiseq
   where (nvl(?, 0) = 0 or d.fhiino = ?)
     and nvl(trim(d.finvalidflag), '0') = '0'
     and (p.finstno in ('AGILENT-1200','BRUKER-MICROFLEX') or p.finstno is null)
), filtered as (
  select b.*
    from base_data b
   where (? is null or lower(b.ffilenm) like '%' || lower(?) || '%'
          or lower(b.ffilenm) like '%' || lower(?) || '%')
     and (? is null or b.finstno = ?)
     and (? is null or b.file_type = ?)
     and (? is null or b.parse_status = ?)
     and (? is null or b.collect_time >= to_date(?, 'yyyy-mm-dd'))
     and (? is null or b.collect_time < to_date(?, 'yyyy-mm-dd') + 1)
), numbered as (
  select f.*, count(*) over() total_count,
         row_number() over(order by f.collect_time desc nulls last, f.fdiseq desc) rn
    from filtered f
)
select fdiseq 文件序号, ffilenm 文件名称, file_type 文件类型,
       finstno 仪器编号, device_name 仪器设备, parser_class 处理接口,
       file_size 文件大小, to_char(collect_time,'yyyy-mm-dd hh24:mi:ss') 采集时间,
       parse_status 解析状态, parsed_count 解析数据量, sample_count 样品数量,
       to_char(first_parse_time,'yyyy-mm-dd hh24:mi:ss') 首次解析时间,
       to_char(last_parse_time,'yyyy-mm-dd hh24:mi:ss') 最近解析时间,
       total_count 总数
  from numbered
 where rn between ((nvl(?,1)-1)*nvl(?,10)+1) and (nvl(?,1)*nvl(?,10))
 order by rn~';
  bsql_pv := 'hiino_sql_equal,hiino_sql_equal,file_name_sql_equal,file_name_sql_equal,file_name_encoded_sql_equal,instno_sql_equal,instno_sql_equal,file_type_sql_equal,file_type_sql_equal,parse_status_sql_equal,parse_status_sql_equal,start_date_sql_equal,start_date_sql_equal,end_date_sql_equal,end_date_sql_equal,page_sql_equal,page_size_sql_equal,page_sql_equal,page_size_sql_equal;';
  bsql_pt := 'N,N,V,V,V,V,V,V,V,V,V,V,V,V,V,N,N,N,N;';
  insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt)
  values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;
