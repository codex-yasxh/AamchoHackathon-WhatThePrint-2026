@echo off
setlocal
cd /d "%~dp0"
if not exist logs mkdir logs

echo [%date% %time%] Starting print-agent from startup...>> logs\startup.log
npm run start >> logs\startup.log 2>&1
