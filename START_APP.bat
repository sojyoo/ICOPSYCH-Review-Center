@echo off
echo ========================================
echo ICOPSYCH Review Center - Quick Setup
echo ========================================
echo.

echo Checking if Node.js is installed...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org
    echo Then run this script again.
    pause
    exit /b 1
)

echo Node.js found! Installing dependencies...
cd web-app
npm install

if %errorlevel% neq 0 (
    echo ERROR: Failed to install dependencies!
    echo Please check your internet connection and try again.
    pause
    exit /b 1
)

echo.
echo ========================================
echo Setup Complete! Starting application...
echo ========================================
echo.
echo The application will open at: http://localhost:3000
echo.
echo Demo Accounts:
echo - Admin: admin@reviewcenter.com / password123
echo - Student: student@reviewcenter.com / password123
echo.
echo Press Ctrl+C to stop the server
echo.

npm run dev








