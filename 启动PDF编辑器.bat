@echo off
REM PDF Editor Startup Script for Windows
REM Double-click to run

cd /d "%~dp0"

echo Starting PDF Editor...

REM Check if npm is available
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: npm not found. Please install Node.js first.
    echo Download from: https://nodejs.org/
    pause
    exit /b 1
)

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

REM Start the dev server
echo Launching development server...
start "" npm run dev

REM Wait for server to start
timeout /t 3 /nobreak >nul

REM Open browser
echo Opening browser...
start "" http://localhost:5173

echo.
echo PDF Editor is running. Close this window to stop.
pause