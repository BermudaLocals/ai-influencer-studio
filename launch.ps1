# AI Influencer Studio - PowerShell Launcher
# Run this script in PowerShell to start the application

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   AI INFLUENCER STUDIO - LAUNCHER" -ForegroundColor Cyan  
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "[OK] Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Python not found! Please install Python 3.8+ from python.org" -ForegroundColor Red
    Write-Host "Download: https://www.python.org/downloads/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit"
    exit 1
}

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

Write-Host ""
Write-Host "[1/4] Creating virtual environment..." -ForegroundColor Yellow

# Create venv if not exists
if (-not (Test-Path "venv")) {
    python -m venv venv
    Write-Host "      Virtual environment created" -ForegroundColor Green
} else {
    Write-Host "      Virtual environment exists" -ForegroundColor Green
}

Write-Host "[2/4] Activating virtual environment..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1

Write-Host "[3/4] Installing dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt --quiet
Write-Host "      Dependencies installed" -ForegroundColor Green

Write-Host "[4/4] Starting servers..." -ForegroundColor Yellow
Write-Host ""

# Create output directories
New-Item -ItemType Directory -Force -Path "output/meshes" | Out-Null
New-Item -ItemType Directory -Force -Path "output/renders" | Out-Null

Write-Host "============================================" -ForegroundColor Cyan
Write-Host "   SERVERS STARTING..." -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "   AI Influencer Studio: http://localhost:5000" -ForegroundColor Green
Write-Host "   Real or AI Survey:    http://localhost:5050" -ForegroundColor Green
Write-Host ""
Write-Host "   Press Ctrl+C to stop servers" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""

# Start Survey app in background
Start-Process -NoNewWindow -FilePath "python" -ArgumentList "survey/app.py" -RedirectStandardOutput "survey.log" -RedirectStandardError "survey_error.log"

# Start main app (foreground)
python app.py
