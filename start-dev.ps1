<#
.SYNOPSIS
    Supremo Tribunal de Justiça - Jurisprudência
    PowerShell Development Server Launcher

.DESCRIPTION
    Verifica os pré-requisitos do ambiente, liberta a porta 3000 se necessário,
    valida a configuração .env.local, abre o browser no dashboard e inicia o Next.js.
#>

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
Clear-Host

Write-Host "=====================================================================" -ForegroundColor DarkBlue
Write-Host "  SUPREMO TRIBUNAL DE JUSTIÇA - JURISPRUDÊNCIA" -ForegroundColor Cyan
Write-Host "  Inicializador do Servidor de Desenvolvimento Local (PowerShell)" -ForegroundColor DarkCyan
Write-Host "=====================================================================" -ForegroundColor DarkBlue
Write-Host ""

# 1. Verificar Node.js
try {
    $nodeVer = (node -v).Trim()
    $npmVer = (npm -v).Trim()
    Write-Host "[1/4] Node.js $nodeVer detetado (npm v$npmVer)." -ForegroundColor Green
} catch {
    Write-Host "[ERRO CRÍTICO] Node.js não encontrado no sistema." -ForegroundColor Red
    Write-Host "Instale a versão 18+ a partir de https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Pressione Enter para sair..."
    exit 1
}

# 2. Verificar dependências
if (-not (Test-Path "node_modules")) {
    Write-Host "[2/4] A instalar dependências essenciais..." -ForegroundColor Yellow
    npm install --ignore-scripts
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERRO] Falha ao instalar módulos." -ForegroundColor Red
        Read-Host "Pressione Enter para sair..."
        exit 1
    }
} else {
    Write-Host "[2/4] Dependências node_modules verificadas com sucesso." -ForegroundColor Green
}

# 3. Verificar porta 3000
$port3000Process = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($port3000Process) {
    $pidToKill = $port3000Process.OwningProcess
    Write-Host "[3/4] A porta 3000 está ocupada pelo processo PID $pidToKill." -ForegroundColor Yellow
    $choice = Read-Host "Deseja terminar o processo anterior para reiniciar limpo? (S/N)"
    if ($choice -match "^[sS]") {
        Stop-Process -Id $pidToKill -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
        Write-Host "      [OK] Porta 3000 libertada." -ForegroundColor Green
    }
} else {
    Write-Host "[3/4] Porta 3000 livre e pronta para utilização." -ForegroundColor Green
}

# 4. Verificar ficheiro .env.local
if (-not (Test-Path ".env.local")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env.local"
        Write-Host "[4/4] Ficheiro .env.local gerado a partir do modelo." -ForegroundColor Green
    }
} else {
    Write-Host "[4/4] Ficheiro .env.local carregado." -ForegroundColor Green
}

Write-Host ""
Write-Host "=====================================================================" -ForegroundColor DarkBlue
Write-Host "  Servidor pronto a iniciar em http://localhost:3000" -ForegroundColor White
Write-Host "  - Painel Analítico: http://localhost:3000/dashboard" -ForegroundColor Gray
Write-Host "  - Pesquisa STJ:     http://localhost:3000/pesquisa" -ForegroundColor Gray
Write-Host "  - Matriz Índices:   http://localhost:3000/indices" -ForegroundColor Gray
Write-Host "  - Administração:    http://localhost:3000/admin  (admin/admin)" -ForegroundColor Gray
Write-Host "=====================================================================" -ForegroundColor DarkBlue
Write-Host ""

# Abrir browser em segundo plano
Start-Job -ScriptBlock {
    Start-Sleep -Seconds 3
    Start-Process "http://localhost:3000/dashboard"
} | Out-Null

# Iniciar servidor Next.js
npm run dev
