@echo off
chcp 65001 >nul
title Work Schedule Generator
echo.
echo ========================================
echo Work Schedule Generator
echo ========================================
echo.

echo Starting server...
echo Browser will open automatically.
echo.
echo To stop the server, press Ctrl+C in this window.
echo ========================================
echo.

REM Start EXE in background
start /B dist\WorkScheduleGenerator.exe

REM Wait 3 seconds then open browser
timeout /t 3 /nobreak >nul
start http://127.0.0.1:5000

REM Keep window open
echo Server is running.
echo Check your browser at http://127.0.0.1:5000
echo.
pause
