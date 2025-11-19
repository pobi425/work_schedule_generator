# -*- mode: python ; coding: utf-8 -*-
from PyInstaller.utils.hooks import collect_all

block_cipher = None

# OR-Tools 전체 수집
datas_ortools, binaries_ortools, hiddenimports_ortools = collect_all('ortools')

a = Analysis(
    ['app.py'],
    pathex=[],
    binaries=binaries_ortools,
    datas=[
        ('templates', 'templates'),
        ('static', 'static'),
    ] + datas_ortools,
    hiddenimports=[
        'flask',
        'werkzeug',
        'ortools',
        'ortools.sat',
        'ortools.sat.python',
        'ortools.sat.python.cp_model',
    ] + hiddenimports_ortools,
    hookspath=[],
    hooksconfig={},
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(
    pyz,
    a.scripts,
    [],
    exclude_binaries=True,
    name='WorkScheduleGenerator',
    debug=False,
    bootloader_ignore_signals=False,
    strip=False,
    upx=True,
    console=True,
    disable_windowed_traceback=False,
    argv_emulation=False,
    target_arch=None,
    codesign_identity=None,
    entitlements_file=None,
    icon=None,
)

coll = COLLECT(
    exe,
    a.binaries,
    a.zipfiles,
    a.datas,
    strip=False,
    upx=True,
    upx_exclude=[],
    name='WorkScheduleGenerator',
)
