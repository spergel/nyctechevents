@echo off
REM Navigate to project root directory
cd /d "%~dp0\.."

REM Set NODE_ENV to production
set NODE_ENV=production

REM Create logs directory if it doesn't exist
if not exist logs mkdir logs

REM Log start time
echo Running data update at %date% %time% >> logs\update.log

REM Run the update script
node scripts\update-data.js >> logs\update.log 2>&1

REM Add a success message with timestamp
echo Update completed at %date% %time% >> logs\update.log

exit /b %ERRORLEVEL% 