@echo off
setlocal enabledelayedexpansion
title AssetFlow Agent - Launcher

echo.
echo ============================================================
echo   AssetFlow Agent - Manufacturing AI Assistant
echo ============================================================
echo.

REM ── Check Ollama ────────────────────────────────
echo [1/4] Checking Ollama...
curl -s http://localhost:11434/api/tags >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Ollama is not running at http://localhost:11434
    echo         Start Ollama first, then re-run this script.
    echo         Ensure 'qwen2.5:7b-instruct' is pulled.
    pause
    exit /b 1
)
echo       Ollama is running. OK

REM ── Check/Create venv ───────────────────────────
echo [2/4] Checking Python environment...
if not exist "venv\Scripts\python.exe" (
    echo       Creating virtual environment...
    python -m venv venv
    call venv\Scripts\activate.bat
    pip install -q fastapi uvicorn requests pydantic
) else (
    call venv\Scripts\activate.bat
)
echo       Python environment ready. OK

REM ── Seed DB if needed ───────────────────────────
echo [3/4] Checking database...
if not exist "db\assetflow.db" (
    echo       Seeding database...
    python db\seed.py
) else (
    echo       Database exists. OK
)

REM ── Start services ──────────────────────────────
echo [4/4] Starting services...
echo.

REM Start backend
echo Starting FastAPI backend on http://localhost:8000 ...
start "AssetFlow-Backend" cmd /c "call venv\Scripts\activate.bat && python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000"

REM Wait for backend
timeout /t 3 /nobreak >nul

REM Start frontend
echo Starting Vite frontend on http://localhost:5173 ...
start "AssetFlow-Frontend" cmd /c "cd frontend && npm run dev"

echo.
echo ============================================================
echo   AssetFlow Agent is starting!
echo.
echo   Frontend:  http://localhost:5173
echo   Backend:   http://localhost:8000
echo   API Docs:  http://localhost:8000/docs
echo.
echo   Press any key to stop all services...
echo ============================================================
pause >nul

REM Cleanup
taskkill /FI "WINDOWTITLE eq AssetFlow-Backend" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq AssetFlow-Frontend" /F >nul 2>&1
echo Services stopped.
