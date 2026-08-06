declare
  id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob;
  thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000);
  resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob;
  bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
  id := 'ynjksys_02002q'; name := '采集文件详情查询'; direct := '0';
  cndxml := '<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>';
  cndxsl := ''; thesql := ''; dispsql := ''; param := ''; cfgxml := ''; resulttype := 'ntable'; header := ''; footer := '';
  delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS'); delete from query_vws_cnd where fid=id;
  insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter)
  values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);
  bsql := q'~with parse_summary as (
  select t.fdiseq, min(t.finstno) keep (dense_rank first order by t.fopdt desc nulls last) finstno,
         count(*) parsed_count, count(distinct t.sampno) sample_count,
         min(t.fopdt) first_parse_time, max(t.fopdt) last_parse_time
    from htlis.lis_instdata_new t where t.fdiseq = ? group by t.fdiseq
)
select d.fdiseq 文件序号, d.ffilenm 文件名称,
       case lower(regexp_substr(d.ffilenm, '[^.]+$')) when 'pdf' then 'PDF' when 'xls' then 'Excel'
         when 'xlsx' then 'Excel' when 'csv' then 'CSV' when 'txt' then 'TXT' else '其他' end 文件类型,
       nvl(dbms_lob.getlength(d.fcontent),0) 文件大小,
       to_char(d.fopdt,'yyyy-mm-dd hh24:mi:ss') 采集时间,
       p.finstno 仪器编号,
       case p.finstno when 'AGILENT-1200' then '安捷伦1200液相色谱仪'
         when 'BRUKER-MICROFLEX' then '布鲁克飞行时间质谱仪' else '--' end 仪器设备,
       case p.finstno when 'AGILENT-1200' then 'Agilent1200'
         when 'BRUKER-MICROFLEX' then 'BrukerMicroflex' else '--' end 处理接口,
       case when nvl(p.parsed_count,0)>0 then '解析成功' else '解析失败' end 解析状态,
       nvl(p.parsed_count,0) 解析数据量, nvl(p.sample_count,0) 样品数量,
       to_char(p.first_parse_time,'yyyy-mm-dd hh24:mi:ss') 首次解析时间,
       to_char(p.last_parse_time,'yyyy-mm-dd hh24:mi:ss') 最近解析时间,
       case when nvl(p.parsed_count,0)>0 then '已生成解析入库数据'
         else '客户端已上传文件，但未生成解析入库数据' end 解析信息
  from hii.ib_tbs_detailedinf d
  left join parse_summary p on p.fdiseq=d.fdiseq
 where d.fdiseq=?
   and (nvl(?,0)=0 or d.fhiino=?)
   and nvl(trim(d.finvalidflag),'0')='0'
   and exists (select 1 from hii.ib_tbs_tbldat b where b.fdiseq=d.fdiseq
               and upper(trim(b.ftblnm))='INSTFILE' and trim(b.fpkseq2)='F')~';
  bsql_pv := 'fdiseq_sql_equal,fdiseq_sql_equal,hiino_sql_equal,hiino_sql_equal;'; bsql_pt := 'N,N,N,N;';
  insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt)
  values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;
