@echo off
echo ========================================
echo 사회복무요원 근무표 생성기 실행 중...
echo ========================================
echo.

echo 서버를 시작합니다...
echo 브라우저가 자동으로 열립니다.
echo.
echo 종료하려면 이 창에서 Ctrl+C를 누르세요.
echo ========================================
echo.

REM 백그라운드에서 EXE 실행
start /B dist\WorkScheduleGenerator.exe

REM 3초 대기 후 브라우저 열기
timeout /t 3 /nobreak >nul
start http://127.0.0.1:5000

REM 서버 실행 대기
echo 서버가 실행 중입니다.
echo 브라우저에서 http://127.0.0.1:5000 을 확인하세요.
echo.
pause
