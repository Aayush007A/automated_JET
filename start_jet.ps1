# Deloitte Automated JET Platform - PowerShell Launcher
$ErrorActionPreference = "Stop"

Write-Host "==============================================================================" -ForegroundColor Green
Write-Host "           DELOITTE AUTOMATED JOURNAL ENTRY TESTING (JET) PLATFORM            " -ForegroundColor White
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host "  [1] AI Neural LLM Microservice : http://127.0.0.1:5005" -ForegroundColor Cyan
Write-Host "  [2] Enterprise Backend API     : http://localhost:5000" -ForegroundColor Green
Write-Host "  [3] Executive Web App          : http://localhost:5173" -ForegroundColor Magenta
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host ""

Set-Location $PSScriptRoot
node run_all.js
