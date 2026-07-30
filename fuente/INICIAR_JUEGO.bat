@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Necesitas instalar Node.js 22 o superior desde https://nodejs.org/
  pause
  exit /b 1
)
if not exist node_modules (
  echo Preparando el juego por primera vez...
  call npm install
  if errorlevel 1 (
    echo No se pudieron instalar los componentes.
    pause
    exit /b 1
  )
)
start "Servidor - Marcelo La Ruta Imposible" cmd /k "npm run dev"
timeout /t 4 /nobreak >nul
start "" "http://localhost:3000"
endlocal
