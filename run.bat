@echo off
title Echo Voice Assistant
color 0E
echo ========================================================
echo           Starting Echo AI Desktop Assistant
echo ========================================================
echo.
cd /d "%~dp0"

echo [1/2] Opening Echo Interface in browser...
start http://127.0.0.1:5000

echo [2/2] Starting Echo Server on port 5000...
echo.
echo Echo is running at http://127.0.0.1:5000
echo Keep this window open while using Echo.
echo (Press Ctrl+C to stop)
echo.

python -m uvicorn backend.main:combined_asgi_app --host 127.0.0.1 --port 5000
pause
