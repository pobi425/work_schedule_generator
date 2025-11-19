@echo off
chcp 65001 >nul
title 사회복무요원 근무표 생성기

echo.
echo ╔════════════════════════════════════════╗
echo ║   사회복무요원 근무표 자동 생성기      ║
echo ╚════════════════════════════════════════╝
echo.

REM Python 설치 확인
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python이 설치되어 있지 않습니다!
    echo.
    echo 1. https://www.python.org/downloads/ 에서 Python 다운로드
    echo 2. 설치 시 "Add Python to PATH" 체크 필수!
    echo.
    pause
    exit /b
)

echo ✅ Python 설치 확인 완료
echo.

REM 가상환경이 없으면 생성
if not exist venv (
    echo 🔧 가상환경 생성 중...
    python -m venv venv
)

REM 가상환경 활성화
call venv\Scripts\activate.bat

REM 패키지 설치 확인
pip show Flask >nul 2>&1
if errorlevel 1 (
    echo 📦 필수 패키지 설치 중...
    pip install Flask ortools Werkzeug
    echo.
)

echo 🚀 서버 시작 중...
echo.
echo ═══════════════════════════════════════
echo   서버 주소: http://127.0.0.1:5000
echo ═══════════════════════════════════════
echo.
echo 💡 브라우저에서 위 주소로 접속하세요!
echo 🛑 종료하려면 Ctrl+C 를 누르세요.
echo.

REM 3초 후 브라우저 자동 실행
start /B timeout /t 3 /nobreak >nul && start http://127.0.0.1:5000

REM Flask 앱 실행
python app.py
