@echo off
chcp 65001 >nul
title Work Schedule Generator - Build EXE
echo.
echo ========================================
echo Work Schedule Generator - Build EXE
echo ========================================
echo.

echo [1/5] Creating virtual environment...
if not exist venv (
    python -m venv venv
    echo Virtual environment created!
) else (
    echo Virtual environment already exists.
)
echo.

echo [2/5] Activating virtual environment...
call venv\Scripts\activate.bat
echo.

echo [3/5] Installing required packages...
pip install --upgrade pip
pip install Flask>=3.0.0 ortools>=9.10.0 Werkzeug>=3.0.0 pyinstaller
echo.

echo [4/5] Building EXE file... (This may take several minutes)
pyinstaller --collect-all ortools build_exe.spec --clean
echo.

echo [5/5] Build complete!
echo.
echo ========================================
echo EXE Location: dist\WorkScheduleGenerator.exe
echo ========================================
echo.
echo To run the app, double-click dist\WorkScheduleGenerator.exe
echo or run run_app.bat
echo.
pause
