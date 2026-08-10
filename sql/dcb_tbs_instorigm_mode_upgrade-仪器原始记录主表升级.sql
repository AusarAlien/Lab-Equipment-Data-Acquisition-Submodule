-- 已创建 DCB_TBS_INSTORIGM 的一次性结构升级脚本。
-- 目的：模板编号使用字符业务标识，并增加 FILE 来源文件生成模式。
-- 当前表为空时可直接执行；若已有数据，修改字段前请先备份并确认模板编号兼容性。

alter table DCB_TBS_INSTORIGM drop constraint CK_DCB_INSTORIGM_MODE;

drop index IX_DCB_INSTORIGM_TEMPL;

alter table DCB_TBS_INSTORIGM modify FTEMPLSEQ VARCHAR2(64);

create index IX_DCB_INSTORIGM_TEMPL
  on DCB_TBS_INSTORIGM (FTEMPLSEQ, FTEMPLVER);

alter table DCB_TBS_INSTORIGM add constraint CK_DCB_INSTORIGM_MODE
  check (FGENERATEMODE in ('FILE', 'SAMPLE', 'ITEM'));

comment on column DCB_TBS_INSTORIGM.FGENERATEMODE is
  '生成组织模式：FILE来源文件模式、SAMPLE样品模式、ITEM项目模式';

commit;
