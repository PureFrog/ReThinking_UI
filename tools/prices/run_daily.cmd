@echo off
rem Real prices to Supabase, weekdays 22:00 (Windows Task Scheduler \rethinking\push-prices), after the sudden-drop
rem pipeline (investment-evidence-system, 18:30) has fetched the day's KRX files. Safe to run again: only new days go up.
rem Log: tools\prices\logs\YYYYMMDD.log (git-ignored). Keys: investment-evidence-system\.env (never printed).
rem ASCII only: cmd.exe misreads UTF-8 comments.
cd /d "%~dp0..\.."
if not exist tools\prices\logs mkdir tools\prices\logs
for /f %%i in ('powershell -NoProfile -Command "Get-Date -Format yyyyMMdd"') do set D=%%i
set PYTHONIOENCODING=utf-8
echo === %DATE% %TIME% >> tools\prices\logs\%D%.log
py -3 tools\prices\push_prices.py --env C:\code\investment-evidence-system\.env >> tools\prices\logs\%D%.log 2>&1
echo exit %ERRORLEVEL% >> tools\prices\logs\%D%.log
