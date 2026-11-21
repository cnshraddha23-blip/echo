@echo off
title Echo Companion Agent
cd /d "%~dp0"
echo ========================================================
echo           ECHO COMPANION - LOCAL OS AGENT
echo ========================================================
echo Connecting local operating system to Echo Cloud Brain...

set "PYTHONPATH=%~dp0;%~dp0companion;%PYTHONPATH%"

python -m pip install -q -r "%~dp0companion\requirements.txt"
if %errorlevel% neq 0 (
    echo [!] Notice: Installing companion dependencies...
    pip install python-socketio requests psutil websocket-client Pillow pywin32
)

echo Starting interactive graphical companion...
python -m companion.echo_companion --gui
if %errorlevel% neq 0 (
    echo [!] Direct fallback launch...
    python "%~dp0companion\echo_companion.py" --gui
)

pause
