# ====================================================================
# TURAFOOD — Publica el sistema de correos en producción (Supabase)
#
#   powershell -ExecutionPolicy Bypass -File turafood-supabase\PUBLICAR-CORREOS.ps1
#
# Hace, en orden (se puede repetir sin riesgo):
#   1. Comprueba que el CLI de Supabase tenga acceso al proyecto de TuraFood.
#   2. Aplica la migración de la secuencia de correos.
#   3. Despliega las funciones de borde: secuencia-emails y send-order-email.
#   4. Configura Auth para que el código de verificación salga POR CORREO, desde
#      pedidos@turafood.com con Resend (SMTP), con las plantillas de TuraFood.
#
# Necesita: .resend.local.txt (llave de Resend) en esta carpeta, y haber iniciado
# sesión con LOGIN-CLI-TURAFOOD.bat (cuenta turafood.com@gmail.com).
# No imprime ninguna llave.
# ====================================================================
$ErrorActionPreference = 'Continue'
$env:DO_NOT_TRACK = '1'
$env:SUPABASE_TELEMETRY_DISABLED = '1'
$ref = 'btaddjjzpvyqltkchqki'
$aqui = $PSScriptRoot
Set-Location $aqui

function Paso($t) { Write-Host "`n== $t" -ForegroundColor Cyan }

# ---------------------------------------------------------------- 1. acceso
Paso '1. Acceso al proyecto'
$proy = (& supabase projects list -o json 2>$null | Out-String) | ConvertFrom-Json
if (-not ($proy | Where-Object { $_.id -eq $ref })) {
  Write-Host 'El CLI de Supabase no ve el proyecto de TuraFood. Ejecuta LOGIN-CLI-TURAFOOD.bat y vuelve a correr este script.' -ForegroundColor Red
  exit 1
}
Write-Host 'OK: el proyecto de TuraFood es visible'

# ---------------------------------------------------------------- 2. migración
Paso '2. Migración (secuencia de correos)'
$f = Get-ChildItem supabase\migrations -Filter '20260827000000*.sql' | Select-Object -First 1
$ok = $false
for ($i = 1; $i -le 4 -and -not $ok; $i++) {
  $o = & supabase db query --linked -f $f.FullName 2>&1 | ForEach-Object { $_.ToString() }
  $t = ($o | Where-Object { $_ -notmatch 'PostHog' }) -join ' '
  if ($t -match 'Failed to connect|TLS handshake|timeout|connection refused') { Start-Sleep 10; continue }
  if ($t -match '"_tag":"Error"|ERROR:|SQLSTATE') { Write-Host ($t -replace '\s+', ' '); Write-Host 'FALLÓ la migración' -ForegroundColor Red; exit 1 }
  $ok = $true
}
if ($ok) { & supabase migration repair --status applied 20260827000000 2>$null | Out-Null; Write-Host 'OK: migración aplicada' } else { Write-Host 'Sin conexión para aplicar la migración' -ForegroundColor Red; exit 1 }

# ---------------------------------------------------------------- 3. funciones
Paso '3. Funciones de borde'
foreach ($fn in 'secuencia-emails', 'send-order-email') {
  $ok = $false
  for ($i = 1; $i -le 5 -and -not $ok; $i++) {
    $o = & supabase functions deploy $fn --use-api --project-ref $ref 2>&1 | Out-String
    if ($o -match 'Deployed Functions') { $ok = $true } else { Start-Sleep 10 }
  }
  Write-Host ("{0}: {1}" -f $fn, $(if ($ok) { 'DESPLEGADA' } else { 'FALLÓ' }))
}

# ---------------------------------------------------------------- 4. Auth por correo
Paso '4. Auth: código por correo con Resend'
$llave = (Get-Content (Join-Path $aqui '.resend.local.txt') -Raw).Trim()
node scripts\generar-plantillas-auth.mjs 2>$null | Out-Null
$tp = Join-Path $aqui 'supabase\templates'
$asuntos = Get-Content "$tp\plantillas-auth.json" -Raw | ConvertFrom-Json
$leer = { param($n) [IO.File]::ReadAllText((Join-Path $tp "otp_$n.html"), [Text.Encoding]::UTF8) }
$cuerpo = [ordered]@{
  smtp_host = 'smtp.resend.com'; smtp_port = '465'; smtp_user = 'resend'; smtp_pass = $llave
  smtp_admin_email = 'pedidos@turafood.com'; smtp_sender_name = 'TuraFood'
  smtp_max_frequency = 30
  rate_limit_email_sent = 300
  mailer_otp_length = 6; mailer_otp_exp = 600
  mailer_autoconfirm = $false
  mailer_subjects_confirmation = $asuntos.confirmacion;   mailer_templates_confirmation_content = (& $leer 'confirmacion')
  mailer_subjects_magic_link = $asuntos.magic_link;       mailer_templates_magic_link_content = (& $leer 'magic_link')
  mailer_subjects_email_change = $asuntos.cambio_correo;  mailer_templates_email_change_content = (& $leer 'cambio_correo')
  mailer_subjects_recovery = $asuntos.recuperacion;       mailer_templates_recovery_content = (& $leer 'recuperacion')
  mailer_subjects_invite = $asuntos.invitacion;           mailer_templates_invite_content = (& $leer 'invitacion')
  mailer_subjects_reauthentication = $asuntos.reautenticacion; mailer_templates_reauthentication_content = (& $leer 'reautenticacion')
}
$h = @{ Authorization = 'Bearer ' + (Get-Content (Join-Path $env:USERPROFILE '.supabase\access-token') -Raw).Trim(); 'Content-Type' = 'application/json; charset=utf-8' }
$url = "https://api.supabase.com/v1/projects/$ref/config/auth"
try {
  $bytes = [Text.Encoding]::UTF8.GetBytes(($cuerpo | ConvertTo-Json -Depth 4))
  Invoke-RestMethod -Uri $url -Method Patch -Headers $h -Body $bytes | Out-Null
  Write-Host 'OK: SMTP de Resend y plantillas aplicados'
} catch { Write-Host ('FALLÓ la configuración de Auth: ' + [int]$_.Exception.Response.StatusCode + ' ' + $_.ErrorDetails.Message) -ForegroundColor Red; exit 1 }

$c = Invoke-RestMethod -Uri $url -Headers $h
'smtp_host={0} · remitente={1} · otp={2} dígitos / {3}s · limite correos/h={4}' -f $c.smtp_host, $c.smtp_admin_email, $c.mailer_otp_length, $c.mailer_otp_exp, $c.rate_limit_email_sent
# ---------------------------------------------------------------- 5. limpieza del catálogo
Paso '5. Catálogo público: ocultar negocios de prueba de la auditoría'
$o = & supabase db query --linked -f (Join-Path $aqui 'scripts\ocultar-negocios-de-prueba.sql') 2>&1 | Out-String
if ($o -match 'ERROR|"_tag":"Error"') { Write-Host 'No se pudo (revisar a mano)' -ForegroundColor Yellow } else { Write-Host 'OK' }

Write-Host "`nListo." -ForegroundColor Green
