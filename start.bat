@echo off
chcp 65001 > nul
echo.
echo ========================================
echo   e-Stat API Client - Starting...
echo ========================================
echo.

cd /d "%~dp0"

REM Check Python
python --version > nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found. Please install Python 3.8+
    pause
    exit /b 1
)

REM Check .env file
if not exist ".env" (
    echo [WARNING] .env file not found.
    echo           Copy .env.example to .env and set your API key.
    echo.
)

REM Install dependencies if needed
if not exist "venv" (
    echo [INFO] Creating virtual environment...
    python -m venv venv
    call venv\Scripts\activate
    echo [INFO] Installing dependencies...
    pip install -r requirements.txt
) else (
    call venv\Scripts\activate
)

echo.
echo [INFO] Starting servers...
echo.

REM Start backend server
start "e-Stat API Server" cmd /k "cd backend && python app.py"

REM Wait for backend to start
timeout /t 3 /nobreak > nul

REM Start frontend server
start "e-Stat Frontend" cmd /k "cd frontend && python -m http.server 8888"

echo.
echo ========================================
echo   Servers Started!
echo ========================================
echo.
echo   Frontend: http://localhost:8888
echo   API:      http://localhost:5099
echo.
echo   Press any key to open browser...
pause > nul

start http://localhost:8888
