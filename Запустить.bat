@echo off
rem Starts the poster app: a tiny local server + opens the browser.
cd /d "%~dp0"
set PY=
where python >nul 2>nul
if not errorlevel 1 set PY=python
if not defined PY (
  where py >nul 2>nul
  if not errorlevel 1 set PY=py
)
if not defined PY goto noserver
start "plakat5 server" /min %PY% -m http.server 8765 --bind 127.0.0.1
timeout /t 1 /nobreak >nul
start "" "http://127.0.0.1:8765/index.html"
goto :eof

:noserver
echo Python not found - opening without server (auto background removal will be off).
start "" "%~dp0index.html"
