import configparser as cfg
import sys
import traceback
import cx_Oracle


# 获取配置文件参数
def get_config(section, option):
    config = cfg.ConfigParser()
    try:
        config.read("config.ini", encoding="gbk")
        return config.get(section, option)
    except Exception as e:
        print("Error:获取配置参数失败 section -> [" + section + "], option -> [" + option + "]")
        print(traceback.format_exc())
        sys.exit(1)


# 获取数据库连接
def get_conn():
    db_url = get_config("database", "url")
    return cx_Oracle.connect(db_url)


