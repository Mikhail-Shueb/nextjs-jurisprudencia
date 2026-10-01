# Script de inicialização da demonstração do Boletim STJ
$ErrorActionPreference = "Stop"
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  STJ Jurisprudência - Módulo de Boletins Oficiais" -ForegroundColor Yellow
Write-Host "  Inicialização da Demonstração Local" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

Set-Location $PSScriptRoot

# 1. Verificar dependências
if (-not (Test-Path "node_modules")) {
    Write-Host "[1/3] A instalar dependências..." -ForegroundColor Yellow
    npm install
} else {
    Write-Host "[1/3] Dependências verificadas." -ForegroundColor Green
}

# 2. Iniciar servidor Next.js
Write-Host "[2/3] A iniciar o servidor Next.js na porta 3000..." -ForegroundColor Yellow
$serverJob = Start-Process -FilePath "npm" -ArgumentList "run", "dev" -PassThru

# 3. Aguardar e abrir browser
Write-Host "[3/3] A aguardar arranque e a abrir http://localhost:3000/boletim ..." -ForegroundColor Green
Start-Sleep -Seconds 3
Start-Process "http://localhost:3000/boletim"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  DEMO EM EXECUÇÃO: http://localhost:3000/boletim" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Green
