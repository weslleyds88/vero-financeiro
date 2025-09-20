@echo off
echo.
echo ========================================
echo   🏐 DESPESAS VERO - VERO VOLEI
echo ========================================
echo.

cd /d "C:\Projetos\Volei\team-treasury"

echo 📂 Pasta atual: %CD%
echo.

echo 🔍 Verificando se Node.js está instalado...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js não encontrado!
    echo 📥 Baixe em: https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js encontrado: 
node --version

echo.
echo 🔍 Verificando dependências...
if not exist "node_modules" (
    echo 📦 Instalando dependências...
    npm install
    if %errorlevel% neq 0 (
        echo ❌ Erro ao instalar dependências!
        pause
        exit /b 1
    )
) else (
    echo ✅ Dependências já instaladas
)

echo.
echo 🔍 Verificando configuração...
if not exist ".env.local" (
    echo ⚠️  Arquivo .env.local não encontrado!
    echo 📋 Copiando arquivo de exemplo...
    copy ".env.example" ".env.local" >nul
    echo.
    echo 🔧 CONFIGURE O ARQUIVO .env.local ANTES DE CONTINUAR:
    echo    1. Abra o arquivo .env.local
    echo    2. Configure APP_DB_MODE (local ou supabase)
    echo    3. Se supabase, configure as URLs e chaves
    echo.
    echo 📖 Consulte SETUP-SUPABASE.md para mais detalhes
    echo.
    pause
)

echo.
echo 🚀 Iniciando Despesas Vero...
echo 🌐 O aplicativo abrirá em: http://localhost:3000
echo.
echo ⏹️  Para parar: Ctrl+C
echo.

npm start
