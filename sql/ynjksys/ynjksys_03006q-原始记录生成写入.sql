declare
  id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob;
  thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000);
  resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob;
  bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
  id := 'ynjksys_03006q'; name := '原始记录生成写入'; direct := '0';
  cndxml := '<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>';
  cndxsl := ''; thesql := ''; dispsql := ''; param := ''; cfgxml := '';
  resulttype := 'ntable'; header := ''; footer := '';
  delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS');
  delete from query_vws_cnd where fid=id;
  insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter)
  values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);

  bsql := q'~declare
  p_json clob := ? -FH-
  v_empid varchar2(50) := ? -FH-
  v_empnm varchar2(50) := ? -FH-
  v_user_hiino number := ? -FH-
  v_root json_object_t -FH-
  v_item json_object_t -FH-
  v_fguids json_array_t -FH-
  v_record_name varchar2(200) -FH-
  v_template_id varchar2(64) -FH-
  v_template_name varchar2(200) -FH-
  v_template_version varchar2(50) -FH-
  v_template_snapshot clob -FH-
  v_category_id varchar2(50) -FH-
  v_category_name varchar2(200) -FH-
  v_generate_mode varchar2(20) -FH-
  v_expected_instno varchar2(80) -FH-
  v_origguid varchar2(64) -FH-
  v_origno varchar2(80) -FH-
  v_instno varchar2(80) -FH-
  v_instnm varchar2(200) -FH-
  v_dptno varchar2(50) -FH-
  v_dptnm varchar2(200) -FH-
  v_datahiino number -FH-
  v_srvhiino number -FH-
  v_source_count number := 0 -FH-
  v_selected_count number := 0 -FH-
  v_hiino_count number := 0 -FH-
  v_sample_count number := 0 -FH-
  v_item_count number := 0 -FH-
  v_file_count number := 0 -FH-
  v_mode_group_count number := 0 -FH-
  v_begin_time date -FH-
  v_end_time date -FH-
  v_source_hash varchar2(64) -FH-
  v_inserted_rows number := 0 -FH-
  v_result_json varchar2(4000) -FH-
begin
  delete from q1 -FH-
  if trim(v_empid) is null then
    raise_application_error(-20001, '登录会话失效，无法记录原始记录生成人') -FH-
  end if -FH-

  v_root := json_object_t(p_json) -FH-
  v_item := treat(v_root.get_array('data').get(0) as json_object_t) -FH-
  v_fguids := v_item.get_array('fguids') -FH-
  v_record_name := trim(v_item.get_string('recordName')) -FH-
  v_template_id := trim(v_item.get_string('templateId')) -FH-
  v_template_snapshot := v_item.get_string('templateSnapshot') -FH-
  v_category_id := trim(v_item.get_string('sampleCategoryId')) -FH-
  v_category_name := trim(v_item.get_string('sampleCategoryName')) -FH-
  v_generate_mode := upper(trim(v_item.get_string('generateMode'))) -FH-

  if v_record_name is null or length(v_record_name) > 200 then
    raise_application_error(-20002, '原始记录名称不能为空且不能超过200个字符') -FH-
  end if -FH-
  if v_fguids is null or v_fguids.get_size() = 0 then
    raise_application_error(-20003, '未选择需要生成原始记录的数据') -FH-
  end if -FH-
  if v_fguids.get_size() > 500 then
    raise_application_error(-20004, '单次最多选择500条数据') -FH-
  end if -FH-
  if v_generate_mode not in ('FILE', 'SAMPLE', 'ITEM') then
    raise_application_error(-20005, '记录生成方式不正确') -FH-
  end if -FH-

  if v_template_id = 'TPL-HPLC-01' then
    v_template_name := '液相色谱检测原始记录' -FH-
    v_template_version := 'V1.1' -FH-
    v_expected_instno := 'AGILENT-1200' -FH-
    if v_generate_mode not in ('FILE', 'SAMPLE', 'ITEM') then
      raise_application_error(-20006, '液相色谱模板不支持当前生成方式') -FH-
    end if -FH-
    if instr(',FOOD-GENERAL,FOOD-BEVERAGE,FOOD-ADDITIVE,QC-REFERENCE,QC-CONTROL,QC-BLANK,',
             ',' || v_category_id || ',') = 0 then
      raise_application_error(-20007, '液相色谱模板不适用于所选样品类别') -FH-
    end if -FH-
  elsif v_template_id = 'TPL-BRUKER-01' then
    v_template_name := '微生物质谱鉴定原始记录' -FH-
    v_template_version := 'V1.0' -FH-
    v_expected_instno := 'BRUKER-MICROFLEX' -FH-
    if v_generate_mode not in ('FILE', 'SAMPLE') then
      raise_application_error(-20008, '微生物质谱模板不支持当前生成方式') -FH-
    end if -FH-
    if instr(',MICRO-CULTURE,MICRO-ISOLATE,QC-REFERENCE,QC-CONTROL,',
             ',' || v_category_id || ',') = 0 then
      raise_application_error(-20009, '微生物质谱模板不适用于所选样品类别') -FH-
    end if -FH-
  else
    raise_application_error(-20010, '原始记录模板不存在或未启用') -FH-
  end if -FH-

  v_selected_count := v_fguids.get_size() -FH-
  select count(*), count(distinct t.fguid), count(distinct t.finstno),
         min(t.finstno), count(distinct nvl(to_char(t.fhiino), to_char(d.fhiino))),
         min(nvl(t.fhiino, d.fhiino)),
         count(distinct nvl(t.sampno, '#NULL#')),
         count(distinct nvl(t.itemseq, '#NULL#')),
         count(distinct t.fdiseq), min(t.fopdt), max(t.fopdt),
         rawtohex(standard_hash(listagg(t.fguid, ',') within group(order by t.fguid), 'SHA256'))
    into v_source_count, v_inserted_rows, v_mode_group_count,
         v_instno, v_hiino_count, v_datahiino,
         v_sample_count, v_item_count, v_file_count,
         v_begin_time, v_end_time, v_source_hash
    from htlis.lis_instdata_new t
    join json_table(p_json, '$.data[0].fguids[*]'
           columns(fguid varchar2(64) path '$')) j on j.fguid = t.fguid
    left join hii.ib_tbs_detailedinf d on d.fdiseq = t.fdiseq -FH-

  if v_source_count <> v_selected_count or v_inserted_rows <> v_selected_count then
    raise_application_error(-20011, '部分所选数据已不存在、重复或无权访问，请重新查询') -FH-
  end if -FH-
  if v_mode_group_count <> 1 or upper(trim(v_instno)) <> v_expected_instno then
    raise_application_error(-20012, '所选数据与模板仪器不一致') -FH-
  end if -FH-
  if v_hiino_count <> 1 then
    raise_application_error(-20013, '不能跨数据归属机构生成同一份原始记录') -FH-
  end if -FH-
  if v_datahiino is null then
    raise_application_error(-20014, '无法确定所选数据的归属机构') -FH-
  end if -FH-
  v_srvhiino := case when nvl(v_user_hiino, 0) > 0 then v_user_hiino else v_datahiino end -FH-

  if v_generate_mode = 'FILE' then
    select count(distinct t.fdiseq) into v_mode_group_count
      from htlis.lis_instdata_new t
      join json_table(p_json, '$.data[0].fguids[*]'
             columns(fguid varchar2(64) path '$')) j on j.fguid = t.fguid -FH-
  elsif v_generate_mode = 'SAMPLE' then
    select count(distinct nvl(t.sampno, '#NULL#')) into v_mode_group_count
      from htlis.lis_instdata_new t
      join json_table(p_json, '$.data[0].fguids[*]'
             columns(fguid varchar2(64) path '$')) j on j.fguid = t.fguid -FH-
  else
    select count(distinct nvl(t.itemseq, '#NULL#')) into v_mode_group_count
      from htlis.lis_instdata_new t
      join json_table(p_json, '$.data[0].fguids[*]'
             columns(fguid varchar2(64) path '$')) j on j.fguid = t.fguid -FH-
  end if -FH-
  if v_mode_group_count <> 1 then
    raise_application_error(-20015, '所选数据不符合当前记录生成方式') -FH-
  end if -FH-

  v_origguid := rawtohex(sys_guid()) -FH-
  v_origno := 'ORIG-' || to_char(sysdate, 'yyyymmdd') || '-' || substr(v_origguid, 1, 12) -FH-
  if v_template_snapshot is null then
    v_template_snapshot := '{"templateId":"' || v_template_id || '","templateName":"'
                           || v_template_name || '","version":"' || v_template_version || '"}' -FH-
  end if -FH-
  if v_instno = 'AGILENT-1200' then
    v_instnm := '液相色谱仪' -FH-
    v_dptno := 'DEPT-LH' -FH-
    v_dptnm := '检验中心理化室' -FH-
  else
    v_instnm := '飞行时间质谱（含电脑、UPS、打印机）' -FH-
    v_dptno := 'DEPT-WSW' -FH-
    v_dptnm := '检验中心微生物室' -FH-
  end if -FH-

  insert into dcb_tbs_instorigm(
    forigguid, forigno, forignm, frecordstatus, fgeneratemode,
    ftemplseq, ftemplnm, ftemplver, ftemplsnapshot,
    finstno, finstnm, fdptno, fdptnm, fdatabegindt, fdataenddt,
    fsamplecount, fitemcount, fdatacount, fsourcefilecount, fsourcehash,
    fsnapshotver, fcreatedt, fcreateempid, fcreateempnm,
    fopdt, fopempid, fopempnm, fdatahiino, fsrvhiino, fifvalid
  ) values (
    v_origguid, v_origno, v_record_name, 'GENERATED', v_generate_mode,
    v_template_id, v_template_name, v_template_version, v_template_snapshot,
    v_instno, v_instnm, v_dptno, v_dptnm, v_begin_time, v_end_time,
    v_sample_count, v_item_count, v_source_count, v_file_count, v_source_hash,
    'V1', sysdate, v_empid, nvl(trim(v_empnm), v_empid),
    sysdate, v_empid, nvl(trim(v_empnm), v_empid), v_datahiino, v_srvhiino, '是'
  ) -FH-

  insert into dcb_tbs_instorigd(
    forigguid, frowseq, fsourcefguid, fsourcefdiseq, fsourceinstno,
    fsourcesampseq, fsourcesampno, fsourceitemseq, fsourceempid, fsourceopdt,
    fsampno, fsampnm, fsampcategoryno, fsampcategorynm, fitemseq, fitemnm,
    frslt, frslt1, frslt2, frslt3, frslt4, frslt5, frslt6, frsltdesc, fmw,
    fresultunit, ffilenm, fcollectdt, fextsnapshot,
    fopdt, fopempid, fopempnm, fdatahiino, fsrvhiino, fifvalid
  )
  select v_origguid,
         row_number() over(order by t.fopdt, t.fguid),
         t.fguid, t.fdiseq, t.finstno, t.sampseq, t.sampno, t.itemseq,
         t.fempid, t.fopdt, t.sampno, null, v_category_id, v_category_name,
         t.itemseq,
         nvl(i.item_name, case when t.finstno = 'AGILENT-1200' then nvl(t.rslt6, t.itemseq) else t.itemseq end),
         t.rslt, t.rslt1, t.rslt2, t.rslt3, t.rslt4, t.rslt5, t.rslt6,
         t.rsltdesc, t.mw,
         case t.finstno when 'AGILENT-1200' then 'mAU*s'
                        when 'BRUKER-MICROFLEX' then '无量纲'
                        else trim(t.mw) end,
         d.ffilenm, d.fopdt, null,
         sysdate, v_empid, nvl(trim(v_empnm), v_empid),
         v_datahiino, v_srvhiino, '是'
    from htlis.lis_instdata_new t
    join json_table(p_json, '$.data[0].fguids[*]'
           columns(fguid varchar2(64) path '$')) j on j.fguid = t.fguid
    left join hii.ib_tbs_detailedinf d on d.fdiseq = t.fdiseq
    left join (
      select upper(trim(m.instno)) instno, trim(m.itemsysseq) itemsysseq,
             max(nvl(trim(m.itemname), trim(m.instchkitemnm))) item_name
        from htlis.lp_tbc_instchkitem m
       group by upper(trim(m.instno)), trim(m.itemsysseq)
    ) i on i.instno = upper(trim(t.finstno)) and i.itemsysseq = trim(t.itemseq) -FH-
  v_inserted_rows := sql%rowcount -FH-
  if v_inserted_rows <> v_source_count then
    raise_application_error(-20016, '原始记录明细写入数量与所选数据不一致') -FH-
  end if -FH-

  commit -FH-
  v_result_json := '{"success":true,"message":"原始记录生成成功","recordGuid":"'
    || v_origguid || '","recordNo":"' || v_origno || '","detailCount":'
    || v_inserted_rows || '}' -FH-
  insert into q1(c1) values(v_result_json) -FH-
exception
  when others then
    rollback -FH-
    delete from q1 -FH-
    v_result_json := '{"success":false,"message":"'
      || replace(replace(sqlerrm, '"', '\"'), chr(10), ' ') || '"}' -FH-
    insert into q1(c1) values(v_result_json) -FH-
end -FH-;

select c1 处理结果 from q1~';
  bsql_pv := 'bodyjson_sql_equal,empid_sql_equal,empnm_sql_equal,hiino_sql_equal;';
  bsql_pt := 'V,V,V,N;';
  insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt)
  values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;
