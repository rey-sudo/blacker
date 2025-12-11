@echo off
echo Starting PM2

cd /d "%~dp0"

call pm2 delete all

call pm2 start test.py --interpreter=python --name blacker --restart-delay 3000

pm2 monit

echo Done.
pause
