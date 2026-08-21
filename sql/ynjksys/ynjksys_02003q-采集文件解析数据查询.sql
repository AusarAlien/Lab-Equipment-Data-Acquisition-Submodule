declare
  id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob;
  thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000);
  resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob;
  bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
  id := 'ynjksys_02003q'; name := '采集文件解析数据查询'; direct := '0';
  cndxml := '<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>';
  cndxsl := ''; thesql := ''; dispsql := ''; param := ''; cfgxml := ''; resulttype := 'ntable'; header := ''; footer := '';
  delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS'); delete from query_vws_cnd where fid=id;
  insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter)
  values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);
  bsql := q'~with item_map as (
  select upper(trim(m.instno)) instno, trim(m.itemsysseq) itemsysseq,
         max(nvl(trim(m.itemname),
                 nvl(trim(m.instchkitemnm), trim(m.instchkitem)))) item_name
    from htlis.lp_tbc_instchkitem m
   group by upper(trim(m.instno)), trim(m.itemsysseq)
)
select t.fguid 唯一标识, upper(trim(t.finstno)) 仪器编号, t.sampno 样品编号,
       t.itemseq 检测项目编号, nvl(i.item_name,t.itemseq) 检测项目,
       t.rslt 主结果, t.rslt1 结果1, t.rslt2 结果2,
       t.rslt3 结果3, t.rslt4 结果4, t.rslt5 结果5, t.rslt6 结果6,
       case upper(trim(t.finstno))
         when 'AGILENT-1200' then 'mAU*s'
         when 'BRUKER-MICROFLEX' then '无量纲'
         when 'ICAP-TQ' then nvl(trim(t.rslt2),trim(t.mw))
         when 'SYNERGYH1' then 'RFU'
         else trim(t.mw) end 单位,
       to_char(t.fopdt,'yyyy-mm-dd hh24:mi:ss') 解析时间, t.fempid 操作人
  from htlis.lis_instdata_new t
  left join item_map i
    on i.instno=upper(trim(t.finstno))
   and i.itemsysseq=trim(t.itemseq)
 where t.fdiseq=?
   and exists (select 1
                 from hii.ib_tbs_detailedinf d
                where d.fdiseq=t.fdiseq
                  and (nvl(?,0)=0 or d.fhiino=?))
 order by t.fopdt, t.sampseq, t.itemseq, t.fguid~';
  bsql_pv := 'fdiseq_sql_equal,hiino_sql_equal,hiino_sql_equal;'; bsql_pt := 'N,N,N;';
  insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt)
  values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;
