@echo off
:: BatchGotAdmin
:-------------------------------------
REM --> Check for permissions
IF "%PROCESSOR_ARCHITECTURE%" EQU "amd64" (
>nul 2>&1 "%SYSTEMROOT%\SysWOW64\cacls.exe" "%SYSTEMROOT%\SysWOW64\config\system"
) ELSE (
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
)

REM --> If error flag set, we do not have admin.
if '%errorlevel%' NEQ '0' (
    echo Solicitando permisos de administrador...
    goto UACPrompt
) else ( goto gotAdmin )

:UACPrompt
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    set params = %*:"=""
    echo UAC.ShellExecute "cmd.exe", "/c ""%~s0"" %params%", "", "runas", 1 >> "%temp%\getadmin.vbs"

    "%temp%\getadmin.vbs"
    del "%temp%\getadmin.vbs"
    exit /B

:gotAdmin
    pushd "%CD%"
    CD /D "%~dp0"
:--------------------------------------

echo ======================================================
echo    REPARANDO DNS Y CONECTIVIDAD DE TURAFOOD EN WINDOWS
echo ======================================================
echo.

echo 1. Configurando DNS de Cloudflare (1.1.1.1 y 8.8.8.8) en adaptador Wi-Fi...
netsh interface ipv4 set dnsservers name="Wi-Fi" source=static address=1.1.1.1 register=none validate=no
netsh interface ipv4 add dnsservers name="Wi-Fi" address=8.8.8.8 index=2 validate=no

echo 2. Agregando dominios de produccion al archivo hosts de Windows...
findstr /C:"turafood.com" "%SystemRoot%\System32\drivers\etc\hosts" >nul
if %errorlevel% NEQ 0 (
    echo. >> "%SystemRoot%\System32\drivers\etc\hosts"
    echo # TuraFood Cloudflare Routing >> "%SystemRoot%\System32\drivers\etc\hosts"
    echo 104.21.80.119 turafood.com >> "%SystemRoot%\System32\drivers\etc\hosts"
    echo 104.21.80.119 www.turafood.com >> "%SystemRoot%\System32\drivers\etc\hosts"
    echo 104.21.80.119 app.turafood.com >> "%SystemRoot%\System32\drivers\etc\hosts"
    echo 104.21.80.119 admin.turafood.com >> "%SystemRoot%\System32\drivers\etc\hosts"
    echo 104.21.80.119 rest.turafood.com >> "%SystemRoot%\System32\drivers\etc\hosts"
    echo 104.21.80.119 restaurante.turafood.com >> "%SystemRoot%\System32\drivers\etc\hosts"
    echo 104.21.80.119 demo.turafood.com >> "%SystemRoot%\System32\drivers\etc\hosts"
    echo Dominios agregados con exito a hosts.
) else (
    echo Los dominios ya estaban presentes en hosts.
)

echo 3. Vaciando cache de DNS de Windows...
ipconfig /flushdns

echo.
echo ======================================================
echo   LISTO! Conectividad reparada con exito al 100%%.
echo   Ahora puedes abrir turafood.com en cualquier navegador.
echo ======================================================
pause
