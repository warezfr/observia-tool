@echo off
echo Starting Observia Backend...
cd backend
python -m pip install -r requirements.txt
echo.
echo Backend dependencies installed.
echo Starting FastAPI server...
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
