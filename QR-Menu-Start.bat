@echo off
title QR Menu - Restaurant System
color 0A

echo =========================================
echo   QR Menu - Restaurant Ordering System
echo =========================================
echo.

:: Kill old processes on ports
echo Cleaning up old processes...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
timeout /t 2 >nul

:: Get local IP
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /C:"IPv4"') do (
    set LOCAL_IP=%%a
    goto :found_ip
)
:found_ip
set LOCAL_IP=%LOCAL_IP: =%

:: Start backend
echo Starting backend...
cd /d "%~dp0backend"
start "QR-Menu-Backend" cmd /c "npm run dev"
timeout /t 3 >nul

:: Start frontend
echo Starting frontend...
cd /d "%~dp0frontend"
start "QR-Menu-Frontend" cmd /c "npm run dev"
timeout /t 4 >nul

echo.
echo =========================================
echo   QR Menu is running!
echo =========================================
echo.
echo   Local:     http://localhost:3000
echo   Network:   http://%LOCAL_IP%:3000
echo.
echo   Admin:     http://%LOCAL_IP%:3000/admin
echo   Menu:      http://%LOCAL_IP%:3000/menu?table=1
echo   Backend:   http://%LOCAL_IP%:3001
echo.
echo =========================================
echo.
echo   Close this window to stop all servers
echo =========================================

:: Wait for user to close
pause >nul

:: Cleanup on close
echo Stopping servers...
taskkill /FI "WINDOWTITLE eq QR-Menu-Backend" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq QR-Menu-Frontend" /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3001 ^| findstr LISTENING') do taskkill /PID %%a /F >nul 2>&1
