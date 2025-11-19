@echo off
chcp 65001 >nul
title Python Version Check

echo ================================================
echo Python Installation Diagnostics
echo ================================================
echo.

echo Checking Python version...
python --version
echo.

echo Checking Python architecture (32bit or 64bit)...
python -c "import struct; print(struct.calcsize('P') * 8, 'bit Python')"
echo.

echo Checking pip version...
python -m pip --version
echo.

echo ================================================
echo IMPORTANT:
echo OR-Tools requires 64-bit Python 3.8 or higher
echo.
echo If you see "32 bit Python" above, you need to:
echo 1. Uninstall current Python
echo 2. Download 64-bit Python from python.org
echo 3. Install with "Add Python to PATH" checked
echo ================================================
echo.

pause
