declare
  id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob;
  thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000);
  resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob;
  bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
  id := 'ynjksys_03002q'; name := '实验室设备词典查询'; direct := '0';
  cndxml := '<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>';
  cndxsl := ''; thesql := ''; dispsql := ''; param := ''; cfgxml := '';
  resulttype := 'ntable'; header := ''; footer := '';
  delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS');
  delete from query_vws_cnd where fid=id;
  insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter)
  values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);
  bsql := q'~with device_dict as (
  select 'AGILENT-1200' instno, 'DEPT-LH' department_id,
         '检验中心理化室' department_name, '液相色谱仪' device_name,
         'Agilent Technologies' brand, '1200' model,
         '000008145' asset_no, '4号楼508' location_name, 1 sort_no
    from dual
  union all
  select 'BRUKER-MICROFLEX', 'DEPT-WSW',
         '检验中心微生物室', '飞行时间质谱（含电脑、UPS、打印机）',
         'BRUKER', 'New autofex',
         'TY2016000034', '4号楼308', 2
    from dual
  union all
  select 'AXIOIMAGERZ2', 'DEPT-DL',
         '检验中心毒理室', '卡尔蔡司AxioImagerZ2染色体扫描仪',
         '卡尔蔡司', 'AxioImagerZ2',
         null, null, 3
    from dual
), available_inst as (
  select distinct upper(trim(t.finstno)) instno
    from htlis.lis_instdata_new t
   where (nvl(?, 0) = 0 or t.fhiino = ?)
     and exists (
         select 1
           from hii.ib_tbs_detailedinf d
          where d.fdiseq = t.fdiseq
            and (t.fhiino is null or d.fhiino = t.fhiino)
            and nvl(trim(d.finvalidflag),'0')='0'
            and exists (
                select 1
                  from hii.ib_tbs_tbldat b
                 where b.fdiseq=d.fdiseq
                   and upper(trim(b.ftblnm))='INSTFILE'
                   and trim(b.fpkseq2)='F'
            )
     )
)
select d.instno 仪器编号,
       d.device_name 仪器设备,
       d.department_id 部门编号,
       d.department_name 部门名称,
       d.brand 品牌,
       d.model 型号,
       d.asset_no 固定资产编号,
       d.location_name 位置
  from device_dict d
  join available_inst a on a.instno = d.instno
 order by d.sort_no~';
  bsql_pv := 'hiino_sql_equal,hiino_sql_equal;';
  bsql_pt := 'N,N;';
  insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt)
  values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;
