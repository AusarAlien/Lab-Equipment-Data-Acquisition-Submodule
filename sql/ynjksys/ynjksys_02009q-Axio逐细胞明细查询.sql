declare
  id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob;
  thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000);
  resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob;
  bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
  id := 'ynjksys_02009q'; name := 'Axio逐细胞明细查询'; direct := '0';
  cndxml := '<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>';
  cndxsl := ''; thesql := ''; dispsql := ''; param := ''; cfgxml := '';
  resulttype := 'ntable'; header := ''; footer := '';
  delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS');
  delete from query_vws_cnd where fid=id;
  insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter)
  values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);

  bsql := q'~with axio_data as (
  select t.sampno,
         t.rslt1 x_cor,
         t.rslt2 y_cor,
         t.rslt3 z_cor,
         t.rslt4 object_no,
         t.rslt5 slide_no,
         t.rslt6 group_name,
         m.instchkitem item_name,
         t.rslt result_value
    from htlis.lis_instdata_new t
    join htlis.lp_tbc_instchkitem m
      on upper(trim(m.instno)) = 'AXIOIMAGERZ2'
     and trim(cast(m.itemsysseq as varchar2(100))) = trim(cast(t.itemseq as varchar2(100)))
   where t.fdiseq = ?
     and upper(trim(t.finstno)) = 'AXIOIMAGERZ2'
     and instr(t.sampno, '_') > 0
     and exists (select 1
                   from hii.ib_tbs_detailedinf d
                  where d.fdiseq = t.fdiseq
                    and (nvl(?,0)=0 or d.fhiino=?))
)
select slide_no 玻片号,
       regexp_substr(sampno, '[^_]+$', 1, 1) 序号,
       max(object_no) 对象编号,
       max(x_cor) X坐标,
       max(y_cor) Y坐标,
       max(z_cor) Z坐标,
       max(group_name) 组别,
       max(case when item_name='断裂' then result_value end) 断裂,
       max(case when item_name='单体互换' then result_value end) 单体互换,
       max(case when item_name='裂隙' then result_value end) 裂隙,
       max(case when item_name='微小体' then result_value end) 微小体,
       max(case when item_name='有着丝点环' then result_value end) 有着丝点环,
       max(case when item_name='无着丝点环' then result_value end) 无着丝点环,
       max(case when item_name='双微小体' then result_value end) 双微小体,
       max(case when item_name='非特定性型变化' then result_value end) 非特定性型变化
  from axio_data
 group by sampno, slide_no
 order by case when regexp_like(slide_no, '^\d+$') then to_number(slide_no) else 999999 end,
          case when regexp_like(regexp_substr(sampno, '[^_]+$', 1, 1), '^\d+$')
               then to_number(regexp_substr(sampno, '[^_]+$', 1, 1)) else 999999 end,
          sampno~';
  bsql_pv := 'fdiseq_sql_equal,hiino_sql_equal,hiino_sql_equal;';
  bsql_pt := 'N,N,N;';
  insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt)
  values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;
