@echo off
chcp 65001 >nul

REM Check Python installation
python --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python is not installed!
    echo.
    echo Please install Python from: https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation!
    echo.
    pause
    exit /b
)

REM Create virtual environment if not exists
if not exist venv (
    echo Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
call venv\Scripts\activate.bat

REM Install packages if needed
pip show Flask >nul 2>&1
if errorlevel 1 (
    echo Installing required packages...
    pip install Flask ortools Werkzeug
)

REM Start server
echo.
echo ========================================
echo Server: http://127.0.0.1:5000
echo ========================================
echo.
echo Opening browser in 3 seconds...
echo Press Ctrl+C to stop the server.
echo.

REM Open browser after 3 seconds
start /B timeout /t 3 /nobreak >nul && start http://127.0.0.1:5000

REM Run Flask app
python app.py
