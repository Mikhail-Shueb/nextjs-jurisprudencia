@echo off
chcp 65001 > nul
cls
echo ============================================================
echo   STJ Jurisprudencia - Modulo de Boletins Oficiais
echo   Iniciando Servidor Local para Apresentacao da Demo...
echo ============================================================
echo.
cd /d "%~dp0"

echo [1/3] A verificar dependencias e configuracao...
if not exist "node_modules" (
    echo A instalar dependencias necessarias...
    call npm install
)

echo [2/3] A iniciar o servidor de demonstracao (Next.js na porta 3000)...
start "STJ Boletim Demo Server" cmd /c "npm run dev"

echo [3/3] A aguardar inicializacao e a abrir o navegador...
timeout /t 3 /nobreak > nul
start http://localhost:3000/boletim

echo.
echo ============================================================
echo   DEMO EM EXECUCAO COM SUCESSO!
echo   URL: http://localhost:3000/boletim
echo.
echo   Pontos-Chave para Apresentar:
echo   - Seletor de Seccao: Social, Civel, Criminal, Contencioso
echo   - Seletor de Periodo: "Ano Inteiro (Boletim Anual)"
echo   - Filtro Caderno Tematico: Pesquisa por Descritor/Tema
echo   - Colectivo de Juizes: Relator e Adjuntos normalizados
echo   - Indice Tematico Alfabetico (A-Z) com ancoras
echo   - Botao "Imprimir / Guardar PDF" (layout oficial A4)
echo ============================================================
echo.
echo Pressione qualquer tecla para fechar esta janela (o servidor continuara ativo em background).
pause > nul
