@echo off
title SERVIDOR AGILE CRM
echo ==========================================
echo    INICIANDO SERVIDOR LOCAL - AGILE CRM
echo ==========================================
echo.
echo Abra o navegador em: http://localhost:8000
echo.
python dev_server.py
if %errorlevel% neq 0 (
    echo.
    echo [ERRO] Python nao encontrado! 
    echo Certifique-se de que o Python esta instalado e no PATH do sistema.
    echo Tentando abrir apenas o arquivo (pode haver erros de CORS)...
    pause
    start index.html
)
pause
