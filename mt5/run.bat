@echo off
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Opening...
    powershell -Command "Start-Process '%~f0' -Verb runAs"
    exit /b
)

echo Hello admin.

cd /d "%~dp0"

taskkill /F /IM python.exe
taskkill /F /IM node.exe

echo Deleted blacker services

echo Starting PM2

call pm2 delete all

call pm2 start main.py --interpreter=python --name blacker --restart-delay 3000

echo Press any key to continue...
pause >nul

pm2 monit
