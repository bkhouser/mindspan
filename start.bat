@echo off
setlocal EnableExtensions
title Mindspan Launcher

set "ROOT=%~dp0"
cd /d "%ROOT%"

echo.
echo  ========================================
echo              M I N D S P A N
echo  ========================================
echo.

where node >nul 2>&1 || goto :missing_node
where npm >nul 2>&1 || goto :missing_node
where docker >nul 2>&1 || goto :missing_docker

if not exist "%ROOT%node_modules\" (
  echo [1/5] Installing Node.js dependencies...
  call npm install || goto :failed
) else (
  echo [1/5] Node.js dependencies are ready.
)

echo [2/5] Checking Docker...
docker info >nul 2>&1
if errorlevel 1 (
  if not exist "C:\Program Files\Docker\Docker\Docker Desktop.exe" goto :docker_not_running
  echo       Starting Docker Desktop...
  start "" "C:\Program Files\Docker\Docker\Docker Desktop.exe"
  set /a DOCKER_TRIES=0
)

:wait_for_docker
docker info >nul 2>&1
if not errorlevel 1 goto :docker_ready
set /a DOCKER_TRIES+=1
if %DOCKER_TRIES% GEQ 60 goto :docker_timeout
timeout /t 2 /nobreak >nul
goto :wait_for_docker

:docker_ready
echo       Docker is ready.

echo [3/5] Starting local Supabase services...
call npx supabase status >nul 2>&1
if errorlevel 1 (
  call npx supabase start || goto :failed
) else (
  echo       Supabase is already running.
)

echo [4/5] Checking local environment...
if not exist "%ROOT%.env.local" (
  powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%ROOT%scripts\write-local-env.ps1"
  if errorlevel 1 goto :failed
) else (
  echo       .env.local is ready.
)

echo [5/5] Starting the Mindspan web application...
powershell.exe -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:3000' -TimeoutSec 2; exit 0 } catch { exit 1 }" >nul 2>&1
if errorlevel 1 (
  start "Mindspan Web" cmd.exe /k "cd /d ""%ROOT%"" && npm run dev"
) else (
  echo       Mindspan is already running.
)

set /a WEB_TRIES=0
:wait_for_web
powershell.exe -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing 'http://127.0.0.1:3000' -TimeoutSec 2; if ($r.StatusCode -lt 500) { exit 0 } } catch {}; exit 1" >nul 2>&1
if not errorlevel 1 goto :web_ready
set /a WEB_TRIES+=1
if %WEB_TRIES% GEQ 45 goto :web_timeout
timeout /t 2 /nobreak >nul
goto :wait_for_web

:web_ready
echo.
echo Mindspan is ready:
echo   App:      http://127.0.0.1:3000
echo   Database: http://127.0.0.1:54323
echo   Email:    http://127.0.0.1:54324
echo.
start "" "http://127.0.0.1:3000"
exit /b 0

:missing_node
echo ERROR: Node.js and npm are required. Install Node.js 20 or newer.
goto :failed

:missing_docker
echo ERROR: Docker Desktop is required and docker.exe is not on PATH.
goto :failed

:docker_not_running
echo ERROR: Docker is not running and Docker Desktop was not found in its standard location.
goto :failed

:docker_timeout
echo ERROR: Docker did not become ready within two minutes.
goto :failed

:web_timeout
echo ERROR: The web server did not respond within 90 seconds.
echo        Review the "Mindspan Web" window for the underlying error.
goto :failed

:failed
echo.
echo Mindspan could not be started.
pause
exit /b 1
