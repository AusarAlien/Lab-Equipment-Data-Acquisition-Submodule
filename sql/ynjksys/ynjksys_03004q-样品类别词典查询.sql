declare
  id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob;
  thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000);
  resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob;
  bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
  id := 'ynjksys_03004q'; name := '样品类别词典查询'; direct := '0';
  cndxml := '<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>';
  cndxsl := ''; thesql := ''; dispsql := ''; param := ''; cfgxml := '';
  resulttype := 'ntable'; header := ''; footer := '';
  delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS');
  delete from query_vws_cnd where fid=id;
  insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter)
  values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);
  bsql := q'~select category_id 类别编号, category_name 类别名称,
       group_name 类别分组, sort_no 排序号
  from (
    select 'ENV-WATER-DRINKING' category_id, '生活饮用水' category_name, '环境样品' group_name, 1 sort_no from dual union all
    select 'ENV-WATER-SURFACE', '地表水', '环境样品', 2 from dual union all
    select 'ENV-WATER-GROUND', '地下水', '环境样品', 3 from dual union all
    select 'ENV-AIR-WORKPLACE', '工作场所空气', '环境样品', 4 from dual union all
    select 'ENV-AIR-AMBIENT', '环境空气', '环境样品', 5 from dual union all
    select 'ENV-SOIL', '土壤或沉积物', '环境样品', 6 from dual union all
    select 'FOOD-GENERAL', '食品', '食品及相关产品', 11 from dual union all
    select 'FOOD-BEVERAGE', '饮料', '食品及相关产品', 12 from dual union all
    select 'FOOD-ADDITIVE', '食品添加剂', '食品及相关产品', 13 from dual union all
    select 'FOOD-CONTACT', '食品接触材料', '食品及相关产品', 14 from dual union all
    select 'BIO-SERUM', '血清', '生物样本', 21 from dual union all
    select 'BIO-PLASMA', '血浆', '生物样本', 22 from dual union all
    select 'BIO-WHOLE-BLOOD', '全血', '生物样本', 23 from dual union all
    select 'BIO-URINE', '尿液', '生物样本', 24 from dual union all
    select 'BIO-SPUTUM', '痰液', '生物样本', 25 from dual union all
    select 'BIO-THROAT-SWAB', '咽拭子', '生物样本', 26 from dual union all
    select 'BIO-NASAL-SWAB', '鼻拭子', '生物样本', 27 from dual union all
    select 'BIO-FECES', '粪便', '生物样本', 28 from dual union all
    select 'BIO-OTHER', '其他人体样本', '生物样本', 29 from dual union all
    select 'MICRO-CULTURE', '菌株或培养物', '微生物样本', 31 from dual union all
    select 'MICRO-VIRUS', '病毒样本', '微生物样本', 32 from dual union all
    select 'MICRO-ISOLATE', '微生物分离物', '微生物样本', 33 from dual union all
    select 'OCC-COLLECTED', '职业卫生采集样品', '职业与放射卫生', 41 from dual union all
    select 'RAD-DOSIMETER', '个人剂量计', '职业与放射卫生', 42 from dual union all
    select 'RAD-SAMPLE', '放射性监测样品', '职业与放射卫生', 43 from dual union all
    select 'QC-REFERENCE', '标准物质', '质量控制样品', 51 from dual union all
    select 'QC-CONTROL', '质控样品', '质量控制样品', 52 from dual union all
    select 'QC-BLANK', '空白样品', '质量控制样品', 53 from dual union all
    select 'QC-PT', '能力验证样品', '质量控制样品', 54 from dual union all
    select 'OTHER', '其他样品', '其他', 99 from dual
  )
 order by sort_no~';
  bsql_pv := '';
  bsql_pt := '';
  insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt)
  values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;

