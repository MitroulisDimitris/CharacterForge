@echo off
rem Starts Character Forge and opens it in your browser.
cd /d "%~dp0"
if not exist node_modules (
  echo Installing packages, first run only...
  call npm install
)
start "" http://localhost:5173
call npm run dev
