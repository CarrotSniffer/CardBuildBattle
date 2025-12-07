@echo off
setlocal EnableDelayedExpansion
title Card Game Server
cd /d "%~dp0"

:menu
:: Clear variables from previous runs
set "NODE_OPTS="
set "MODE_NAME="
set "USE_NODEMON="
set "USE_CLUSTER="
set "CLUSTER_WORKERS="
set "WORKERS="
set "choice="

cls
echo ========================================
echo    Strategic Card Game Server
echo ========================================
echo.
echo  Single Process Modes:
echo  [1] Normal        - Default settings
echo  [2] Optimized     - 4GB RAM, faster GC
echo  [3] Maximum       - 8GB RAM, best performance
echo.
echo  Multi-Core Modes (for thousands of games):
echo  [4] Cluster Half  - Half CPU cores, 4GB each
echo  [5] Cluster Full  - All CPU cores, 4GB each
echo.
echo  Development:
echo  [6] Dev Mode      - Auto-restart on changes
echo  [7] Custom        - Enter custom settings
echo.
echo  [Q] Quit
echo.
echo ========================================
set /p "choice=Enter choice (1-7 or Q): "

if "!choice!"=="1" goto normal
if "!choice!"=="2" goto optimized
if "!choice!"=="3" goto maximum
if "!choice!"=="4" goto cluster
if "!choice!"=="5" goto cluster_max
if "!choice!"=="6" goto development
if "!choice!"=="7" goto custom
if /i "!choice!"=="q" goto quit
if /i "!choice!"=="Q" goto quit
echo Invalid choice. Please try again.
timeout /t 2 /nobreak >nul 2>nul
goto menu

:normal
set "NODE_OPTS="
set "MODE_NAME=Normal (Single Process)"
set "SERVER_FILE=src/server/index.js"
goto start

:optimized
set "NODE_OPTS=--max-old-space-size=4096 --optimize-for-size --gc-interval=100"
set "MODE_NAME=Optimized (4GB RAM)"
set "SERVER_FILE=src/server/index.js"
goto start

:maximum
set "NODE_OPTS=--max-old-space-size=8192 --optimize-for-size"
set "MODE_NAME=Maximum (8GB RAM)"
set "SERVER_FILE=src/server/index.js"
goto start

:cluster
set "NODE_OPTS=--max-old-space-size=4096"
set "MODE_NAME=Cluster Half (Half CPUs x 4GB)"
set "SERVER_FILE=src/server/cluster.js"
set "USE_CLUSTER=1"
set "CLUSTER_WORKERS=half"
goto start

:cluster_max
set "NODE_OPTS=--max-old-space-size=4096"
set "MODE_NAME=Cluster Full (All CPUs x 4GB)"
set "SERVER_FILE=src/server/cluster.js"
set "USE_CLUSTER=1"
set "CLUSTER_WORKERS=all"
goto start

:development
set "NODE_OPTS=--max-old-space-size=4096"
set "MODE_NAME=Development (Auto-restart)"
set "SERVER_FILE=src/server/index.js"
set "USE_NODEMON=1"
goto start

:custom
echo.
set /p "CUSTOM_RAM=Enter RAM per process in MB (e.g., 4096, 8192): "
echo.
echo Use cluster mode? (Spawns multiple workers)
set /p "CUSTOM_CLUSTER=Cluster mode? (Y/N): "
if /i "!CUSTOM_CLUSTER!"=="y" (
    echo.
    echo How many CPU cores to use?
    echo   [1] Half of your cores
    echo   [2] All cores
    echo   [3] Custom number
    set /p "CORE_CHOICE=Choice (1-3): "
    if "!CORE_CHOICE!"=="1" (
        set "CLUSTER_WORKERS=half"
        set "MODE_NAME=Custom Cluster (!CUSTOM_RAM!MB x Half CPUs)"
    ) else if "!CORE_CHOICE!"=="3" (
        set /p "CUSTOM_WORKERS=Enter number of workers: "
        set "CLUSTER_WORKERS=!CUSTOM_WORKERS!"
        set "MODE_NAME=Custom Cluster (!CUSTOM_RAM!MB x !CUSTOM_WORKERS! workers)"
    ) else (
        set "CLUSTER_WORKERS=all"
        set "MODE_NAME=Custom Cluster (!CUSTOM_RAM!MB x All CPUs)"
    )
    set "SERVER_FILE=src/server/cluster.js"
    set "USE_CLUSTER=1"
) else (
    set "SERVER_FILE=src/server/index.js"
    set "MODE_NAME=Custom (!CUSTOM_RAM!MB)"
)
set "NODE_OPTS=--max-old-space-size=!CUSTOM_RAM! --optimize-for-size"
goto start

:start
cls
echo ========================================
echo    Strategic Card Game Server
echo    Mode: !MODE_NAME!
echo ========================================
echo.

:: Kill any existing node processes using port 3000
echo Checking for existing server...
for /f "tokens=5" %%a in ('netstat -aon 2^>nul ^| findstr :3000 ^| findstr LISTENING') do (
    echo Stopping existing server [PID: %%a]...
    taskkill /F /PID %%a >nul 2>nul
)
:: Wait a moment for port to be released
ping -n 2 127.0.0.1 >nul 2>nul
echo.

:: Check if Node.js is available
where node >nul 2>nul
if !ERRORLEVEL! neq 0 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    goto quit
)

:: Check dependencies
echo Checking dependencies...
call npm install --silent 2>nul
if !ERRORLEVEL! neq 0 (
    echo.
    echo ERROR: npm install failed!
    pause
    goto quit
)
echo Dependencies OK
echo.

:: Get local IP
set "LOCAL_IP=unknown"
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /c:"IPv4"') do (
    set "LOCAL_IP=%%a"
    set "LOCAL_IP=!LOCAL_IP:~1!"
    goto :showip
)
:showip

echo ----------------------------------------
echo  Local URL:    http://localhost:3000
echo  Network URL:  http://!LOCAL_IP!:3000
echo ----------------------------------------
echo.

if defined USE_CLUSTER (
    echo  Cluster mode enabled - using all CPU cores
    echo  Each worker handles separate connections
    echo  Auto-restarts crashed workers
    echo.
)

echo Share your public IP with friends for internet play.
echo Press Ctrl+C to stop the server.
echo.
echo ========================================
echo.

:: Run the server based on mode
if defined USE_NODEMON (
    echo Starting in development mode with nodemon...
    echo.
    call npx nodemon !NODE_OPTS! !SERVER_FILE!
) else if defined USE_CLUSTER (
    echo Starting cluster server...
    echo.
    set "WORKERS=!CLUSTER_WORKERS!"
    node !NODE_OPTS! !SERVER_FILE!
) else (
    echo Starting server...
    echo.
    node !NODE_OPTS! !SERVER_FILE!
)

echo.
echo ========================================
if !ERRORLEVEL! neq 0 (
    echo SERVER STOPPED with error code: !ERRORLEVEL!
) else (
    echo SERVER STOPPED
)
echo ========================================
echo.

set /p "restart=Restart server? (Y/N): "
if /i "!restart!"=="y" goto menu
if /i "!restart!"=="Y" goto menu

:quit
echo.
echo Goodbye!
endlocal
exit /b 0
