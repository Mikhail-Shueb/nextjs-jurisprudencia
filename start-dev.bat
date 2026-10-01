@echo off
setlocal enabledelayedexpansion
title STJ Jurisprudencia - Servidor de Desenvolvimento Local

echo.
echo  =====================================================================
echo    SUPREMO TRIBUNAL DE JUSTICA - JURISPRUDENCIA
echo    Inicializador do Servidor de Desenvolvimento Local
echo  =====================================================================
echo.

set "SCRIPT_DIR=%~dp0"
cd /d "%SCRIPT_DIR%"

:: Executar a versao PowerShell caso disponivel
where powershell >nul 2>&1
if %ERRORLEVEL% equ 0 (
    if exist "start-dev.ps1" (
        powershell -NoProfile -ExecutionPolicy Bypass -File "start-dev.ps1" %*
        exit /b %ERRORLEVEL%
    )
)

if not exist "node_modules" (
    echo  [INFO] A instalar dependencias com npm install...
    call npm install
)

echo  [INFO] A iniciar servidor Next.js em http://localhost:3000 ...
start http://localhost:3000/boletim
call npm run dev
