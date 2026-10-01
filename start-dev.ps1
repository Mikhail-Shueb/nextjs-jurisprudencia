<#
.SYNOPSIS
    Supremo Tribunal de Justiça - Jurisprudência
    Script de Inicialização do Ambiente Local (PowerShell)
.DESCRIPTION
    Inicializa o servidor de desenvolvimento Next.js a partir da pasta do projeto,
    verifica dependências, serviços auxiliares e abre a aplicação no browser.
#>

param (
    [switch]$NoBrowser,
    [switch]$WithDocker
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "=====================================================================" -ForegroundColor DarkCyan
Write-Host "   SUPREMO TRIBUNAL DE JUSTICA - JURISPRUDENCIA" -ForegroundColor White
Write-Host "   Inicializador do Servidor de Desenvolvimento Local" -ForegroundColor Gray
Write-Host "=====================================================================" -ForegroundColor DarkCyan
Write-Host ""

$projectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $projectDir
Write-Host "[1/4] Diretoria de trabalho:" -ForegroundColor Green -NoNewline
Write-Host " $projectDir"

# 1. Verificar Node.js
Write-Host "[2/4] A verificar ambiente Node.js..." -ForegroundColor Green
try {
    $nodeVersion = & node -v
    $npmVersion = & npm -v
    Write-Host "      Node.js: $nodeVersion | npm: $npmVersion" -ForegroundColor Gray
} catch {
    Write-Host "[ERRO] Node.js não se encontra instalado ou não está no PATH." -ForegroundColor Red
    Write-Host "       Instale o Node.js v18+ a partir de https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# 2. Verificar dependências (node_modules)
if (-not (Test-Path (Join-Path $projectDir "node_modules"))) {
    Write-Host "[INFO] Pasta node_modules não encontrada. A executar 'npm install'..." -ForegroundColor Yellow
    & npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERRO] Falha ao instalar dependências com npm." -ForegroundColor Red
        exit 1
    }
}

# 3. Verificar estado dos serviços (Docker / Elasticsearch / Redis)
Write-Host "[3/4] A verificar serviços auxiliares..." -ForegroundColor Green
$dockerRunning = $false
try {
    $dockerInfo = & docker info 2>&1
    if ($LASTEXITCODE -eq 0) {
        $dockerRunning = $true
    }
} catch {
    $dockerRunning = $false
}

if ($dockerRunning) {
    Write-Host "      Docker detetado em execução." -ForegroundColor Gray
    if ($WithDocker) {
        Write-Host "      A iniciar contentores auxiliares (Elasticsearch e Redis)..." -ForegroundColor Gray
        & docker compose up -d elasticsearch redis
    } else {
        Write-Host "      (Dica: Pode passar o parâmetro -WithDocker para iniciar Elasticsearch/Redis via Docker)" -ForegroundColor DarkGray
    }
} else {
    Write-Host "      [INFO] Docker não está em execução." -ForegroundColor Yellow
    Write-Host "      O servidor funcionará em modo local com resiliência automática:" -ForegroundColor Gray
    Write-Host "      - Dados de referência do STJ e demonstração dos Boletins integrados" -ForegroundColor Gray
    Write-Host "      - Consultas de chaves, índices e navegação sem bloqueios" -ForegroundColor Gray
}

# 4. Verificar se a porta 3000 já está em uso
$activeConnections = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue
if ($activeConnections) {
    $pids = $activeConnections.OwningProcess | Select-Object -Unique
    Write-Host "      [AVISO] A porta 3000 já tem processos ativos (PID: $($pids -join ', '))." -ForegroundColor Yellow
    Write-Host "      Tentando encerrar processo anterior na porta 3000..." -ForegroundColor Gray
    foreach ($p in $pids) {
        try {
            Stop-Process -Id $p -Force -ErrorAction SilentlyContinue
            Write-Host "      Processo $p terminado." -ForegroundColor Gray
        } catch {}
    }
    Start-Sleep -Seconds 1
}

# 5. Abrir o browser automaticamente após o arranque
if (-not $NoBrowser) {
    [System.Threading.Tasks.Task]::Run([Action]{
        Start-Sleep -Seconds 3
        try {
            Start-Process "http://localhost:3000/boletim"
        } catch {}
    }) | Out-Null
}

Write-Host "[4/4] A iniciar servidor Next.js em http://localhost:3000 ..." -ForegroundColor Green
Write-Host ""
Write-Host "  > Boletim de Jurisprudência: http://localhost:3000/boletim" -ForegroundColor Cyan
Write-Host "  > Pesquisa Geral:            http://localhost:3000/pesquisa" -ForegroundColor Cyan
Write-Host ""
Write-Host "Pressione Ctrl+C para encerrar o servidor." -ForegroundColor DarkGray
Write-Host "---------------------------------------------------------------------" -ForegroundColor DarkCyan

& npm run dev
