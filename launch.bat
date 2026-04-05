@echo off
title AI Influencer Studio Launcher
color 0B

echo.
echo ============================================
echo    AI INFLUENCER STUDIO - LAUNCHER
echo ============================================
echo.

REM Check Python
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found!
    echo Please install Python 3.8+ from https://python.org
    echo Make sure to check "Add Python to PATH" during installation
    pause
    exit /b 1
)

echo [OK] Python found
echo.

REM Create venv if not exists
if not exist "venv" (
    echo [1/4] Creating virtual environment...
    python -m venv venv
) else (
    echo [1/4] Virtual environment exists
)

echo [2/4] Activating virtual environment...
call venv\Scripts\activate.bat

echo [3/4] Installing dependencies...
pip install -r requirements.txt --quiet

echo [4/4] Creating output directories...
if not exist "output\meshes" mkdir output\meshes
if not exist "output\renders" mkdir output\renders

echo.
echo ============================================
echo    STARTING SERVERS...
echo ============================================
echo.
echo    AI Influencer Studio: http://localhost:5000
echo    Real or AI Survey:    http://localhost:5050
echo.
echo    Opening browser in 5 seconds...
echo    Press Ctrl+C to stop servers
echo ============================================
echo.

REM Start Survey app in new window
start "Survey App" cmd /c "venv\Scripts\activate.bat && cd survey && python app.py"

REM Wait and open browser
timeout /t 5 /nobreak >nul
start http://localhost:5000

REM Start main app
python app.py
