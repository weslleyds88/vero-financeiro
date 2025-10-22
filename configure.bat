@echo off
echo.
echo ========================================
echo   🔧 CONFIGURADOR DESPESAS VERO
echo ========================================
echo.

cd /d "C:\Projetos\Volei\team-treasury"

echo 📂 Pasta: %CD%
echo.

echo 🔍 Verificando configuração atual...
if exist ".env.local" (
    echo ✅ Arquivo .env.local encontrado
    echo 📋 Configuração atual:
    type ".env.local"
    echo.
) else (
    echo ⚠️  Arquivo .env.local não encontrado
    echo 📋 Criando arquivo de configuração...
    copy ".env.example" ".env.local" >nul
    echo ✅ Arquivo .env.local criado
    echo.
)

echo.
echo 🎯 ESCOLHA O MODO DE BANCO:
echo.
echo [1] 🏠 LOCAL (SQLite) - Recomendado para uso offline
echo     ✅ Não precisa de credenciais
echo     ✅ Dados ficam no seu computador
echo     ✅ Funciona sem internet
echo.
echo [2] ☁️  SUPABASE (Cloud) - Para uso online/compartilhado
echo     🔑 Precisa de URL e chave do dashboard
echo     🌐 Dados na nuvem
echo     📱 Acesso de qualquer lugar
echo.

set /p choice="Digite sua escolha (1 ou 2): "

if "%choice%"=="1" goto LOCAL
if "%choice%"=="2" goto SUPABASE

echo ❌ Opção inválida!
pause
exit /b 1

:LOCAL
echo.
echo 🏠 Configurando modo LOCAL...
echo.

(
echo # Configuração do Despesas Vero
echo APP_DB_MODE=local
echo.
echo # Configurações locais
echo LOCAL_DB_PATH=data/despesas_vero.db
echo APP_DATA_DIR=%%APPDATA%%/DespesasVero
) > ".env.local"

echo ✅ Configuração LOCAL salva!
echo.
echo 📦 Instalando dependências...
npm install

echo.
echo 🗄️  Inicializando banco local...
npm run init-db

echo.
echo 📊 Inserindo dados de exemplo...
npm run seed

echo.
echo 🎉 CONFIGURAÇÃO LOCAL CONCLUÍDA!
echo ✅ Você pode executar: npm start
goto END

:SUPABASE
echo.
echo ☁️  Configurando modo SUPABASE...
echo.
echo 🔑 Preciso das seguintes informações do dashboard Supabase:
echo.
echo 1. SUPABASE_URL (ex: https://abc123.supabase.co)
echo 2. SUPABASE_ANON_KEY (chave longa que começa com eyJ...)
echo.
echo 📋 Para obter essas informações:
echo    1. Acesse: https://supabase.com/dashboard
echo    2. Selecione seu projeto
echo    3. Vá em Settings → API
echo    4. Copie Project URL e anon public key
echo.

set /p url="Cole a SUPABASE_URL: "
if "%url%"=="" (
    echo ❌ URL não pode estar vazia!
    pause
    exit /b 1
)

set /p key="Cole a SUPABASE_ANON_KEY: "
if "%key%"=="" (
    echo ❌ Chave não pode estar vazia!
    pause
    exit /b 1
)

(
echo # Configuração do Despesas Vero
echo APP_DB_MODE=supabase
echo.
echo # Configurações do Supabase
echo REACT_APP_SUPABASE_URL=%url%
echo REACT_APP_SUPABASE_ANON_KEY=%key%
) > ".env.local"

echo.
echo ✅ Configuração SUPABASE salva!
echo.
echo 📦 Instalando dependências...
npm install

echo.
echo 🗄️  Configurando banco Supabase...
echo ⚠️  IMPORTANTE: Execute o SQL do arquivo sql/schema.sql no dashboard do Supabase primeiro!
echo.
pause

npm run setup-supabase

echo.
echo 🎉 CONFIGURAÇÃO SUPABASE CONCLUÍDA!

:END
echo.
echo 🚀 Para iniciar o aplicativo:
echo    - Execute: npm start
echo    - Ou duplo clique em: start.bat
echo.
pause
