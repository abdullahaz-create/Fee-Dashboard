@echo off
echo ==========================================
echo   Fee Dashboard — Start Script
echo ==========================================
echo.

echo [1/2] Installing dependencies (if needed)...
cd /d "%~dp0"
call npm install
cd /d "%~dp0backend"
call npm install
cd /d "%~dp0frontend"
call npm install

echo.
echo [2/2] Starting Fee Dashboard...
cd /d "%~dp0"
call npm run dev

echo.
pause
