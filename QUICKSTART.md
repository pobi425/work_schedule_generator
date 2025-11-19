# 🚀 Quick Start Guide

## ⚡ Fastest Way to Run (Windows)

### Option 1: Python Installed ✅

**Just double-click:**
```
START.bat
```

That's it! The browser will open automatically at http://127.0.0.1:5000

---

### Option 2: Create EXE File (One Time)

**Step 1:** Double-click `build_exe.bat`
- Wait 5-10 minutes (building...)

**Step 2:** Run the EXE
```
dist\WorkScheduleGenerator.exe
```

**Step 3:** Open browser
```
http://127.0.0.1:5000
```

---

## 📋 Requirements

- **Python 3.11+** (Download: https://www.python.org/downloads/)
- **Windows 10/11** (Linux/Mac: use `python app.py` directly)

---

## 🎯 How to Use

1. **Worker Management** (Top button)
   - Add workers (names separated by commas)
   - Set work days per person (default: 20)

2. **Calendar** (Center)
   - Click on any date to manually assign workers
   - Click year/month title to change month

3. **Auto Assignment** (Bottom button)
   - Automatically generates optimal schedule
   - Uses OR-Tools CP-SAT solver

4. **Detailed Inquiry** (Bottom button)
   - View statistics
   - Set worker separation rules

---

## ⚠️ Troubleshooting

### Python not found
```
Download from: https://www.python.org/downloads/
IMPORTANT: Check "Add Python to PATH" during installation!
```

### Port 5000 already in use
```cmd
netstat -ano | findstr :5000
taskkill /PID [process_id] /F
```

### Module not found
```cmd
pip install Flask ortools Werkzeug
```

---

## 📁 Files

- `START.bat` - **Run this!** (Easiest way)
- `SIMPLE_START.bat` - Alternative simple launcher
- `build_exe.bat` - Build EXE file
- `run_app.bat` - Run existing EXE
- `app.py` - Flask application
- `EXE_GUIDE.md` - Detailed EXE guide (Korean)

---

## 🌐 Tech Stack

- **Backend:** Flask 3.0+ (Python web framework)
- **Solver:** OR-Tools 9.10+ (Google optimization library)
- **Frontend:** Tailwind CSS 4.0 + Vanilla JavaScript
- **Icons:** Material Symbols

---

## 📖 Full Documentation

See `README.md` and `EXE_GUIDE.md` for detailed information.

---

## 🎉 Enjoy!

Visit: http://127.0.0.1:5000

For issues: https://github.com/pobi425/work_schedule_generator/issues
