declare
  id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob;
  thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000);
  resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob;
begin
  id := 'ynjksys_01001q'; name := '采集主页设备选项查询'; direct := '0';
  cndxml := '<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>';
  cndxsl := ''; thesql := ''; dispsql := ''; param := ''; cfgxml := ''; resulttype := 'ntable'; header := ''; footer := '';
  delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS'); delete from query_vws_cnd where fid=id;
  insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter)
  values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);
  bsql := q'~select distinct upper(trim(t.finstno)) 仪器编号,
       case upper(trim(t.finstno)) when 'AGILENT-1200' then '安捷伦1200液相色谱仪'
         when 'BRUKER-MICROFLEX' then '布鲁克飞行时间质谱仪'
         when 'AXIOIMAGERZ2' then '卡尔蔡司AxioImagerZ2染色体扫描仪'
         else upper(trim(t.finstno)) end 仪器设备
  from htlis.lis_instdata_new t
 where upper(trim(t.finstno)) in ('AGILENT-1200','BRUKER-MICROFLEX','AXIOIMAGERZ2')
 order by 仪器设备~';
  insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt)
  values(id,'DETAILS',bsql,'','',null,null,'RS');
end;
/
commit;
