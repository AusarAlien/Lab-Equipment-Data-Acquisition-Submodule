select x.FDISEQ as 文件序号,
       x.INSTNO as 仪器编号,
       to_char(x.START_TIME,'yyyy-mm-dd hh24:mi:ss') as 开始时间,
       to_char(x.END_TIME,'yyyy-mm-dd hh24:mi:ss') as 结束时间,
       case x.RESULT_STATUS when 'SUCCESS' then '解析成功' else '解析失败' end as 解析结果,
       x.BEFORE_COUNT as 解析前数据量,
       x.AFTER_COUNT as 解析后数据量,
       x.ERROR_MESSAGE as 错误信息,
       x.REPARSE_REASON as 重新解析原因,
       x.FEMPID as 操作人
  from (
        select l.*,
               row_number() over(partition by l.FDISEQ order by l.START_TIME desc,l.FGUID desc) rn
          from HTLIS.LIS_INST_REPARSE_LOG l
         where l.FDISEQ = to_number(:fdiseq_sql_equal)
           and l.FHIINO = :hiino_sql_equal
       ) x
 where x.rn = 1
