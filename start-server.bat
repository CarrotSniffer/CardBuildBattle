@echo off
title Card Game Server
cd /d "%~dp0"

echo ========================================
echo    Strategic Card Game Server
echo ========================================
echo.

:: Check if Node.js is available
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

:: Always run npm install to ensure dependencies are up to date
echo Checking dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo.
    echo ERROR: npm install failed!
    echo Check the error messages above.
    pause
    exit /b 1
)
echo.

:: Get local IP
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set LOCAL_IP=%%a
    goto :found
)
:found
set LOCAL_IP=%LOCAL_IP:~1%

echo Local URL:    http://localhost:3000
echo Network URL:  http://%LOCAL_IP%:3000
echo.
echo Share your public IP with friends for internet play.
echo Press Ctrl+C to stop the server.
echo ========================================
echo.

:: Run the server and capture any errors
node src/server/index.js
if %ERRORLEVEL% neq 0 (
    echo.
    echo ========================================
    echo SERVER CRASHED! Error code: %ERRORLEVEL%
    echo ========================================
)

echo.
echo Server has stopped.
pause
