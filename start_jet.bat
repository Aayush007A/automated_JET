@echo off
setlocal enabledelayedexpansion

title Deloitte Automated JET Platform Launcher

echo ==============================================================================
echo            DELOITTE AUTOMATED JOURNAL ENTRY TESTING (JET) PLATFORM
echo ==============================================================================
echo  Launching all system services:
echo    [1] AI Neural LLM Microservice  (Port 5005)
echo    [2] Automation Backend API      (Port 5000)
echo    [3] Executive Web App           (Port 5173)
echo ==============================================================================
echo.

cd /d "%~dp0"

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in PATH! Please install Node.js.
    pause
    exit /b 1
)

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH! Please install Python.
    pause
    exit /b 1
)

node run_all.js

pause
