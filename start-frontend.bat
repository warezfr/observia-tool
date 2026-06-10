@echo off
echo Starting Observia Frontend...
cd frontend
call npm install
echo.
echo Frontend dependencies installed.
echo Starting Vite dev server...
call npm run dev
