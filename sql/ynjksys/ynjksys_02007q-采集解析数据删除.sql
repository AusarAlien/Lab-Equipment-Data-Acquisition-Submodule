declare
  id varchar2(26); name varchar2(500); direct varchar2(2); cndxml varchar2(5000); cndxsl clob;
  thesql varchar2(5000); dispsql varchar2(5000); param varchar2(400); cfgxml varchar2(5000);
  resulttype varchar2(8); header varchar2(5000); footer varchar2(5000); bsql clob;
  bsql_pv varchar2(4000); bsql_pt varchar2(4000);
begin
  id := 'ynjksys_02007q'; name := '采集解析数据删除'; direct := '0';
  cndxml := '<?xml version="1.0" encoding="GB2312"?><EprSelect></EprSelect>';
  cndxsl := ''; thesql := ''; dispsql := ''; param := ''; cfgxml := '';
  resulttype := 'ntable'; header := ''; footer := '';
  delete from query_tbs_dispfmt where fid=id and fband in ('HEADER','FOOTER','DETAILS');
  delete from query_vws_cnd where fid=id;
  insert into query_vws_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter)
  values(id,name,direct,cndxml,cndxsl,null,dispsql,param,cfgxml,resulttype,header,footer);

  bsql := q'~declare
  p_json clob := ? -FH-
  v_hiino number := ? -FH-
  v_ifadmin varchar2(20) := ? -FH-
  v_root json_object_t -FH-
  v_item json_object_t -FH-
  v_fguids json_array_t -FH-
  v_fdiseq number -FH-
  v_fguid varchar2(80) -FH-
  v_data_status varchar2(20) -FH-
  v_file_count number := 0 -FH-
  v_deleted_rows number := 0 -FH-
  v_result_json varchar2(4000) -FH-
begin
  delete from q1 -FH-
  if nvl(trim(v_ifadmin), '0') <> '1' then
    raise_application_error(-20001, '当前账号无解析数据删除权限') -FH-
  end if -FH-

  v_root := json_object_t(p_json) -FH-
  v_item := treat(v_root.get_array('data').get(0) as json_object_t) -FH-
  v_fdiseq := v_item.get_number('fdiseq') -FH-
  v_data_status := v_item.get_string('数据状态') -FH-
  v_fguids := v_item.get_array('fguids') -FH-
  if v_fdiseq is null or v_fdiseq <= 0 or v_data_status <> '已删' then
    raise_application_error(-20002, '删除参数不正确') -FH-
  end if -FH-
  if v_fguids is null or v_fguids.get_size() = 0 then
    raise_application_error(-20003, '未选择需要删除的解析数据') -FH-
  end if -FH-
  if v_fguids.get_size() > 200 then
    raise_application_error(-20004, '单次最多删除200条解析数据') -FH-
  end if -FH-

  select count(*) into v_file_count
    from hii.ib_tbs_detailedinf d
   where d.fdiseq = v_fdiseq
     and d.fhiino = v_hiino
     and nvl(trim(d.finvalidflag), '0') = '0'
     and exists (select 1 from hii.ib_tbs_tbldat r
                  where r.fdiseq = d.fdiseq
                    and upper(trim(r.ftblnm)) = 'INSTFILE'
                    and trim(r.fpkseq2) = 'F') -FH-
  if v_file_count <> 1 then
    raise_application_error(-20005, '未找到当前机构对应的采集文件') -FH-
  end if -FH-

  for i in 0 .. v_fguids.get_size() - 1 loop
    v_fguid := trim(v_fguids.get_string(i)) -FH-
    if v_fguid is null or length(v_fguid) > 32 then
      raise_application_error(-20006, '解析数据标识格式不正确') -FH-
    end if -FH-
    delete from htlis.lis_instdata_new
     where fdiseq = v_fdiseq
       and fhiino = v_hiino
       and fguid = v_fguid -FH-
    v_deleted_rows := v_deleted_rows + sql%rowcount -FH-
  end loop -FH-
  if v_deleted_rows = 0 then
    raise_application_error(-20007, '所选解析数据已不存在或不属于当前文件') -FH-
  end if -FH-

  commit -FH-
  v_result_json := '{"success":true,"message":"解析数据删除成功","deletedRows":'
                   || v_deleted_rows || '}' -FH-
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
  bsql_pv := 'bodyjson_sql_equal,hiino_sql_equal,ifAdmin_sql_equal;';
  bsql_pt := 'V,N,V;';
  insert into query_tbs_dispfmt(fid,fband,fsql,fparavalofsql,fparatypeofsql,fxml,fxsl,fdispfmt)
  values(id,'DETAILS',bsql,bsql_pv,bsql_pt,null,null,'RS');
end;
/
commit;
