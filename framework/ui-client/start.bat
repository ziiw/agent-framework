@echo off
REM Start script for Agent Framework UI (Windows)

echo Starting Agent Framework UI...
echo.

REM Check if node_modules exist
if not exist "backend\node_modules" (
    echo Installing backend dependencies...
    cd backend
    call npm install
    cd ..
)

if not exist "frontend\node_modules" (
    echo Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
)

echo.
echo Dependencies ready
echo.
echo Starting backend server on http://localhost:3001...
echo Starting frontend server on http://localhost:3000...
echo.
echo Press Ctrl+C to stop
echo.

REM Start backend
start "Backend Server" cmd /k "cd backend && npm start"

REM Wait a moment for backend to start
timeout /t 2 /nobreak >nul

REM Start frontend
start "Frontend Server" cmd /k "cd frontend && npm run dev"

echo.
echo Servers started in separate windows
echo Close the windows to stop the servers
echo.
pause

