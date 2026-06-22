@echo off
REM Startet Claude Code im Habit-Tracker-Ordner (getrennt vom SAT-Projekt).
cd /d "%~dp0"
echo Arbeitsordner: %cd%

set "CLAUDE=%USERPROFILE%\.local\bin\claude.exe"
if exist "%CLAUDE%" (
  "%CLAUDE%"
) else (
  where claude >nul 2>nul
  if errorlevel 1 (
    echo.
    echo claude.exe nicht gefunden unter "%CLAUDE%" und nicht im PATH.
    echo Bitte Installationspfad pruefen.
    pause
  ) else (
    claude
  )
)
