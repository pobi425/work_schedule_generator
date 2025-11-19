# 🚀 EXE 파일 빌드 및 사용 가이드

## 📋 목차
1. [간단 실행 (Python 필요)](#방법-1-간단-실행-python-필요)
2. [EXE 파일 생성 (Python 필요, 한 번만)](#방법-2-exe-파일-생성)
3. [EXE 파일 실행 (Python 불필요)](#방법-3-exe-파일-실행)

---

## 방법 1: 간단 실행 (Python 필요) ⚡

가장 빠르고 간단한 방법!

### 1단계: `START.bat` 더블클릭

```
START.bat 파일을 더블클릭하면 끝!
```

**자동으로 수행:**
- ✅ Python 설치 확인
- ✅ 가상환경 생성
- ✅ 필수 패키지 설치
- ✅ Flask 서버 실행
- ✅ 브라우저 자동 실행 (http://127.0.0.1:5000)

---

## 방법 2: EXE 파일 생성 🔨

**Python이 필요하지만, EXE를 한 번 만들면 다른 PC에서는 Python 없이 실행 가능!**

### 1단계: Python 설치 확인

Python 3.11 이상이 설치되어 있어야 합니다.

**확인:**
```cmd
python --version
```

**설치되지 않았다면:**
1. https://www.python.org/downloads/ 접속
2. Python 3.14 다운로드
3. 설치 시 **"Add Python to PATH"** 반드시 체크! ✅

### 2단계: `build_exe.bat` 실행

```
build_exe.bat 파일을 더블클릭
```

**진행 과정:**
1. 가상환경 생성
2. 필수 패키지 설치 (Flask, OR-Tools, PyInstaller)
3. EXE 파일 빌드 (5~10분 소요)

**완료 후:**
```
dist\WorkScheduleGenerator.exe 파일이 생성됨
```

### 3단계: EXE 파일 배포 (선택사항)

`dist` 폴더 전체를 압축하여 다른 PC에 복사하면, Python 없이 실행 가능!

---

## 방법 3: EXE 파일 실행 🎯

**Python 설치 불필요!**

### 방법 A: 직접 실행

```
dist\WorkScheduleGenerator.exe 더블클릭
```

**그 다음:**
1. 검은 창(콘솔)이 열림
2. "Running on http://127.0.0.1:5000" 메시지 확인
3. 브라우저에서 `http://127.0.0.1:5000` 접속

### 방법 B: 배치 파일로 실행 (자동 브라우저 실행)

```
run_app.bat 더블클릭
```

**자동으로:**
- ✅ EXE 실행
- ✅ 브라우저 자동 실행

---

## 🛑 종료 방법

### Python 실행 시 (START.bat)
콘솔 창에서 `Ctrl + C` 누르기

### EXE 실행 시
콘솔 창 닫기 또는 `Ctrl + C`

---

## ⚠️ 문제 해결

### 1. "Python이 설치되어 있지 않습니다"
- Python 설치 필요
- https://www.python.org/downloads/
- **"Add Python to PATH" 체크 필수!**

### 2. "모듈을 찾을 수 없습니다"
```cmd
pip install Flask ortools Werkzeug
```

### 3. "포트 5000이 이미 사용 중입니다"
다른 프로그램이 5000번 포트를 사용 중입니다.
```cmd
netstat -ano | findstr :5000
taskkill /PID [프로세스ID] /F
```

### 4. EXE 빌드 실패
- Python 3.11 이상인지 확인
- `build_exe.bat` 다시 실행
- 안티바이러스 프로그램 일시 중지

### 5. Windows Defender 경고
- PyInstaller로 만든 EXE는 서명되지 않아 경고 발생 가능
- "추가 정보" → "실행" 클릭

---

## 📁 파일 구조

```
work_schedule_generator/
├── START.bat              ← 가장 간단! 이것만 실행
├── build_exe.bat          ← EXE 빌드용
├── run_app.bat            ← EXE 실행용
├── app.py                 ← Flask 앱
├── templates/             ← HTML 템플릿
├── static/                ← CSS, JS
└── dist/                  ← 빌드 후 생성
    └── WorkScheduleGenerator.exe  ← 완성된 EXE
```

---

## 💡 추천 사용법

### 개발자/관리자
```
START.bat 사용 (빠르고 간편)
```

### 일반 사용자 (Python 없는 PC)
```
1. EXE 빌드 (한 번만)
2. dist 폴더 공유
3. WorkScheduleGenerator.exe 실행
```

---

## 🎉 축하합니다!

이제 사회복무요원 근무표 생성기를 사용할 준비가 되었습니다!

**사용 방법:**
1. 상단 "근무자관리" 버튼 → 근무자 등록
2. 달력에서 날짜 클릭 → 수동 근무 지정 (선택)
3. 하단 "자동배치" 버튼 → OR-Tools가 최적 근무표 생성!

**문의:** GitHub Issues 또는 README.md 참고
