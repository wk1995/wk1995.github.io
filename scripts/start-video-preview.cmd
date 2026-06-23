@echo off
setlocal

cd /d "%~dp0.."

where node >nul 2>nul
if errorlevel 1 (
  echo.
  echo [WK1995] Node.js was not found.
  echo This video page needs Node.js to run api\douyin\resolve.js for Douyin share-link parsing.
  echo.
  echo Install Node.js LTS, then run this file again:
  echo https://nodejs.org/
  echo.
  start "" "https://nodejs.org/"
  pause
  exit /b 1
)

echo.
echo [WK1995] Starting local video preview...
echo [WK1995] Starting server-side Douyin resolver handler: api\douyin\resolve.js
echo [WK1995] Keep this window open while parsing Douyin share links.
echo.

set PORT=8010
node scripts\video-preview-server.js %PORT%

echo.
echo [WK1995] Preview server stopped.
pause
