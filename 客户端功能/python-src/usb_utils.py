# -*- coding: utf-8 -*-
# [2026-07-15] 新建：USB 设备通信工具模块
# 提供 U盘检测、串口数据解析、二进制帧分割等工具函数

import os
import csv
import io
import ctypes
import logging
from typing import Callable

log = logging.getLogger('monitor')

# ── Windows 常量 ──
DRIVE_REMOVABLE = 2      # GetDriveTypeW 返回值: 可移动磁盘
DRIVE_FIXED = 3           # 固定磁盘
DRIVE_CDROM = 5           # 光驱


def get_removable_drives() -> list:
    """
    [2026-07-15] 获取 Windows 系统所有可移动磁盘盘符。
    返回: ['D:', 'E:', ...]
    """
    drives = []
    # ctypes.windll.kernel32.GetLogicalDrives() 返回位掩码
    bitmask = ctypes.windll.kernel32.GetLogicalDrives()
    for i in range(26):  # A-Z
        if bitmask & (1 << i):
            letter = chr(ord('A') + i) + ':\\'
            drive_type = ctypes.windll.kernel32.GetDriveTypeW(letter)
            if drive_type == DRIVE_REMOVABLE:
                drives.append(letter.rstrip('\\'))
    return drives


def get_all_fixed_drives() -> list:
    """
    获取所有固定磁盘盘符（C:, D: 等）。
    """
    drives = []
    bitmask = ctypes.windll.kernel32.GetLogicalDrives()
    for i in range(26):
        if bitmask & (1 << i):
            letter = chr(ord('A') + i) + ':\\'
            drive_type = ctypes.windll.kernel32.GetDriveTypeW(letter)
            if drive_type == DRIVE_FIXED:
                drives.append(letter.rstrip('\\'))
    return drives


def watch_new_drives(callback: Callable[[str], None],
                     poll_interval: float = 2.0,
                     stop_flag=None):
    """
    [2026-07-15] 轮询检测新挂载的可移动磁盘。
    发现新盘符时调用 callback(drive_letter)。
    stop_flag: threading.Event，设置时退出循环。
    """
    known = set(get_removable_drives())
    while True:
        if stop_flag and stop_flag.is_set():
            break
        current = set(get_removable_drives())
        new_drives = current - known
        removed = known - current

        for d in new_drives:
            log.info(f'[USB] 检测到新磁盘: {d}')
            callback(d)

        if removed:
            log.info(f'[USB] 磁盘已移除: {removed}')

        known = current
        stop_flag.wait(poll_interval) if stop_flag else None


def scan_drive_files(drive_letter: str, extensions: list = None) -> list:
    """
    递归扫描指定盘符下所有文件。
    extensions: 文件扩展名过滤，如 ['.csv', '.txt', '.xlsx']，None=不限制。
    返回: [(完整路径, 文件名, 文件大小), ...]
    """
    results = []
    root = drive_letter + '\\'
    try:
        for dirpath, _, filenames in os.walk(root):
            for fname in filenames:
                if extensions:
                    ext = os.path.splitext(fname)[1].lower()
                    if ext not in extensions:
                        continue
                full = os.path.join(dirpath, fname)
                try:
                    size = os.path.getsize(full)
                except OSError:
                    size = 0
                results.append((full, fname, size))
    except Exception as e:
        log.warning(f'[USB] 扫描磁盘 {drive_letter} 失败: {e}')
    return results


# ── 串口数据解析 ──

def parse_serial_line(line: bytes, encoding: str = 'utf-8') -> dict:
    """
    [2026-07-15] 解析串口文本行，返回列名→值的映射。
    先尝 UTF-8，失败则 GBK。
    """
    try:
        text = line.decode(encoding)
    except UnicodeDecodeError:
        try:
            text = line.decode('gbk')
        except Exception:
            return {'_raw': line.hex()}

    text = text.strip()
    if not text:
        return {}

    # 自动检测分隔符
    delimiter = '\t' if text.count('\t') > text.count(',') else ','
    parts = [p.strip() for p in text.split(delimiter)]
    return {f'col_{i}': v for i, v in enumerate(parts)}


def parse_serial_csv_header(line: bytes, encoding: str = 'utf-8') -> list:
    """
    [2026-07-15] 解析串口文本行的CSV表头，返回列名列表。
    """
    try:
        text = line.decode(encoding)
    except UnicodeDecodeError:
        try:
            text = line.decode('gbk')
        except Exception:
            return []
    text = text.strip()
    if not text:
        return []
    delimiter = '\t' if text.count('\t') > text.count(',') else ','
    reader = csv.reader(io.StringIO(text), delimiter=delimiter)
    try:
        return [h.strip() for h in next(reader)]
    except StopIteration:
        return []


# ── 二进制帧解析 ──

def split_binary_frames(buffer: bytes,
                        frame_header: str = '',
                        frame_footer: str = '',
                        frame_length: int = 0) -> tuple:
    """
    [2026-07-15] 从二进制缓冲区中分割帧。
    返回: (frames: list[bytes], remaining_buffer: bytes)

    三种分割模式：
    1. frame_length > 0: 按固定长度分割
    2. frame_header + frame_footer: 按帧头帧尾分割
    3. frame_header only: 按帧头分割（下一帧头=上一帧尾）
    """
    if frame_length > 0:
        frames = []
        while len(buffer) >= frame_length:
            frames.append(buffer[:frame_length])
            buffer = buffer[frame_length:]
        return frames, buffer

    header_bytes = bytes.fromhex(frame_header) if frame_header else b''
    footer_bytes = bytes.fromhex(frame_footer) if frame_footer else b''

    if header_bytes and footer_bytes:
        frames = []
        while True:
            start = buffer.find(header_bytes)
            if start == -1:
                break
            end = buffer.find(footer_bytes, start + len(header_bytes))
            if end == -1:
                break
            end += len(footer_bytes)
            frames.append(buffer[start:end])
            buffer = buffer[end:]
        return frames, buffer

    if header_bytes:
        frames = []
        while True:
            start = buffer.find(header_bytes)
            if start == -1:
                break
            next_start = buffer.find(header_bytes, start + len(header_bytes))
            if next_start == -1:
                break
            frames.append(buffer[start:next_start])
            buffer = buffer[next_start:]
        return frames, buffer

    return [], buffer
