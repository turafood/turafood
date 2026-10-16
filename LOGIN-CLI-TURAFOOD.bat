@echo off
title Autenticacion TuraFood (Cloudflare y Supabase)
color 0B
echo ======================================================
echo    AUTENTICACION TURAFOOD: turafood.com@gmail.com
echo ======================================================
echo.
echo [1/2] Iniciando login en Cloudflare (Wrangler)...
echo Por favor autoriza en el navegador con la cuenta turafood.com@gmail.com.
echo.
call npx wrangler login
echo.
echo ======================================================
echo [2/2] Iniciando login en Supabase CLI...
echo Proyecto objetivo: btaddjjzpvyqltkchqki
echo.
call supabase login
echo.
echo ======================================================
echo Verificando estado final...
echo.
echo --- Cloudflare ---
call npx wrangler whoami
echo.
echo --- Supabase ---
call supabase projects list
echo.
echo ======================================================
echo Proceso completado.
pause
