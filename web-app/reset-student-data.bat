@echo off
echo Resetting student test data...
echo.
cd /d "%~dp0"
npx tsx scripts/reset-student-data.ts
echo.
pause







