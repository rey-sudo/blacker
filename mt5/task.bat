@echo off
echo Starting PM2

cd /d "%~dp0"

call pm2 delete all

call pm2 start main.py --interpreter=python --name blacker --restart-delay 3000

echo Done.
