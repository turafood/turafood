@echo off
title Abriendo TuraFood en Produccion
echo ===================================================
echo   Abriendo aplicaciones de TuraFood en Cloudflare
echo ===================================================
echo.

set RULES="MAP turafood.com 104.21.80.119, MAP *.turafood.com 104.21.80.119"

if exist "C:\Program Files\Google\Chrome\Application\chrome.exe" (
    echo Iniciando Google Chrome con resolucion directa Cloudflare...
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" --host-resolver-rules=%RULES% "https://turafood.com" "https://app.turafood.com" "https://admin.turafood.com" "https://rest.turafood.com" "https://demo.turafood.com"
) else if exist "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" (
    echo Iniciando Microsoft Edge con resolucion directa Cloudflare...
    start "" "C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe" --host-resolver-rules=%RULES% "https://turafood.com" "https://app.turafood.com" "https://admin.turafood.com" "https://rest.turafood.com" "https://demo.turafood.com"
) else (
    start https://turafood-cliente.turafood.workers.dev
    start https://turafood-app.turafood.workers.dev
    start https://turafood-admin.turafood.workers.dev
)

echo Listo! Tus aplicaciones estan cargando en el navegador.
