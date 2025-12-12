@echo off
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo Opening...
    powershell -Command "Start-Process '%~f0' -Verb runAs"
    exit /b
)


taskkill /F /IM python.exe
taskkill /F /IM node.exe
