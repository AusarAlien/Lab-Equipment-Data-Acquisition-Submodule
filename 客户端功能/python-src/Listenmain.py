# -*- coding: utf-8 -*-
import json
import os, sys, queue, traceback, logging, time, platform
import shutil
import uuid
import threading
import tkinter as tk
from datetime import datetime
from logging import handlers
from pathlib import Path
from urllib.parse import quote
from tkinter import ttk, messagebox
from configparser import ConfigParser

import requests
from PIL import Image, ImageDraw
import pystray
from client_api import ClientApi, ClientApiError

# [2026-07-15] USB 接口支持
from usb_utils import (
    get_removable_drives, get_all_fixed_drives,
    watch_new_drives, scan_drive_files,
    parse_serial_line, parse_serial_csv_header, split_binary_frames
)
try:
    import serial
    SERIAL_AVAILABLE = True
except ImportError:
    SERIAL_AVAILABLE = False

# ---------------- 日志 ----------------
log = logging.getLogger('monitor')
GUI_LOG_QUEUE = queue.Queue(maxsize=2000)

class _GuiQueueHandler(logging.Handler):
    def emit(self, record):
        try:
            message = self.format(record)
            try:
                GUI_LOG_QUEUE.put_nowait(message)
            except queue.Full:
                try:
                    GUI_LOG_QUEUE.get_nowait()
                except queue.Empty:
                    pass
                GUI_LOG_QUEUE.put_nowait(message)
        except Exception:
            pass

if not log.handlers:
    fmt = logging.Formatter('%(asctime)s | %(message)s')

    # [2026-07-16] 文件日志写入 exe 同目录，按午夜切分，保留 3 天
    _log_dir = os.path.dirname(os.path.abspath(sys.executable)) if getattr(sys, 'frozen', False) else os.path.abspath('.')
    fh = handlers.TimedRotatingFileHandler(
        os.path.join(_log_dir, 'monitor.log'), when='midnight', backupCount=3, encoding='utf-8')
    fh.setFormatter(fmt)
    log.addHandler(fh)

    # [2026-07-16] 控制台输出
    ch = logging.StreamHandler(sys.stdout)
    ch.setFormatter(fmt)
    log.addHandler(ch)

    gui_handler = _GuiQueueHandler()
    gui_handler.setFormatter(fmt)
    log.addHandler(gui_handler)

    log.setLevel(logging.INFO)
# ---------------- 工具函数 ----------------
def resource_path(rel_path: str) -> str:
    base_path = getattr(sys, '_MEIPASS', os.path.abspath('.'))
    return os.path.join(base_path, rel_path)

def create_image() -> Image.Image:
    img = Image.new('RGB', (64, 64), 'white')
    draw = ImageDraw.Draw(img)
    draw.ellipse((8, 8, 56, 56), fill='orange')
    draw.text((16, 22), 'Py', fill='white')
    return img

# ---------------- 配置读写 ----------------
import re as _re

def _app_dir() -> str:
    """exe 所在目录"""
    if getattr(sys, 'frozen', False):
        return os.path.dirname(os.path.abspath(sys.executable))
    return os.path.abspath('.')

CFG_FILE = os.path.join(_app_dir(), 'config.ini')

# 默认配置模板（首次运行自动生成）
_DEFAULT_CONFIG = """[interface]
type = http
instno = ICPMS
filepath =
frequency = 20
service =
startrow = 1
sampcolflag = 样品名称
track_mode = 1
usb_mode = mass_storage
usb_drive_letters =
usb_poll_interval = 5
usb_local_copy_dir =
com_port = COM3
com_baudrate = 9600
com_bytesize = 8
com_stopbits = 1
com_parity = N
com_timeout = 0
com_line_terminator = \\r\\n
data_mode = file_first
usb_output_dir =
usb_filename_template = {instno}_{datetime}_{seq}.csv
stream_format = text_line
frame_header =
frame_footer =
frame_length = 0
# 留空=自动：AXIOIMAGERZ2 锁定 .pdf/.txt（伴生打包），其他仪器任意扩展名
allowed_extensions =
max_companion_files = 20
companion_arrival_window = 2
companion_match_mode = auto
file_stable_wait = 2
upload_retry_backoff = 1
max_retry_interval = 1800

# [2026-08-03] 客户端心跳上报
client_id =
client_type = python
client_ver = v2_20260810
lab_id =
heartbeat_interval = 60
client_api_enabled = 1
# 凭证功能停用；以下配置保留为注释，当前运行不要求填写。
# auth_key_id =
# client_secret =
config_pull_interval = 300
"""

def _ensure_config() -> None:
    """config.ini 不存在时自动生成"""
    if not os.path.exists(CFG_FILE):
        try:
            os.makedirs(os.path.dirname(CFG_FILE) or _app_dir(), exist_ok=True)
            with open(CFG_FILE, 'w', encoding='utf-8') as f:
                f.write(_DEFAULT_CONFIG)
            log.info('已生成默认配置文件：%s', CFG_FILE)
        except Exception as e:
            log.warning('无法生成默认配置文件：%s', e)

_ensure_config()
CLIENT_API = ClientApi(CFG_FILE, log)

def get_config(section: str, option: str, fallback=None):
    """读取配置项，缺失时返回 fallback（不会崩溃）"""
    cfg = ConfigParser()
    try:
        if os.path.exists(CFG_FILE):
            cfg.read(CFG_FILE, encoding='utf-8-sig')
        if cfg.has_section(section):
            return cfg.get(section, option)
    except Exception:
        pass
    if fallback is not None:
        return fallback
    return ''

def get_config_list(section: str, option: str) -> list:
    """读取逗号分隔的配置列表，缺失时返回空列表"""
    s = get_config(section, option, fallback='')
    if not s or not s.strip():
        return []
    return [p.strip().lower() for p in s.split(',') if p.strip()]
def _write_config_file(updates: dict) -> None:
    """
    用正则逐行替换 config.ini 的值，保留注释和空行，自动去重。
    updates = {'interface': {'type': 'http', 'instno': 'ICPMS'}, ...}
    """
    if not os.path.exists(CFG_FILE):
        _ensure_config()

    try:
        with open(CFG_FILE, 'r', encoding='utf-8-sig') as f:
            lines = f.readlines()
    except Exception:
        lines = _DEFAULT_CONFIG.splitlines(True)

    # 收集所有要更新的 option → value 映射
    all_opts = {}
    for section, opts in updates.items():
        for opt, val in opts.items():
            all_opts[(section, opt)] = str(val)

    replaced = set()  # 已替换的 (section, opt)，用于去重
    new_lines = []
    current_section = None

    for line in lines:
        stripped = line.strip()

        # 检测节头
        if stripped.startswith('[') and stripped.endswith(']'):
            current_section = stripped[1:-1].strip()

        # [2026-07-16] 跳过不含 = 的裸值行（损坏的重复数据）
        if current_section and not stripped.startswith('#') and not stripped.startswith(';') \
                and not (stripped.startswith('[') and stripped.endswith(']')) \
                and stripped and '=' not in stripped:
            continue

        # 检查是否是需要替换的选项行（不是注释、不是节头）
        if (current_section and
            not stripped.startswith('#') and not stripped.startswith(';') and
            not (stripped.startswith('[') and stripped.endswith(']'))):

            for (sec, opt), val in all_opts.items():
                if sec != current_section:
                    continue
                key = (sec, opt)
                pat = _re.compile(
                    r'^([ \t]*' + _re.escape(opt) + r'[ \t]*[=:][ \t]*).*',
                    _re.IGNORECASE
                )
                m = pat.match(line)
                if m:
                    if key in replaced:
                        line = None
                    else:
                        line = f'{opt} = {val}\n'
                        replaced.add(key)
                    break

        if line is not None:
            new_lines.append(line)

    # 追加尚未出现在文件中的新选项
    for section in updates:
        section_lines = []
        for opt, val in updates[section].items():
            if (section, opt) not in replaced:
                section_lines.append(f'{opt} = {val}\n')
        if section_lines:
            new_lines.append(f'\n[{section}]\n')
            new_lines.extend(section_lines)

    # 回写
    os.makedirs(os.path.dirname(CFG_FILE) or _app_dir(), exist_ok=True)
    with open(CFG_FILE, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)

def sys_guid_str() -> str:
    """把 UUID 转成 Oracle RAW 的 32 位大写字符串，中间无分隔符"""
    return uuid.uuid4().hex.upper()

def _report_upload_event(paths, result, elapsed_ms):
    """Best-effort business event reporting; never changes the upload result."""
    if not CLIENT_API.enabled():
        return

    def send():
        try:
            local_paths = list(paths or [])
            success = str((result or {}).get('result', '')).lower() == 'success'
            response = (result or {}).get('resp')
            raw = json.dumps(response, ensure_ascii=False)[:4000] if response else ''
            CLIENT_API.event(
                'UPLOAD_SUCCESS' if success else 'UPLOAD_FAIL',
                result_status='SUCCESS' if success else 'FAILED',
                level='INFO' if success else 'ERROR',
                file_name='; '.join(os.path.basename(p) for p in local_paths)[:500],
                file_size=sum(os.path.getsize(p) for p in local_paths if os.path.isfile(p)),
                message='文件上传成功' if success else ((result or {}).get('error') or '文件上传失败'),
                raw_detail=raw,
                duration_ms=max(0, int(elapsed_ms)), retry_count=0,
                error_code='' if success else 'UPLOAD_FAILED', request_guid=sys_guid_str(),
            )
        except Exception as exc:
            log.warning('客户端上传事件未送达：%s', exc)
    threading.Thread(target=send, daemon=True).start()

# ---------------- [2026-07-15] 新增：文件处理状态追踪 ----------------
# 功能：track_mode=1 时，上传成功的文件保留在原地，通过 processed_files.json 记录处理状态
#       避免原备份+删除模式下用户需要去备份目录查找文件的不便
# [2026-07-15] 修复：追踪文件存入监听目录自身，每个目录独立追踪，避免跨目录同名冲突
TRACK_FILE = 'processed_files.json'

def _track_path(watch_dir: str) -> str:
    """返回监听目录下的追踪文件完整路径"""
    return os.path.join(watch_dir, TRACK_FILE)

def load_processed_files(watch_dir: str = '') -> dict:
    """从监听目录下的 processed_files.json 加载已处理文件记录"""
    path = _track_path(watch_dir) if watch_dir else TRACK_FILE
    if os.path.isfile(path):
        try:
            with open(path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception:
            log.warning('读取追踪文件失败，将重新初始化：%s', path)
    return {}

def save_processed_files(records: dict, watch_dir: str = '') -> None:
    """将已处理文件记录原子写入监听目录下的 processed_files.json"""
    path = _track_path(watch_dir) if watch_dir else TRACK_FILE
    tmp_path = path + '.tmp'
    try:
        with open(tmp_path, 'w', encoding='utf-8') as f:
            json.dump(records, f, ensure_ascii=False, indent=2)
        os.replace(tmp_path, path)  # Windows 上原子重命名
    except Exception as e:
        log.warning('写入追踪文件失败：%s', e)
        # 清理残留 tmp
        try:
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        except Exception:
            pass

# [2026-07-15] 抽取公共上传方法，供 http / usb_storage / usb_serial 三种模式共用
def upload_single_file(full_path: str, instno: str, service_url: str) -> dict:
    """
    上传单个文件到服务端。
    参数:
        full_path: 文件完整路径
        instno: 仪器编号
        service_url: 服务地址 (如 http://127.0.0.1:8897/smapp)
    返回: {'result': 'success'|'fail', 'resp': {...}, 'error': str|None}
    """
    started = time.time()
    name = os.path.basename(full_path)
    utf8_name = quote(name)
    data = {
        'instno': instno,
        'sessionId': 'FIXEDS11',
        'fguid': sys_guid_str(),
        'startrow': get_config('interface', 'startrow', fallback='1'),
        'sampcolflag': get_config('interface', 'sampcolflag', fallback='样品名称')
    }
    json_str = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    data1 = {'dataquote': quote(json_str), 'sessionId': 'FIXEDS11'}

    url = service_url + '/UploadInstDataFilesNew.m'

    try:
        with open(full_path, 'rb') as f:
            files = {'file': (utf8_name, f, 'application/octet-stream')}
            # [2026-07-16] 禁用系统代理：仪器数据服务器通常是内网地址，不应走代理
            # 仪器数据服务器通常位于隔离内网，明确禁用环境变量和系统代理。
            # 连接超时较短，断网后可尽快回到下一轮扫描；读取仍保留30秒。
            with requests.Session() as session:
                session.trust_env = False
                resp = session.post(url, data=data1, files=files, timeout=(5, 30))
        resp_json = resp.json()
        result = {'result': resp_json.get('result', ''), 'resp': resp_json, 'error': None}
        _report_upload_event([full_path], result, (time.time() - started) * 1000)
        return result
    except requests.exceptions.ConnectionError:
        result = {'result': 'fail', 'resp': None, 'error': '连接失败（服务器不可达）'}
        _report_upload_event([full_path], result, (time.time() - started) * 1000)
        return result
    except Exception as e:
        result = {'result': 'fail', 'resp': None, 'error': str(e)}
        _report_upload_event([full_path], result, (time.time() - started) * 1000)
        return result

# [2026-08-03] 客户端心跳上报：定时向服务端汇报运行状态和采集统计

# [2026-08-07] 批量上传（伴生文件打包），与 Go 版 uploadFiles 行为一致
def upload_multiple_files(full_paths: list, instno: str, service_url: str) -> dict:
    """
    批量上传多个文件到服务端（同一 multipart 请求）。
    所有文件使用相同的 "file" 字段名，服务端 myFiles 可遍历全部。
    返回: {"result": "success"|"fail", "resp": ..., "error": str|None}
    """
    if not full_paths:
        return {"result": "fail", "resp": None, "error": "文件列表为空"}
    if len(full_paths) == 1:
        return upload_single_file(full_paths[0], instno, service_url)

    started = time.time()
    data = {
        "instno": instno,
        "sessionId": "FIXEDS11",
        "fguid": sys_guid_str(),
        "startrow": get_config("interface", "startrow", fallback="1"),
        "sampcolflag": get_config("interface", "sampcolflag", fallback="样品名称")
    }
    json_str = json.dumps(data, ensure_ascii=False, separators=(",", ":"))
    fields = {"dataquote": quote(json_str), "sessionId": "FIXEDS11"}

    # 所有文件用同一 "file" 字段名（与 Go 版一致）
    files = []
    for fp in full_paths:
        name = os.path.basename(fp)
        utf8_name = quote(name)
        files.append(("file", (utf8_name, open(fp, "rb"), "application/octet-stream")))

    url = service_url + "/UploadInstDataFilesNew.m"
    try:
        with requests.Session() as session:
            session.trust_env = False
            resp = session.post(url, data=fields, files=files, timeout=(5, 60))
        resp_json = resp.json()
        result = {"result": resp_json.get("result", ""), "resp": resp_json, "error": None}
        _report_upload_event(full_paths, result, (time.time() - started) * 1000)
        return result
    except requests.exceptions.ConnectionError:
        result = {"result": "fail", "resp": None, "error": "连接失败（服务器不可达）"}
        _report_upload_event(full_paths, result, (time.time() - started) * 1000)
        return result
    except Exception as e:
        result = {"result": "fail", "resp": None, "error": str(e)}
        _report_upload_event(full_paths, result, (time.time() - started) * 1000)
        return result
    finally:
        for _, (_, fh, _) in files:
            try:
                fh.close()
            except Exception:
                pass

def send_heartbeat(info: dict, service_url: str) -> bool:
    """
    向服务端发送心跳 + 采集统计。
    info 应包含: client_id, client_type, client_ver, lab_id, instno,
                heartbeat_seq, status, mode, upload_total, upload_fail, uptime_sec, os
    """
    data = {
        'client_id': info.get('client_id', ''),
        'client_type': info.get('client_type', 'python'),
        'client_ver': info.get('client_ver', '2.0.0'),
        'lab_id': info.get('lab_id', ''),
        'instno': info.get('instno', ''),
        'heartbeat_seq': info.get('heartbeat_seq', 0),
        'status': info.get('status', 'running'),
        'mode': info.get('mode', ''),
        'upload_total': info.get('upload_total', 0),
        'upload_fail': info.get('upload_fail', 0),
        'uptime_sec': info.get('uptime_sec', 0),
        'os': info.get('os', platform.platform()),
    }
    try:
        CLIENT_API.heartbeat(data)
        log.info(
            '心跳上报成功 | 序号=%s 成功=%s 失败=%s',
            data.get('heartbeat_seq', 0),
            data.get('upload_total', 0),
            data.get('upload_fail', 0),
        )
        return True
    except Exception as exc:
        log.warning('客户端心跳未送达：%s', exc)
        return False

# [2026-08-10] TXT 组别名提取 — 读取 TXT 第一行，提取 Metafer 前的组别名
def extract_txt_group_name(filepath: str) -> str:
    """读取 TXT 标题行提取组别名，与服务端 AxioImagerZ2.extractTxtGroupName 逻辑一致"""
    try:
        with open(filepath, 'r', encoding='gbk') as f:
            first_line = f.readline()
        if 'Metafer' in first_line:
            idx = first_line.index('Metafer')
            group = first_line[:idx].strip()
            # 去掉 .3~A 等 Metafer 后缀标记
            if '.' in group:
                import re
                dot_idx = group.rfind('.')
                suffix = group[dot_idx:]
                if re.match(r'.[0-9]+~[A-Za-z]', suffix):
                    group = group[:dot_idx].strip()
            return group
    except Exception:
        pass
    return ""


# [2026-08-10] 文件稳定性检测 — 避免上传仪器正在写入的文件
def is_file_stable(filepath: str, wait_seconds: int = 2) -> bool:
    """检查文件大小在 wait_seconds 内是否不变"""
    try:
        size1 = os.path.getsize(filepath)
        time.sleep(wait_seconds)
        size2 = os.path.getsize(filepath)
        return size1 == size2
    except OSError:
        return False


def _calc_retry_backoff(fail_count: int, max_interval: int = 1800) -> int:
    """计算指数退避延迟（秒）：1→0, 2→60, 3→120, 4→240, ... 上限 max_interval"""
    if fail_count <= 1:
        return 0  # 首次失败立即重试
    delay = 60 * (2 ** (fail_count - 2))  # 第2次=60s, 第3次=120s, 第4次=240s, ...
    return min(delay, max_interval)


def _should_skip_backoff(name: str, processed: dict, now: float) -> bool:
    """检查文件是否处于退避等待期，返回 True 表示应跳过"""
    rec = processed.get(name)
    if not rec:
        return False
    next_retry = rec.get('next_retry_time', '')
    if next_retry:
        try:
            if float(next_retry) > now:
                return True
        except (ValueError, TypeError):
            pass
    return False


# [2026-08-07] 文件信息结构（伴生文件打包用）
class _FileInfo:
    __slots__ = ('name', 'full', 'ext', 'size', 'mtime', 'is_new', 'group_name')

    def __init__(self, name, full, ext, size, mtime, is_new, group_name=''):
        self.name = name
        self.full = full
        self.ext = ext
        self.size = size
        self.mtime = mtime
        self.is_new = is_new
        self.group_name = group_name


# ---------------- 主程序 ----------------
class App:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title('仪器接口监听程序')
        self.root.geometry('760x720')
        self.root.resizable(True, True)
        self.root.minsize(660, 600)
        self.root.protocol('WM_DELETE_WINDOW', self.hide_window)

        # ---- [2026-07-15] 接口类型字段定义 ----
        # [2026-08-03] 各模式末尾追加心跳上报字段
        self.FIELD_SETS = {
            'http': [
                ('仪器类型', 'interface', 'instno', '', None),
                ('监听目录', 'interface', 'filepath', '', '仪器输出文件的目录路径'),
                ('监听频率', 'interface', 'frequency', '5', '秒'),
                ('服务地址', 'interface', 'service', '', 'http://ip:port/app'),
                ('客户端编号', 'interface', 'client_id', '', '唯一标识，如 AGILENT1200-001'),
                ('实验室编号', 'interface', 'lab_id', '', '如 ZQCDC-410000'),
                ('心跳间隔', 'interface', 'heartbeat_interval', '60', '秒，0=关闭'),
            ],
            'usb': [
                ('仪器类型', 'interface', 'instno', '', None),
                ('USB模式', 'interface', 'usb_mode', 'mass_storage', 'mass_storage/serial_port/auto'),
                ('COM端口', 'interface', 'com_port', 'COM3', 'serial_port 时必填'),
                ('波特率', 'interface', 'com_baudrate', '9600', '常用: 9600/19200/38400/115200'),
                ('磁盘过滤', 'interface', 'usb_drive_letters', '', 'mass_storage: 指定盘符(逗号分隔)，空=自动检测'),
                ('扫描间隔', 'interface', 'usb_poll_interval', '5', '秒'),
                ('服务地址', 'interface', 'service', '', 'http://ip:port/app'),
                ('客户端编号', 'interface', 'client_id', '', '唯一标识'),
                ('实验室编号', 'interface', 'lab_id', '', '如 ZQCDC-410000'),
                ('心跳间隔', 'interface', 'heartbeat_interval', '60', '秒，0=关闭'),
            ],
            'com': [
                ('仪器类型', 'interface', 'instno', '', None),
                ('COM端口', 'interface', 'com_port', 'COM1', None),
                ('波特率', 'interface', 'com_baudrate', '9600', None),
                ('服务地址', 'interface', 'service', '', None),
                ('客户端编号', 'interface', 'client_id', '', '唯一标识'),
                ('实验室编号', 'interface', 'lab_id', '', '如 ZQCDC-410000'),
                ('心跳间隔', 'interface', 'heartbeat_interval', '60', '秒，0=关闭'),
            ],
            '数据库': [
                ('仪器类型', 'interface', 'instno', '', None),
                ('数据库URL', 'database', 'url', '', 'user/pass@host:port/sid'),
                ('查询间隔', 'interface', 'frequency', '5', '秒'),
                ('服务地址', 'interface', 'service', '', None),
                ('客户端编号', 'interface', 'client_id', '', '唯一标识'),
                ('实验室编号', 'interface', 'lab_id', '', '如 ZQCDC-410000'),
                ('心跳间隔', 'interface', 'heartbeat_interval', '60', '秒，0=关闭'),
            ],
        }

        # ── 主容器，内边距 ──
        main = ttk.Frame(self.root, padding=(10, 5))
        main.pack(fill='both', expand=True)

        # ── 接口类型选择 ──
        type_frame = ttk.LabelFrame(main, text='接口类型', padding=(10, 5))
        type_frame.pack(fill='x', pady=(0, 8))

        languages = ['http', 'com', 'usb', '数据库']
        self.radio_var = tk.StringVar(value=get_config('interface', 'type', fallback='http'))
        for lang in languages:
            ttk.Radiobutton(type_frame, text=lang, value=lang,
                            variable=self.radio_var,
                            command=self._on_type_change).pack(side=tk.LEFT, padx=12)

        # ── 参数配置 ──
        self.param_frame = ttk.LabelFrame(main, text='参数配置', padding=(10, 5))
        self.param_frame.pack(fill='both', expand=True, pady=(0, 8))

        self.param_widgets = []
        self.hint_label = ttk.Label(main, text='', foreground='gray')
        self.hint_label.pack(anchor='w', pady=(0, 5))

        self._build_param_fields(self.radio_var.get())

        # ── 实时运行日志终端 ──
        log_frame = ttk.LabelFrame(main, text='运行日志终端', padding=(6, 5))
        log_frame.pack(fill='both', expand=True, pady=(0, 8))
        terminal_row = ttk.Frame(log_frame)
        terminal_row.pack(fill='both', expand=True)
        self.log_terminal = tk.Text(
            terminal_row, height=11, wrap='none', state='disabled',
            bg='#171a21', fg='#e8edf5', insertbackground='#ffffff',
            font=('Consolas', 9), relief='flat', padx=6, pady=5
        )
        log_y = ttk.Scrollbar(terminal_row, orient='vertical', command=self.log_terminal.yview)
        log_x = ttk.Scrollbar(log_frame, orient='horizontal', command=self.log_terminal.xview)
        self.log_terminal.configure(yscrollcommand=log_y.set, xscrollcommand=log_x.set)
        self.log_terminal.pack(side=tk.LEFT, fill='both', expand=True)
        log_y.pack(side=tk.RIGHT, fill='y')
        log_x.pack(fill='x')
        terminal_tools = ttk.Frame(log_frame)
        terminal_tools.pack(fill='x', pady=(4, 0))
        ttk.Label(terminal_tools, text='实时显示扫描、上传、心跳和策略同步痕迹',
                  foreground='gray').pack(side=tk.LEFT)
        ttk.Button(terminal_tools, text='清空日志', command=self._clear_log_terminal).pack(side=tk.RIGHT)
        self.root.after(100, self._drain_log_terminal)

        # ── 按钮 ──
        btn_frame = ttk.Frame(main)
        btn_frame.pack(fill='x', pady=(5, 0))
        self.start_btn = ttk.Button(btn_frame, text='启动监听', command=self.on_start)
        self.start_btn.pack(side=tk.LEFT, padx=(0, 8))
        self.root.after(0, lambda: self.start_btn.invoke())

        self.stop_btn = ttk.Button(btn_frame, text='停止监听', command=self.on_stop)
        self.stop_btn.pack(side=tk.LEFT, padx=4)
        self.stop_btn.config(state='disabled')
        ttk.Button(btn_frame, text='保存配置', command=self.save_cfg).pack(side=tk.LEFT, padx=4)
        ttk.Button(btn_frame, text='退出程序', command=self.quit_app).pack(side=tk.RIGHT)

        # ── 状态栏 ──
        self.status = tk.StringVar(value='就绪')
        ttk.Label(main, textvariable=self.status, relief='sunken', anchor='w',
                  padding=(5, 2)).pack(fill='x', pady=(8, 0))

        # ---- 居中显示 ----
        self.root.update_idletasks()
        sw, sh = self.root.winfo_screenwidth(), self.root.winfo_screenheight()
        w, h = self.root.winfo_width(), self.root.winfo_height()
        self.root.geometry(f'{w}x{h}+{(sw - w) // 2}+{(sh - h) // 2}')
        # 首次启动保持主窗口可见，让现场人员能立即看到实时工作日志；
        # 用户点击关闭按钮后仍按原有逻辑隐藏到系统托盘。

        # ---- 托盘 ----
        menu = pystray.Menu(
            pystray.MenuItem('显示', self.show_window, default=True),
            pystray.Menu.SEPARATOR,
            pystray.MenuItem('退出', self.quit_app)
        )
        self.icon = pystray.Icon('PyTray', create_image(), '仪器接口监听程序', menu)
        threading.Thread(target=self.icon.run, daemon=True).start()

        # ---- 后台线程对象 ----
        self.monitor_thread = None
        self.monitor_flag = threading.Event()
        self.exc_queue = queue.Queue()
        self._exiting = False
        self.root.after(500, self._check_exc)

        # [2026-08-03] 心跳统计
        self.hb_seq = 0
        self.hb_upload_total = 0
        self.hb_upload_fail = 0
        self.hb_start_time = time.time()
        self.hb_last_time = 0.0  # 上次心跳时间戳

    # [2026-08-03] 心跳调用：根据间隔判断是否需要发送
    def _maybe_heartbeat(self, mode: str, service_url: str):
        """在每次监听循环末尾调用，按 heartbeat_interval 间隔发送心跳"""
        interval = int(get_config('interface', 'heartbeat_interval', fallback='60'))
        if interval <= 0 or not CLIENT_API.enabled():
            return
        now = time.time()
        if self.hb_last_time > 0 and (now - self.hb_last_time) < interval:
            return
        self.hb_last_time = now
        self.hb_seq += 1
        info = {
            'client_id': get_config('interface', 'client_id', fallback=''),
            'client_type': get_config('interface', 'client_type', fallback='python'),
            'client_ver': get_config('interface', 'client_ver', fallback='2.0.0'),
            'lab_id': get_config('interface', 'lab_id', fallback=''),
            'instno': get_config('interface', 'instno', fallback=''),
            'heartbeat_seq': self.hb_seq,
            'status': 'running',
            'mode': mode,
            'upload_total': self.hb_upload_total,
            'upload_fail': self.hb_upload_fail,
            'uptime_sec': int(now - self.hb_start_time),
            'os': platform.platform(),
        }
        send_heartbeat(info, service_url)
        CLIENT_API.maybe_pull(now)

    def _hb_record_upload(self, success: bool):
        """记录上传结果，供心跳统计"""
        if success:
            self.hb_upload_total += 1
        else:
            self.hb_upload_fail += 1

    # ---------------- 事件 ----------------
    def _clear_log_terminal(self):
        self.log_terminal.config(state='normal')
        self.log_terminal.delete('1.0', tk.END)
        self.log_terminal.config(state='disabled')

    def _drain_log_terminal(self):
        messages = []
        for _ in range(200):
            try:
                messages.append(GUI_LOG_QUEUE.get_nowait())
            except queue.Empty:
                break
        if messages:
            self.log_terminal.config(state='normal')
            self.log_terminal.insert(tk.END, '\n'.join(messages) + '\n')
            try:
                line_count = int(self.log_terminal.index('end-1c').split('.')[0])
                if line_count > 1200:
                    self.log_terminal.delete('1.0', '%d.0' % (line_count - 1000))
            except Exception:
                pass
            self.log_terminal.see(tk.END)
            self.log_terminal.config(state='disabled')
        if not self._exiting:
            self.root.after(150, self._drain_log_terminal)

    def hide_window(self):
        self.root.withdraw()

    def show_window(self, *_):
        # pystray在独立线程调用菜单回调；所有Tk操作必须切回主线程。
        if threading.current_thread() is not threading.main_thread():
            self.root.after(0, self.show_window)
            return
        self.root.deiconify()
        self.root.lift()
        self.root.focus_force()

    def quit_app(self, *_):
        # pystray在独立线程调用菜单回调；所有Tk操作必须切回主线程。
        if threading.current_thread() is not threading.main_thread():
            self.root.after(0, self.quit_app)
            return
        if self._exiting:
            return
        self._exiting = True
        self.on_stop()
        self.icon.stop()
        self.root.quit()

    # [2026-07-15] 重建参数输入面板
    def _build_param_fields(self, if_type: str):
        """根据接口类型销毁旧控件并重建参数输入行，tip含/时渲染为下拉框"""
        for child in self.param_frame.winfo_children():
            child.destroy()
        self.param_widgets.clear()

        fields = self.FIELD_SETS.get(if_type, self.FIELD_SETS['http'])
        for lab, sec, opt, fallback, tip in fields:
            frm = ttk.Frame(self.param_frame)
            frm.pack(fill='x', pady=3)
            label_w = ttk.Label(frm, text=lab + '：', width=10, anchor='e')
            label_w.pack(side=tk.LEFT, padx=(5, 4))

            # [2026-07-15] tip 含 / 时渲染为下拉选择框（选项用/分隔）
            if tip and '/' in tip and not tip.startswith('http'):
                options = [o.strip() for o in tip.split('/')]
                val = get_config(sec, opt, fallback=fallback)
                entry_w = ttk.Combobox(frm, values=options, state='readonly', width=18)
                if val in options:
                    entry_w.set(val)
                elif options:
                    entry_w.set(options[0])
                entry_w.pack(side=tk.LEFT, padx=(0, 5))
                tip_w = None
            else:
                entry_w = ttk.Entry(frm)
                val = get_config(sec, opt, fallback=fallback)
                entry_w.insert(0, val if val else '')
                entry_w.pack(side=tk.LEFT, fill='x', expand=True, padx=(0, 5))
                tip_w = None
                if tip:
                    tip_w = ttk.Label(frm, text=tip, foreground='gray', font=('', 8))
                    tip_w.pack(side=tk.RIGHT, padx=(0, 10))

            self.param_widgets.append((label_w, entry_w, tip_w, sec, opt))

        # 更新提示文字
        hints = {
            'http': 'HTTP — 扫描监听目录文件 → HTTP上传到服务端',
            'usb': 'USB — mass_storage=U盘文件 | serial_port=COM口数据流 | auto=自动检测',
            'com': 'COM — 监听串口数据 (开发中)',
            '数据库': '数据库 — 直连数据库读取 (开发中)',
        }
        self.hint_label.config(text=hints.get(if_type, ''))

        # 更新参数框标题
        type_names = {'http': 'HTTP 参数', 'usb': 'USB 参数', 'com': 'COM 参数', '数据库': '数据库参数'}
        self.param_frame.config(text=type_names.get(if_type, '参数配置'))

    # [2026-07-15] 接口类型切换回调
    def _on_type_change(self):
        self._build_param_fields(self.radio_var.get())

    def save_cfg(self):
        """保存配置：从当前动态面板读取所有字段值，一次性写入 config.ini"""
        if_type = self.radio_var.get()

        # ── 收集所有字段值 ──
        updates = {'interface': {}}
        updates['interface']['type'] = if_type
        for label_w, entry_w, tip_w, sec, opt in self.param_widgets:
            val = entry_w.get().strip()
            updates.setdefault(sec, {})[opt] = val

        # 公共固定配置
        updates['interface']['startrow'] = '1'
        updates['interface']['sampcolflag'] = '样品名称'

        # ── 按类型校验 ──
        if if_type == 'http':
            fp = updates['interface'].get('filepath', '')
            if not os.path.isdir(fp):
                messagebox.showerror('错误', f'监听目录不存在：{fp}')
                return
            freq = updates['interface'].get('frequency', '0')
            if not freq.isdigit() or int(freq) <= 0:
                messagebox.showerror('错误', '监听频率必须是正整数')
                return
        elif if_type == 'usb':
            usb_mode = updates['interface'].get('usb_mode', 'mass_storage')
            if usb_mode == 'serial_port':
                com = updates['interface'].get('com_port', '')
                if not com:
                    messagebox.showerror('错误', 'serial_port 模式必须指定 COM 端口')
                    return
            interval = updates['interface'].get('usb_poll_interval', '5')
            if not interval.isdigit() or int(interval) <= 0:
                messagebox.showerror('错误', '扫描间隔必须是正整数')
                return

        # ── 逐行替换写入（保留注释和格式）──
        try:
            _write_config_file(updates)
        except Exception as e:
            messagebox.showerror('错误', f'写入配置文件失败：{e}\n\n路径：{CFG_FILE}')
            return

        messagebox.showinfo('提示', f'配置已保存 [{if_type}]\n{CFG_FILE}')

    # [2026-07-15] 根据接口类型选择对应的监听循环，支持 http / usb (mass_storage / serial_port)
    def on_start(self):
        if self.monitor_thread and self.monitor_thread.is_alive():
            self.status.set('监听已运行中')
            return

        if_type = self.radio_var.get()
        if if_type == 'http':
            target = self._scan_loop
        elif if_type == 'usb':
            usb_mode = get_config('interface', 'usb_mode', fallback='mass_storage')
            if usb_mode == 'mass_storage':
                target = self._usb_storage_loop
            elif usb_mode == 'serial_port':
                if not SERIAL_AVAILABLE:
                    messagebox.showerror('错误', 'USB-Serial 模式需要安装 pyserial 库')
                    return
                target = self._usb_serial_loop
            elif usb_mode == 'auto':
                if not SERIAL_AVAILABLE:
                    messagebox.showerror('错误', 'USB-Auto 模式需要安装 pyserial 库')
                    return
                target = self._usb_auto_loop
            else:
                messagebox.showwarning('提示', f'未知的 usb_mode: {usb_mode}')
                return
        else:
            messagebox.showwarning('提示', f'接口类型 "{if_type}" 尚未实现')
            return

        self.monitor_flag.clear()
        self.monitor_thread = threading.Thread(target=target, daemon=True)
        self.monitor_thread.start()
        self.status.set(f'监听已启动 [{if_type}]')
        self.start_btn.config(state='disabled')
        self.stop_btn.config(state='normal')
        if if_type == 'http' and CLIENT_API.enabled():
            try:
                CLIENT_API.event('CLIENT_START', result_status='INFO', level='INFO',
                                 message='HTTP目录监听已启动')
            except Exception as exc:
                log.warning('客户端启动事件未送达：%s', exc)

    def on_stop(self):
        was_http = self.radio_var.get() == 'http' and self.monitor_thread is not None
        self.monitor_flag.set()
        if self.monitor_thread:
            self.monitor_thread.join(timeout=1.5)
        self.status.set('监听已停止')
        self.start_btn.config(state='normal')
        self.stop_btn.config(state='disabled')
        if was_http and CLIENT_API.enabled():
            try:
                CLIENT_API.event('CLIENT_STOP', result_status='INFO', level='INFO',
                                 message='HTTP目录监听已停止')
            except Exception as exc:
                log.warning('客户端停止事件未送达：%s', exc)

    def _check_exc(self):
        try:
            txt = self.exc_queue.get_nowait()
        except queue.Empty:
            pass
        else:
            messagebox.showerror('监听线程崩溃', txt)
            self.on_stop()
        self.root.after(500, self._check_exc)

    # ---------------- 后台任务 ----------------
    def _scan_loop(self):
        try:
            watch_dir = get_config('interface', 'filepath')
            interval = int(get_config('interface', 'frequency', fallback='20'))
            service_url = get_config('interface', 'service')
            instno = get_config('interface', 'instno')
            backup = get_config('interface', 'backup', fallback='0')
            # [2026-07-15] 新增 track_mode 配置读取，fallback='0' 保持向后兼容
            track_mode = get_config('interface', 'track_mode', fallback='0')

            if not watch_dir or not os.path.isdir(watch_dir):
                self.exc_queue.put(f'监听目录未配置或不存在："{watch_dir}"\n请在 GUI 中设置监听目录后保存配置。')
                return

            if backup=="1":
                watch_dir_bak=watch_dir+"_bak"
                if not os.path.exists(watch_dir_bak):
                    try:
                        os.makedirs(watch_dir_bak, exist_ok=True)  # 递归创建
                    except OSError as e:
                        messagebox.showerror('错误', f'无法创建目录 {watch_dir_bak}\n{e}')
                        return

            # [2026-07-15] 追踪模式：加载监听目录自身的追踪文件
            processed = load_processed_files(watch_dir) if track_mode == "1" else None

            while not self.monitor_flag.wait(interval):
                try:
                    curr_names = os.listdir(watch_dir)
                except Exception as e:
                    log.warning('读取目录失败：%s', e)
                    continue

                # [2026-08-07] 伴生文件打包配置
                allowed_exts = get_config_list('interface', 'allowed_extensions')
                # [2026-08-13] 白名单自动规则：显式配置优先；未配置时
                # AXIOIMAGERZ2 锁定 .pdf/.txt（伴生打包），其他仪器放行任意扩展名
                if not allowed_exts:
                    allowed_exts = ['.pdf', '.txt'] if instno.upper() == 'AXIOIMAGERZ2' else []
                max_companion = int(get_config('interface', 'max_companion_files', fallback='20'))
                # AXIOIMAGERZ2 需 PDF+TXT 伴生打包，其他仪器不受影响
                batch_companions = (instno.upper() == 'AXIOIMAGERZ2')
                # [2026-08-10] 新增：到达窗口、稳定性检测、匹配模式
                arrival_window = int(get_config('interface', 'companion_arrival_window', fallback='2'))
                stable_wait = int(get_config('interface', 'file_stable_wait', fallback='2'))
                match_mode = get_config('interface', 'companion_match_mode', fallback='auto')
                # [2026-08-10] 重试退避
                retry_backoff = int(get_config('interface', 'upload_retry_backoff', fallback='1'))
                max_retry_interval = int(get_config('interface', 'max_retry_interval', fallback='1800'))

                ts = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                uploaded = 0
                skipped = 0
                failed = 0
                current_files = set()

                # ---- 收集文件 ----
                pdfs = []
                txts = []
                others = []

                for name in curr_names:
                    if name == 'processed_files.json':
                        continue
                    full = os.path.join(watch_dir, name)
                    if not os.path.isfile(full):
                        continue

                    ext = os.path.splitext(name)[1].lower()
                    if allowed_exts and ext not in allowed_exts:
                        continue

                    try:
                        st = os.stat(full)
                    except OSError:
                        continue

                    is_new = True
                    if processed is not None:
                        rec = processed.get(name)
                        if rec and rec.get('mtime') == st.st_mtime_ns and rec.get('size') == st.st_size \
                                and 'uploaded_at' in rec and rec['uploaded_at']:
                            is_new = False

                    info = _FileInfo(name, full, ext, st.st_size, st.st_mtime_ns, is_new)

                    # [2026-08-10] 提取 TXT 组别名（仅伴生模式）
                    if batch_companions and ext == '.txt' and is_new:
                        info.group_name = extract_txt_group_name(full)
                        if info.group_name:
                            log.debug('TXT组别名: %s → [%s]', name, info.group_name)

                    if batch_companions:
                        if ext == '.pdf':
                            pdfs.append(info)
                        elif ext == '.txt':
                            txts.append(info)
                        else:
                            others.append(info)
                    else:
                        others.append(info)

                def mark_done(name, info):
                    current_files.add(name)
                    if track_mode == '1' and processed is not None:
                        processed[name] = {
                            'mtime': info.mtime,
                            'size': info.size,
                            'uploaded_at': ts,
                            'fail_count': 0,
                            'last_fail_time': '',
                            'next_retry_time': ''
                        }

                def mark_failed(name, info):
                    """记录上传失败，写入退避信息"""
                    if track_mode != '1' or processed is None:
                        return
                    rec = processed.get(name, {
                        'mtime': info.mtime,
                        'size': info.size,
                        'uploaded_at': ''
                    })
                    fc = rec.get('fail_count', 0) + 1
                    now_ts = time.time()
                    delay = _calc_retry_backoff(fc, max_retry_interval) if retry_backoff else 0
                    rec['fail_count'] = fc
                    rec['last_fail_time'] = str(now_ts)
                    rec['next_retry_time'] = str(now_ts + delay)
                    rec['mtime'] = info.mtime
                    rec['size'] = info.size
                    processed[name] = rec

                # [2026-08-10] 到达窗口追踪：TXT 首次出现时间
                if batch_companions and arrival_window > 0:
                    now_ts = time.time()
                    # 清理过期 pending（文件已不存在）
                    stale_pending = [n for n in getattr(self, '_pending_txts', {})
                                    if n not in {t.name for t in txts}]
                    for n in stale_pending:
                        self._pending_txts.pop(n, None)
                    # 注册新到达的 TXT
                    if not hasattr(self, '_pending_txts'):
                        self._pending_txts = {}
                    for txt in txts:
                        if txt.is_new and txt.name not in self._pending_txts:
                            self._pending_txts[txt.name] = now_ts
                            log.debug('TXT到达窗口开始: %s', txt.name)

                # ---- 伴生模式：PDF + TXT 打包上传 ----
                if batch_companions:
                    used_txts = set()
                    for pdf in pdfs:
                        if not pdf.is_new:
                            current_files.add(pdf.name)
                            skipped += 1
                            continue

                        # [2026-08-10] 退避检查
                        if retry_backoff and _should_skip_backoff(pdf.name, processed, time.time()):
                            current_files.add(pdf.name)
                            skipped += 1
                            continue

                        # [2026-08-10] 文件稳定性检测
                        if stable_wait > 0:
                            if not is_file_stable(pdf.full, stable_wait):
                                log.info('[%s] PDF文件尚未稳定，推迟: %s', ts, pdf.name)
                                continue

                        batch = [pdf.full]
                        batch_names = [pdf.name]
                        batch_infos = [pdf]

                        # [2026-08-10] 智能匹配：组别名优先 → 文件名前缀 → 迭代顺序兜底
                        txt_added = 0
                        available_txts = [t for t in txts
                                         if t.name not in used_txts and t.is_new]

                        # 第1优先：组别名匹配（需 match_mode != 'none'）
                        if match_mode != 'none':
                            group_matched = [t for t in available_txts
                                            if t.group_name and pdf.name and
                                            t.name not in used_txts]
                            for txt in group_matched:
                                if txt_added >= max_companion:
                                    break
                                batch.append(txt.full)
                                batch_names.append(txt.name)
                                batch_infos.append(txt)
                                used_txts.add(txt.name)
                                txt_added += 1
                                if txt.group_name:
                                    log.debug('组别名匹配: PDF=%s ← TXT=%s [%s]',
                                             pdf.name, txt.name, txt.group_name)

                        # 第2优先：迭代顺序补充（未达上限时）
                        for txt in available_txts:
                            if txt.name in used_txts:
                                continue
                            if txt_added >= max_companion:
                                break
                            # [2026-08-10] 稳定性检测
                            if stable_wait > 0 and not is_file_stable(txt.full, stable_wait):
                                continue
                            batch.append(txt.full)
                            batch_names.append(txt.name)
                            batch_infos.append(txt)
                            used_txts.add(txt.name)
                            txt_added += 1

                        # 超出上限告警
                        total_avail = sum(1 for t in txts if t.name not in used_txts and t.is_new)
                        if total_avail > 0:
                            log.info('[%s] 注意: 目录中有 %d 个TXT超出伴生上限(%d)，本次未打包',
                                     ts, total_avail, max_companion)

                        if len(batch) > 1:
                            log.info('[%s] 打包上传: %s', ts, batch_names)

                        result = upload_multiple_files(batch, instno, service_url)
                        if result.get('result') == 'success':
                            for i, nm in enumerate(batch_names):
                                if i < len(batch_infos):
                                    mark_done(nm, batch_infos[i])
                                current_files.add(nm)
                            uploaded += 1
                            self._hb_record_upload(True)
                            log.info('[%s] 成功: %s', ts, batch_names)
                        else:
                            failed += 1
                            error = result.get('error') or '服务器返回异常'
                            resp_info = ''
                            if result.get('resp'):
                                try:
                                    resp_info = ' | ' + str(result['resp'])[:200]
                                except Exception:
                                    pass
                            log.info('[%s] 失败: %s - %s%s', ts, batch_names, error, resp_info)
                            self._hb_record_upload(False)
                            # [2026-08-10] 记录失败退避
                            if retry_backoff:
                                for i, nm in enumerate(batch_names):
                                    if i < len(batch_infos):
                                        mark_failed(nm, batch_infos[i])

                    # 孤立 TXT（无 PDF 配对）— [2026-08-10] 加入到达窗口
                    orphan_count = 0
                    held_count = 0
                    now_ts = time.time()
                    for txt in txts:
                        if txt.name in used_txts:
                            current_files.add(txt.name)
                            continue
                        if not txt.is_new:
                            current_files.add(txt.name)
                            skipped += 1
                            continue

                        # [2026-08-10] 到达窗口内 → 暂缓上传，等待 PDF 到达
                        if arrival_window > 0 and hasattr(self, '_pending_txts'):
                            first_seen = self._pending_txts.get(txt.name, 0)
                            if first_seen > 0:
                                elapsed_scans = (now_ts - first_seen) / max(interval, 1)
                                if elapsed_scans < arrival_window:
                                    current_files.add(txt.name)
                                    held_count += 1
                                    continue
                                # 窗口过期，移除 pending 记录
                                self._pending_txts.pop(txt.name, None)

                        orphan_count += 1
                        # [2026-08-10] 退避检查
                        if retry_backoff and _should_skip_backoff(txt.name, processed, time.time()):
                            current_files.add(txt.name)
                            skipped += 1
                            continue
                        result = upload_single_file(txt.full, instno, service_url)
                        if result.get('result') == 'success':
                            mark_done(txt.name, txt)
                            uploaded += 1
                            self._hb_record_upload(True)
                        else:
                            failed += 1
                            self._hb_record_upload(False)
                            if retry_backoff:
                                mark_failed(txt.name, txt)
                            if orphan_count <= 3:
                                error = result.get('error') or '服务器返回异常'
                                log.info('[%s] 失败: %s (孤立TXT) - %s', ts, txt.name, error)
                    if orphan_count > 3:
                        log.info('[%s] 孤立TXT: %d 个已处理 (无配对PDF)', ts, orphan_count)
                    if held_count > 0:
                        log.info('[%s] 暂缓TXT: %d 个在到达窗口内等待PDF', ts, held_count)

                # ---- 普通文件（及伴生模式下的其他文件）逐文件上传 ----
                for other in others:
                    if not other.is_new:
                        current_files.add(other.name)
                        skipped += 1
                        continue

                    # [2026-08-10] 退避检查
                    if retry_backoff and _should_skip_backoff(other.name, processed, time.time()):
                        current_files.add(other.name)
                        skipped += 1
                        continue

                    result = upload_single_file(other.full, instno, service_url)
                    if result.get('result') == 'success':
                        mark_done(other.name, other)
                        uploaded += 1
                        self._hb_record_upload(True)
                        log.info('[%s] 成功: %s', ts, other.name)
                    else:
                        failed += 1
                        self._hb_record_upload(False)
                        if retry_backoff:
                            mark_failed(other.name, other)
                        error = result.get('error') or '服务器返回异常'
                        resp_info = ''
                        if result.get('resp'):
                            try:
                                resp_info = ' | ' + str(result['resp'])[:200]
                            except Exception:
                                pass
                        log.info('[%s] 失败: %s - %s%s', ts, other.name, error, resp_info)

                # [2026-07-15] 追踪模式：清理监听目录追踪文件中已不存在文件的记录
                if processed is not None:
                    removed = [n for n in processed if n not in current_files]
                    if removed:
                        for n in removed:
                            processed.pop(n, None)
                        save_processed_files(processed, watch_dir)
                    if uploaded > 0:
                        save_processed_files(processed, watch_dir)

                # [2026-07-27] 监听状态日志
                file_count = len(current_files)
                tracked = len(processed) if processed else 0
                log.info('监听运行中 | 目录 %d 个文件 | 上传 %d 跳过 %d 失败 %d | 已追踪 %d',
                         file_count, uploaded, skipped, failed, tracked)
                # [2026-08-03] 发送心跳到服务端
                self._maybe_heartbeat('http', service_url)
        except Exception as e:
            self.exc_queue.put(traceback.format_exc())

    # [2026-07-16] USB大容量存储监听：每个周期重扫全部已知磁盘，用processed做持久化去重
    def _usb_storage_loop(self):
        try:
            instno = get_config('interface', 'instno')
            service_url = get_config('interface', 'service')
            track_mode = get_config('interface', 'track_mode', fallback='0')
            poll_interval = int(get_config('interface', 'usb_poll_interval', fallback='5'))
            local_copy_dir = get_config('interface', 'usb_local_copy_dir', fallback='')
            drive_filter = get_config('interface', 'usb_drive_letters', fallback='')

            if local_copy_dir and not os.path.isdir(local_copy_dir):
                os.makedirs(local_copy_dir, exist_ok=True)

            # [2026-07-16] 追踪文件存入本地复制目录或运行目录
            usb_track_dir = local_copy_dir if local_copy_dir else '.'
            processed = load_processed_files(usb_track_dir) if track_mode == "1" else None
            known_drives = set(get_removable_drives())

            log.info(f'[USB-Storage] 持续监听已启动，扫描间隔={poll_interval}s')
            log.info(f'[USB-Storage] 初始磁盘: {known_drives}')

            while not self.monitor_flag.wait(poll_interval):
                current_drives = set(get_removable_drives())

                # 过滤指定盘符
                if drive_filter:
                    filter_set = {d.strip().rstrip(':') + ':' for d in drive_filter.split(',')}
                    current_drives = current_drives & filter_set

                # 新盘符 / 移除盘符 日志
                new_drives = current_drives - known_drives
                removed_drives = known_drives - current_drives
                for d in new_drives:
                    log.info(f'[USB-Storage] 新磁盘: {d}')
                for d in removed_drives:
                    log.info(f'[USB-Storage] 磁盘已移除: {d}')

                # ── [2026-07-16] 重扫全部已知磁盘（不只是新盘），持续检测新文件 ──
                current_files = set()  # 本周期所有文件，用于清理已删除记录
                for d in current_drives:
                    try:
                        files = scan_drive_files(d)
                    except Exception as e:
                        log.warning(f'[USB-Storage] 扫描 {d} 失败: {e}')
                        continue

                    for full_path, fname, size in files:
                        # 用盘符下的相对路径做 tracking key，避免同名文件冲突
                        rel_path = os.path.relpath(full_path, d + '\\')
                        tracking_key = rel_path.replace('\\', '/')
                        current_files.add(tracking_key)

                        # 持久化去重：mtime+size 均匹配则跳过
                        if track_mode == "1" and processed is not None:
                            cur_mtime = os.stat(full_path).st_mtime_ns
                            rec = processed.get(tracking_key)
                            if rec and rec.get('mtime') == cur_mtime and rec.get('size') == size:
                                continue

                        if local_copy_dir:
                            dst = os.path.join(local_copy_dir, fname)
                            shutil.copy2(full_path, dst)
                            upload_path = dst
                        else:
                            upload_path = full_path

                        ts = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                        log.info(f'[USB-Storage] [{ts}] 上传: {tracking_key}')
                        result = upload_single_file(upload_path, instno, service_url)

                        if result['result'] == 'success':
                            log.info(f'[USB-Storage] 成功: {tracking_key}')
                            self._hb_record_upload(True)
                            if track_mode == "1":
                                try:
                                    processed[tracking_key] = {
                                        'mtime': os.stat(upload_path).st_mtime_ns,
                                        'size': os.path.getsize(upload_path),
                                        'uploaded_at': ts,
                                        'source': d + '\\' + rel_path
                                    }
                                    save_processed_files(processed, usb_track_dir)
                                except Exception:
                                    pass
                        else:
                            err = result.get('error') or str(result.get('resp', ''))[:120]
                            log.warning(f'[USB-Storage] 失败: {tracking_key} - {err}')
                            self._hb_record_upload(False)

                # ── [2026-07-16] 清理已删除文件记录（与HTTP模式一致）──
                if track_mode == "1" and processed is not None:
                    stale = [k for k in processed if k not in current_files]
                    if stale:
                        for k in stale:
                            processed.pop(k, None)
                        save_processed_files(processed, usb_track_dir)
                        log.info(f'[USB-Storage] 清理已删除记录: {stale}')

                known_drives = current_drives
                # [2026-08-03] 发送心跳到服务端
                self._maybe_heartbeat('usb_storage', service_url)

        except Exception as e:
            self.exc_queue.put(traceback.format_exc())

    # [2026-07-15] 串口读取核心逻辑：打开→读取→存文件/上传，可被多个模式复用
    def _serial_read_port(self, port: str, instno: str, service_url: str,
                          baudrate: int, bytesize: int, stopbits: int, parity: str,
                          timeout: float, stream_format: str, line_terminator: str,
                          data_mode: str, output_dir: str,
                          frame_header: str = '', frame_footer: str = '',
                          frame_length: int = 0):
        """打开指定COM口并持续读取数据，直到端口断开或stop_flag被设置。"""
        try:
            parity_map = {'N': serial.PARITY_NONE, 'E': serial.PARITY_EVEN, 'O': serial.PARITY_ODD}
            stopbits_map = {1: serial.STOPBITS_ONE, 2: serial.STOPBITS_TWO}

            ser = serial.Serial(
                port=port,
                baudrate=baudrate,
                bytesize=bytesize,
                parity=parity_map.get(parity, serial.PARITY_NONE),
                stopbits=stopbits_map.get(stopbits, serial.STOPBITS_ONE),
                timeout=timeout if timeout > 0 else None
            )

            log.info(f'[USB-Serial] {port} 已连接 @ {baudrate},{bytesize},{parity},{stopbits}')

            line_buffer = []
            binary_buffer = b''
            seq = 0

            while not self.monitor_flag.is_set():
                try:
                    if stream_format == 'text_line':
                        raw = ser.readline()
                        if not raw:
                            continue
                        line = raw.decode('utf-8', errors='replace').strip()
                        if line:
                            ts = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                            log.info(f'[USB-Serial] [{ts}] {port}: {line[:100]}')
                            line_buffer.append(line)

                            if len(line_buffer) >= 50:
                                self._flush_serial_buffer(
                                    line_buffer, seq, instno, service_url,
                                    output_dir, data_mode
                                )
                                seq += 1
                                line_buffer = []

                    elif stream_format == 'binary_frame':
                        chunk = ser.read(ser.in_waiting or 1)
                        if chunk:
                            binary_buffer += chunk
                            frames, binary_buffer = split_binary_frames(
                                binary_buffer, frame_header, frame_footer, frame_length
                            )
                            for frame in frames:
                                seq += 1
                                ts = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                                log.info(f'[USB-Serial] [{ts}] {port} 帧#{seq}: {len(frame)} bytes')
                                if data_mode == 'file_first' and output_dir:
                                    fname = f'{instno}_{datetime.now().strftime("%Y%m%d%H%M%S")}_{seq}.bin'
                                    fpath = os.path.join(output_dir, fname)
                                    with open(fpath, 'wb') as bf:
                                        bf.write(frame)
                                    upload_single_file(fpath, instno, service_url)
                                elif data_mode == 'direct':
                                    import tempfile
                                    with tempfile.NamedTemporaryFile(delete=False, suffix='.bin') as tf:
                                        tf.write(frame)
                                        tf_path = tf.name
                                    upload_single_file(tf_path, instno, service_url)
                                    os.unlink(tf_path)

                except serial.SerialException as e:
                    log.error(f'[USB-Serial] {port} 错误: {e}')
                    break
                except Exception as e:
                    log.warning(f'[USB-Serial] {port} 处理异常: {e}')

            # 退出前写出缓冲
            if line_buffer:
                self._flush_serial_buffer(line_buffer, seq, instno, service_url, output_dir, data_mode)

            ser.close()
            log.info(f'[USB-Serial] {port} 已关闭')

        except serial.SerialException as e:
            log.warning(f'[USB-Serial] 无法打开 {port}: {e}')
        except Exception as e:
            log.warning(f'[USB-Serial] {port} 异常: {e}')

    # [2026-07-15] USB串口数据流监听（用户指定COM口）
    def _usb_serial_loop(self):
        """从config.ini读取串口参数，打开指定COM口并持续监听。"""
        try:
            instno = get_config('interface', 'instno')
            service_url = get_config('interface', 'service')
            com_port = get_config('interface', 'com_port', fallback='COM3')
            com_baudrate = int(get_config('interface', 'com_baudrate', fallback='9600'))
            com_bytesize = int(get_config('interface', 'com_bytesize', fallback='8'))
            com_stopbits = int(get_config('interface', 'com_stopbits', fallback='1'))
            com_parity = get_config('interface', 'com_parity', fallback='N')
            com_timeout = float(get_config('interface', 'com_timeout', fallback='0'))
            stream_format = get_config('interface', 'stream_format', fallback='text_line')
            line_terminator = get_config('interface', 'com_line_terminator', fallback='\\r\\n')
            data_mode = get_config('interface', 'data_mode', fallback='file_first')
            output_dir = get_config('interface', 'usb_output_dir', fallback='')
            frame_header = get_config('interface', 'frame_header', fallback='')
            frame_footer = get_config('interface', 'frame_footer', fallback='')
            frame_length = int(get_config('interface', 'frame_length', fallback='0'))
            line_terminator = line_terminator.replace('\\r', '\r').replace('\\n', '\n')

            if output_dir and not os.path.isdir(output_dir):
                os.makedirs(output_dir, exist_ok=True)

            log.info(f'[USB-Serial] 准备连接 {com_port}')
            self._serial_read_port(
                port=com_port, instno=instno, service_url=service_url,
                baudrate=com_baudrate, bytesize=com_bytesize, stopbits=com_stopbits,
                parity=com_parity, timeout=com_timeout, stream_format=stream_format,
                line_terminator=line_terminator, data_mode=data_mode, output_dir=output_dir,
                frame_header=frame_header, frame_footer=frame_footer, frame_length=frame_length
            )

        except serial.SerialException as e:
            self.exc_queue.put(f'无法打开串口 {get_config("interface", "com_port", fallback="COM3")}: {e}')
        except Exception as e:
            self.exc_queue.put(traceback.format_exc())

    # [2026-07-15] USB自动检测模式：同时监听可移动磁盘和COM口
    def _usb_auto_loop(self):
        """自动检测USB设备类型——磁盘插入即扫描上传，COM口插入即连接读取。"""
        try:
            instno = get_config('interface', 'instno')
            service_url = get_config('interface', 'service')
            track_mode = get_config('interface', 'track_mode', fallback='0')
            poll_interval = int(get_config('interface', 'usb_poll_interval', fallback='5'))
            local_copy_dir = get_config('interface', 'usb_local_copy_dir', fallback='')
            drive_filter = get_config('interface', 'usb_drive_letters', fallback='')

            # COM 参数
            com_baudrate = int(get_config('interface', 'com_baudrate', fallback='9600'))
            com_bytesize = int(get_config('interface', 'com_bytesize', fallback='8'))
            com_stopbits = int(get_config('interface', 'com_stopbits', fallback='1'))
            com_parity = get_config('interface', 'com_parity', fallback='N')
            com_timeout = float(get_config('interface', 'com_timeout', fallback='0'))
            stream_format = get_config('interface', 'stream_format', fallback='text_line')
            line_terminator = get_config('interface', 'com_line_terminator', fallback='\\r\\n')
            data_mode = get_config('interface', 'data_mode', fallback='file_first')
            output_dir = get_config('interface', 'usb_output_dir', fallback='')
            frame_header = get_config('interface', 'frame_header', fallback='')
            frame_footer = get_config('interface', 'frame_footer', fallback='')
            frame_length = int(get_config('interface', 'frame_length', fallback='0'))
            line_terminator = line_terminator.replace('\\r', '\r').replace('\\n', '\n')

            if local_copy_dir and not os.path.isdir(local_copy_dir):
                os.makedirs(local_copy_dir, exist_ok=True)
            if output_dir and not os.path.isdir(output_dir):
                os.makedirs(output_dir, exist_ok=True)

            usb_track_dir = local_copy_dir if local_copy_dir else '.'
            processed = load_processed_files(usb_track_dir) if track_mode == "1" else None

            # 初始状态
            known_drives = set(get_removable_drives())
            if drive_filter:
                filter_set = {d.strip().rstrip(':') + ':' for d in drive_filter.split(',')}
                known_drives = known_drives & filter_set

            known_ports = set()
            if SERIAL_AVAILABLE:
                known_ports = {p.device for p in serial.tools.list_ports.comports()}
            active_serial_threads = {}  # port -> thread

            log.info(f'[USB-Auto] 启动，扫描间隔={poll_interval}s')
            log.info(f'[USB-Auto] 初始磁盘: {known_drives}, COM口: {known_ports}')

            while not self.monitor_flag.wait(poll_interval):
                # ── 1. Mass Storage: 重扫全部已知磁盘（持续检测新文件）──
                current_drives = set(get_removable_drives())
                if drive_filter:
                    current_drives = current_drives & filter_set

                new_drives = current_drives - known_drives
                removed_drives = known_drives - current_drives
                for d in new_drives:
                    log.info(f'[USB-Auto] 新磁盘: {d}')
                for d in removed_drives:
                    log.info(f'[USB-Auto] 磁盘已移除: {d}')

                current_files = set()
                for d in current_drives:
                    try:
                        files = scan_drive_files(d)
                    except Exception as e:
                        log.warning(f'[USB-Auto] 扫描 {d} 失败: {e}')
                        continue

                    for full_path, fname, size in files:
                        rel_path = os.path.relpath(full_path, d + '\\')
                        tracking_key = rel_path.replace('\\', '/')
                        current_files.add(tracking_key)

                        # [2026-07-16] 持久化去重：mtime+size 均匹配则跳过
                        if track_mode == "1" and processed is not None:
                            cur_mtime = os.stat(full_path).st_mtime_ns
                            rec = processed.get(tracking_key)
                            if rec and rec.get('mtime') == cur_mtime and rec.get('size') == size:
                                continue

                        if local_copy_dir:
                            dst = os.path.join(local_copy_dir, fname)
                            shutil.copy2(full_path, dst)
                            upload_path = dst
                        else:
                            upload_path = full_path

                        ts = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
                        log.info(f'[USB-Auto] 上传: {tracking_key}')
                        result = upload_single_file(upload_path, instno, service_url)

                        if result['result'] == 'success':
                            log.info(f'[USB-Auto] 成功: {tracking_key}')
                            self._hb_record_upload(True)
                            if track_mode == "1" and processed is not None:
                                try:
                                    processed[tracking_key] = {
                                        'mtime': os.stat(upload_path).st_mtime_ns,
                                        'size': os.path.getsize(upload_path),
                                        'uploaded_at': ts,
                                        'source': d + '\\' + rel_path
                                    }
                                    save_processed_files(processed, usb_track_dir)
                                except Exception:
                                    pass
                        else:
                            err = result.get('error') or str(result.get('resp', ''))[:120]
                            log.warning(f'[USB-Auto] 失败: {tracking_key} - {err}')
                            self._hb_record_upload(False)

                # [2026-07-16] 清理已删除文件记录
                if track_mode == "1" and processed is not None:
                    stale = [k for k in processed if k not in current_files]
                    if stale:
                        for k in stale:
                            processed.pop(k, None)
                        save_processed_files(processed, usb_track_dir)
                        log.info(f'[USB-Auto] 清理已删除记录: {stale}')

                known_drives = current_drives
                # [2026-08-03] 发送心跳到服务端
                self._maybe_heartbeat('usb_auto', service_url)

                # ── 2. Serial: 检测新COM口 → 启动读取线程 ──
                if SERIAL_AVAILABLE:
                    current_ports = {p.device for p in serial.tools.list_ports.comports()}
                    new_ports = current_ports - known_ports
                    removed_ports = known_ports - current_ports

                    for port in new_ports:
                        log.info(f'[USB-Auto] 检测到新COM口: {port}')
                        t = threading.Thread(
                            target=self._serial_read_port,
                            args=(port, instno, service_url, com_baudrate, com_bytesize,
                                  com_stopbits, com_parity, com_timeout, stream_format,
                                  line_terminator, data_mode, output_dir,
                                  frame_header, frame_footer, frame_length),
                            daemon=True
                        )
                        t.start()
                        active_serial_threads[port] = t

                    for port in removed_ports:
                        log.info(f'[USB-Auto] COM口已移除: {port}')
                        active_serial_threads.pop(port, None)

                    known_ports = current_ports

        except Exception as e:
            self.exc_queue.put(traceback.format_exc())

    def _flush_serial_buffer(self, lines: list, seq: int, instno: str,
                             service_url: str, output_dir: str, data_mode: str):
        """将串口文本行缓冲区写出为文件并可选上传"""
        if not lines:
            return
        ts = datetime.now().strftime('%Y%m%d%H%M%S')
        fname = f'{instno}_{ts}_{seq}.csv'
        if output_dir:
            fpath = os.path.join(output_dir, fname)
        else:
            import tempfile
            fpath = os.path.join(tempfile.gettempdir(), fname)

        with open(fpath, 'w', encoding='utf-8-sig') as f:
            f.write('\n'.join(lines))

        log.info(f'[USB-Serial] 保存文件: {fpath} ({len(lines)} 行)')

        if data_mode == 'file_first':
            upload_single_file(fpath, instno, service_url)

# ---------------- 入口 ----------------
if __name__ == '__main__':
    try:
        App().root.mainloop()
    except Exception:
        detail = traceback.format_exc()
        log.critical('程序启动失败：\n%s', detail)
        try:
            import ctypes
            ctypes.windll.user32.MessageBoxW(
                0, detail[-3000:], '仪器接口监听程序 - 启动失败', 0x10)
        except Exception:
            pass
        raise
