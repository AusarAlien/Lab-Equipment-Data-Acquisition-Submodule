import os
import traceback

from utils import *
import sys


# 程序入口
if __name__ == "__main__":
    try:
        # 检查一下数据库连接吧
        conn = get_conn()
        conn.close()
    except Exception as e:
        print(traceback.format_exc())
        sys.exit(0)
    # 循环
    while True:
        queryId = input("请输入你要导出的查询ID(exit)：").strip()
        if queryId == "":
            continue
        if queryId == "exit":
            sys.exit(0)

        # 是否加密
        ve = get_config("core", "exp_encryption")

        print("正在尝试导出：" + queryId)

        qc_sql = "select FID, nvl(FNAME,FID), FDIRECT, nvl(FCNDXML,' '),nvl(FCNDXSL,' '), " \
                   "nvl（FDISPSQL,' '）, nvl(FPARAOFDISPSQL,' '), nvl（FPARAM,' '）, nvl（FSQL,' '）, nvl（FCFGXML,' '）, " \
                   "nvl（FRESULTTYPE,' '）, nvl（FHEADER,' '）, nvl（FFOOTER,' '） " \
                   "from hii.query_tbs_cnd " \
                   "where FID = \'%s\' " % (queryId)

        qd_sql = "select FID,FBAND,nvl（decode（\'%s\','1',hiibase.htp_mm.f_dmm_c(FSQL),FSQL）,' '）,nvl（FPARAVALOFSQL,' '）,nvl（FPARATYPEOFSQL,' '）, " \
                 "nvl（FDISPFMT,' '）,nvl（FXML,' '）,nvl（decode（\'%s\','1',hiibase.htp_mm.f_dmm_c(FXSL),FXSL）,' '）,nvl（FXSLSQL,' '）,nvl（FXSLPV,' '）, " \
                 "nvl（FXSLPT,' '） " \
                 "from hii.query_tbs_dispfmt " \
                 "where FID = \'%s\' " % (ve,ve,queryId)

        conn = get_conn()
        cursor = conn.cursor()
        cursor.execute(qc_sql)
        data1 = cursor.fetchall()
        cursor.execute(qd_sql)
        data2 = cursor.fetchall()

        #查询定义和条件
        content = ""
        content += "declare\n"
        content += "\tid        varchar2(100);\n"
        content += "\tname	    varchar2(200);\n"
        content += "\tdirect	varchar2(2);\n"
        content += "\tcndxml	varchar2(4000);\n"
        content += "\tcndxsl	clob;\n"
        content += "\tcndsql	varchar2(4000);\n"
        content += "\tparaofsql	varchar2(500);\n"
        content += "\tdispsql	varchar2(4000);\n"
        content += "\tparaofdispsql	varchar2(500);\n"
        content += "\tparam		varchar2(400);\n"
        content += "\tcfgxml	varchar2(4000);\n"
        content += "\tresulttype	varchar2(8);\n"
        content += "\theader	varchar2(4000);\n"
        content += "\tfooter	varchar2(4000);\n"
        content += "\tband		varchar2(18);\n"
        content += "\tbsql		clob;\n"
        content += "\tparavalofsql	varchar2(4000);\n"
        content += "\tparatypeofsql	varchar2(4000);\n"
        content += "\tdispfmt		varchar2(500);\n"
        content += "\txml		clob;\n"
        content += "\txsl		clob;\n"
        content += "\txslsql		varchar2(4000);\n"
        content += "\txslpv		varchar2(4000);\n"
        content += "\txslpt		varchar2(4000);\n"
        #开始
        content += "begin\n"
        content += "\t--查询及其查询条件定义\n"
        content += "\tid := '" + queryId + "';\n"
        if len(data1)>0:
            row_list = list(data1[0])
            content += "\tname := '" + row_list[1].strip() + "';\n"
            content += "\tdirect := '" + row_list[2].strip() + "';\n"
            content += "\tcndxml := '" + row_list[3].replace("&", "'||'&'||'").replace("'", "''").replace("''||''&''||''#160;", "'||'&'||'#160;").replace("''||''&''||''amp;", "'||'&'||'amp;").strip()  + "';\n"
            content += "\tcndxsl := '" + (row_list[4] if row_list[4] == "" else row_list[4].read()).replace("&", "'||'&'||'").replace("'", "''").replace("''||''&''||''#160;", "'||'&'||'#160;").replace("''||''&''||''amp;", "'||'&'||'amp;").strip()+ "';\n"
            content += "\tdispsql := '" + row_list[5].replace("&", "'||'&'||'").replace("'", "''").strip()+ "';\n"
            content += "\tparaofdispsql := '" + row_list[6].replace("&", "'||'&'||'").replace("'", "''").strip() + "';\n"
            content += "\tparam := '" + row_list[7].replace("&", "'||'&'||'").replace("'", "''").strip() + "';\n"
            content += "\tcndsql := '" + row_list[8].replace("&", "'||'&'||'").replace("'", "''").strip() + "';\n"
            content += "\tcfgxml := '" + row_list[9].replace("&", "'||'&'||'").replace("'", "''").strip() + "';\n"
            content += "\tresulttype := '" + row_list[10].replace("&", "'||'&'||'").replace("'", "''").strip() + "';\n"
            content += "\theader := '" + row_list[11].replace("&", "'||'&'||'").replace("'", "''").strip() + "';\n"
            content += "\tfooter := '" + row_list[12].replace("&", "'||'&'||'").replace("'", "''").strip() + "';\n"
            content += "\tdelete from query_tbs_cnd where fid = id;\n"
            content += "\tinsert into query_tbs_cnd(fid,fname,fdirect,fcndxml,fcndxsl,fsql,fdispsql,fparaofdispsql,fparam,fcfgxml,fresulttype,fheader,ffooter)\n"
            content += "\tvalues(id,name,direct,cndxml,cndxsl,cndsql,dispsql,paraofdispsql,param,cfgxml,resulttype,header,footer);\n"
            content +="\n"

        #query_tbs_dispfmt
        for row in data2:
            row_list = list(row)
            content += "\t----插入" + row_list[1].strip() + "区\n"
            content += "\tband := '" + row_list[1].strip() + "';\n"
            content += "\tbsql := '" + (row_list[2] if row_list[2] == "" else row_list[2].read()).replace("&","'||'&'||'").replace("'", "''").strip() + "';\n"
            content += "\tparavalofsql := '" + row_list[3].strip() +"';\n"
            content += "\tparatypeofsql := '" + row_list[4].strip() +"';\n"
            content += "\tdispfmt := '" + row_list[5].strip() + "';\n"
            content += "\txml := '" + (row_list[6] if row_list[6] == "" else row_list[6].read()).replace("&","'||'&'||'").replace("'", "''").replace("''||''&''||''#160;", "'||'&'||'#160;").replace("''||''&''||''amp;", "'||'&'||'amp;").strip() + "';\n"
            content += "\txsl := '" + (row_list[7] if row_list[7] == "" else row_list[7].read()).replace("&","'||'&'||'").replace("'", "''").replace("''||''&''||''#160;", "'||'&'||'#160;").replace("''||''&''||''amp;", "'||'&'||'amp;").strip() + "';\n"
            content += "\txslsql := '" + row_list[8].strip() + "';\n"
            content += "\txslpv := '" + row_list[9].strip() + "';\n"
            content += "\txslpt := '" + row_list[10].strip() + "';\n"
            content += "\tdelete from query_tbs_dispfmt where fid = id and fband = band;\n"
            content += "\tinsert into query_tbs_dispfmt(fid,fband,fsql,fxml,fxsl,fparavalofsql,fparatypeofsql,fdispfmt,fxslsql,fxslpv,fxslpt)\n"
            content += "\tvalues(id,band,bsql,xml,xsl,paravalofsql,paratypeofsql,dispfmt,xslsql,xslpv,xslpt);\n"
            content += "\n"

        # 结尾
        content += "end;\n/\n\ncommit;\n"

        cursor.close()
        conn.close()

        # 生成文件
        filename = queryId + '.sql'
        flag = os.path.exists(filename)
        if flag:
            if_cover = input("文件名:[" + filename + "]已存在，直接回车覆盖 or 输入任意内容回车另起文件名：")
            # 如果有输入内容，就生成个新的文件名
            if len(if_cover) > 0:
                i = 1
                new_filename = ""
                while True:
                    new_filename = queryId + "(" + str(i) + ")" + ".sql"
                    if os.path.exists(new_filename):
                        i += 1
                        continue
                    else:
                        break
                filename = new_filename

        # 写入文件
        with open(filename, 'w', encoding='gbk') as dao:
            dao.write(content)
            print("导出成功：" + filename)
            print("---------------------------\n")
