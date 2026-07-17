@echo off
setlocal

cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [WK1995] Node.js was not found.
  echo Please install Node.js LTS, then run this file again:
  echo https://nodejs.org/
  echo.
  start "" "https://nodejs.org/"
  pause
  exit /b 1
)

set HOST=127.0.0.1
if "%PORT%"=="" set PORT=8024
set HOME_URL=http://%HOST%:%PORT%/

echo.
echo [WK1995] Starting local site service...
echo [WK1995] Home: %HOME_URL%
echo [WK1995] Keep this window open while previewing the site.
echo.

start "" powershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -Command "Start-Sleep -Seconds 1; Start-Process '%HOME_URL%'"

node scripts\video-resolver-server.cjs %PORT%

echo.
echo [WK1995] Site service stopped.
pause
