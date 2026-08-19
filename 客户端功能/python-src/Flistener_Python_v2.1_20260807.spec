# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_data_files

datas = [('usb_utils.py', '.')]
datas += collect_data_files('pystray')


a = Analysis(
    ['Listenmain.py'],
    pathex=[],
    binaries=[],
    datas=datas,
    hiddenimports=['pystray', 'PIL', 'PIL.Image', 'PIL.ImageDraw', 'serial', 'queue'],
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    noarchive=False,
    optimize=0,
)
pyz = PYZ(a.pure)

exe = EXE(
    pyz,
    a.scripts,
    a.binaries,
    a.datas,
    [],
    name='Flistener_Python_v2.1_20260807',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    upx_exclude=[],
    runtime_tmpdir=None,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=['zy.ico'],
)
