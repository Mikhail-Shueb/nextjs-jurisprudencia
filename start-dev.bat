@echo off
setlocal enabledelayedexpansion
title STJ Jurisprudencia - Servidor de Desenvolvimento Local

echo.
echo  =====================================================================
echo    SUPREMO TRIBUNAL DE JUSTICA - JURISPRUDENCIA
echo    Inicializador do Servidor de Desenvolvimento Local
echo  =====================================================================
echo.

:: 1. Verificar instalacao do Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo  [ERRO CRITICO] O Node.js nao foi detetado no sistema.
    echo  Por favor instale o Node.js v18 ou superior a partir de:
    echo  https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VER=%%v
for /f "tokens=*" %%v in ('npm -v') do set NPM_VER=%%v
echo  [1/4] Node.js !NODE_VER! detetado (npm v!NPM_VER!).

:: 2. Verificar presenca de node_modules
if not exist "node_modules\" (
    echo  [2/4] A instalar dependencias essenciais do projeto...
    call npm install --ignore-scripts
    if %errorlevel% neq 0 (
        echo  [ERRO] Ocorreu uma falha durante a instalacao dos modulos.
        pause
        exit /b 1
    )
) else (
    echo  [2/4] Modulos e dependencias verificados com sucesso.
)

:: 3. Verificar e libertar porta 3000 se necessario
set PORT_BUSY=0
for /f "tokens=5" %%a in ('netstat -aon ^| findstr /r ":3000 .*LISTENING"') do (
    set OCCUPIED_PID=%%a
    set PORT_BUSY=1
)

if "!PORT_BUSY!"=="1" (
    echo  [3/4] A porta 3000 esta ocupada pelo processo PID !OCCUPIED_PID!.
    choice /c SN /m "Deseja terminar o processo anterior para reiniciar o servidor (S/N)?"
    if errorlevel 2 (
        echo  A utilizar porta alternativa atribuida pelo Next.js...
    ) else (
        echo  A libertar a porta 3000...
        taskkill /F /PID !OCCUPIED_PID! >nul 2>nul
        timeout /t 1 /nobreak >nul
        echo  [OK] Porta 3000 libertada.
    )
) else (
    echo  [3/4] Porta 3000 disponivel e pronta.
)

:: 4. Configuracao do ambiente local
if not exist ".env.local" (
    if exist ".env.example" (
        copy /y ".env.example" ".env.local" >nul
        echo  [4/4] Ficheiro .env.local criado a partir do modelo de referencia.
    )
) else (
    echo  [4/4] Ficheiro de configuracao .env.local carregado.
)

echo.
echo  =====================================================================
echo    Servidor pronto a iniciar em http://localhost:3000
echo    - Painel Analitico: http://localhost:3000/dashboard
echo    - Pesquisa STJ:     http://localhost:3000/pesquisa
echo    - Matriz Indices:   http://localhost:3000/indices
echo    - Administracao:    http://localhost:3000/admin  (admin/admin)
echo  =====================================================================
echo.

:: Abrir browser automaticamente
start "" /b cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000/dashboard"

:: Iniciar Next.js
npm run dev

pause
