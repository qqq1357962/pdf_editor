@echo off
REM PDF Editor Packaging Script for Windows
REM Double-click to run

cd /d "%~dp0"

echo ================================
echo    PDF Editor Build Script
echo ================================
echo.

REM Check for Rust
where rustc >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: Rust not found.
    echo.
    echo Please install Rust from: https://rustup.rs/
    echo Download and run rustup-init.exe, then restart this script.
    echo.
    pause
    exit /b 1
)

echo Rust found:
rustc --version
echo.

REM Check for npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ERROR: npm not found. Please install Node.js first.
    pause
    exit /b 1
)

REM Install dependencies if needed
if not exist "node_modules" (
    echo Installing dependencies...
    call npm install
)

echo.
echo Building application...
echo This may take several minutes, please wait...
echo.

call npm run tauri:build

if %errorlevel% equ 0 (
    echo.
    echo ================================
    echo    Build Successful!
    echo ================================
    echo.
    echo Output location: src-tauri\target\release\bundle\
    echo.

    REM Open the output folder
    if exist "src-tauri\target\release\bundle\msi" (
        explorer "src-tauri\target\release\bundle\msi"
    ) else if exist "src-tauri\target\release\bundle" (
        explorer "src-tauri\target\release\bundle"
    )
) else (
    echo.
    echo Build failed. Please check the error messages above.
)

pause