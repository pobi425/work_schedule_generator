@echo off
echo ========================================
echo 근무표 생성기 EXE 빌드 스크립트
echo ========================================
echo.

echo [1/5] 가상환경 생성 중...
if not exist venv (
    python -m venv venv
    echo 가상환경 생성 완료!
) else (
    echo 가상환경이 이미 존재합니다.
)
echo.

echo [2/5] 가상환경 활성화 중...
call venv\Scripts\activate.bat
echo.

echo [3/5] 필수 패키지 설치 중...
pip install --upgrade pip
pip install Flask>=3.0.0 ortools>=9.10.0 Werkzeug>=3.0.0 pyinstaller
echo.

echo [4/5] EXE 파일 빌드 중... (몇 분 소요될 수 있습니다)
pyinstaller build_exe.spec --clean
echo.

echo [5/5] 빌드 완료!
echo.
echo ========================================
echo EXE 파일 위치: dist\WorkScheduleGenerator.exe
echo ========================================
echo.
echo 실행하려면 dist\WorkScheduleGenerator.exe 를 더블클릭하거나
echo run_app.bat 를 실행하세요.
echo.
pause
