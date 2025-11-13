@echo off
echo.
echo ========================================
echo   🔧 CONFIGURANDO DESPESAS VERO
echo ========================================
echo.

cd /d "C:\Projetos\Volei\team-treasury"

echo 📂 Configurando em: %CD%
echo.

echo 🔧 Criando arquivo de configuração...

(
echo # Configuração do Despesas Vero
echo APP_DB_MODE=supabase
echo.
echo # Configurações do Supabase
echo REACT_APP_SUPABASE_URL=https://fqodpsccxvifxifnfqhz.supabase.co
echo REACT_APP_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZxb2Rwc2NjeHZpZnhpZm5mcWh6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgzMTA2OTEsImV4cCI6MjA3Mzg4NjY5MX0.85L2IoBnD01RG0E8rm3GxiqGvlN83UnnaQkcJ7b05rs
echo.
echo # Configurações locais ^(fallback^)
echo LOCAL_DB_PATH=data/despesas_vero.db
echo APP_DATA_DIR=%%APPDATA%%/DespesasVero
) > ".env.local"

echo ✅ Arquivo .env.local criado com suas credenciais!
echo.

echo 📦 Verificando dependências...
if not exist "node_modules" (
    echo 📥 Instalando dependências do Node.js...
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
echo 🗄️  Configurando banco Supabase...
echo.
echo ⚠️  IMPORTANTE: Agora preciso que você execute o SQL no dashboard do Supabase:
echo.
echo 📋 PASSOS:
echo    1. Abra: https://supabase.com/dashboard
echo    2. Selecione seu projeto
echo    3. Vá em "SQL Editor"
echo    4. Copie TODO o conteúdo do arquivo: sql/schema.sql
echo    5. Cole no editor e execute
echo.
echo 📁 O arquivo sql/schema.sql está nesta pasta: %CD%\sql\
echo.

pause

echo.
echo 🧪 Testando configuração...
npm run setup-supabase

if %errorlevel% equ 0 (
    echo.
    echo 🎉 CONFIGURAÇÃO CONCLUÍDA COM SUCESSO!
    echo.
    echo ✅ Supabase configurado
    echo ✅ Credenciais válidas
    echo ✅ Banco configurado
    echo.
    echo 🚀 Para iniciar o aplicativo:
    echo    npm start
    echo.
    echo 🌐 O app abrirá em: http://localhost:3000
) else (
    echo.
    echo ⚠️  Houve algum problema na configuração.
    echo 📋 Verifique se:
    echo    1. Executou o SQL no dashboard do Supabase
    echo    2. As credenciais estão corretas
    echo    3. O projeto Supabase está ativo
)

echo.
pause
