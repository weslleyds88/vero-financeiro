@echo off
echo.
echo ========================================
echo   🏐 DESPESAS VERO - GERAR EXECUTAVEL
echo ========================================
echo.

cd /d "C:\Projetos\Volei\team-treasury"

echo 📂 Pasta atual: %CD%
echo.

echo 🔍 Verificando Node.js...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js não encontrado!
    pause
    exit /b 1
)

echo ✅ Node.js: 
node --version

echo.
echo 🔍 Verificando dependências...
if not exist "node_modules" (
    echo 📦 Instalando dependências...
    npm install
)

echo.
echo 🏗️  Fazendo build do projeto...
npm run build
if %errorlevel% neq 0 (
    echo ❌ Erro no build!
    pause
    exit /b 1
)

echo.
echo 📦 Gerando executável para Windows...
npm run package-win
if %errorlevel% neq 0 (
    echo ❌ Erro ao gerar executável!
    pause
    exit /b 1
)

echo.
echo ✅ EXECUTÁVEL GERADO COM SUCESSO!
echo.
echo 📁 Localização: %CD%\dist\
echo 🎯 Procure por: Despesas Vero Setup.exe ou similar
echo.

echo 🔍 Abrindo pasta dist...
explorer "dist"

echo.
echo 🎉 Pronto! Você pode distribuir o executável.
pause
