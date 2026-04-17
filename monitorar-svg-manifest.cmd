@echo off
setlocal
powershell -ExecutionPolicy Bypass -File "%~dp0watch-svg-manifest.ps1"
endlocal
