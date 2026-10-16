# Limpia de produccion las cuentas anonimas de prueba (negocios, menus y pedidos).
# 1) Respalda en JSON lo que se va a borrar. 2) Ejecuta limpiar-datos-de-prueba.sql.
# NO toca cuentas con correo (seed, admin, cuentas reales): solo auth.users.is_anonymous.
$ErrorActionPreference = 'Continue'
$env:DO_NOT_TRACK = '1'
Set-Location $PSScriptRoot

$dir = Join-Path $PSScriptRoot 'respaldos'   # carpeta ignorada por git (ver .gitignore)
New-Item -ItemType Directory -Force $dir | Out-Null
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'

function Query($sql) {
  for ($i = 1; $i -le 5; $i++) {
    $all = & supabase db query --linked $sql -o json 2>&1 | ForEach-Object { $_.ToString() }
    $t = ($all | Where-Object { $_ -notmatch 'PostHog' }) -join "`n"
    if ($t -match 'Failed to connect|TLS handshake|timeout|ConnectTempRole') { Start-Sleep 10; continue }
    return $t
  }
  return $null
}

$tablas = @{
  'business_profiles' = "select b.* from business_profiles b join auth.users u on u.id=b.id where u.is_anonymous";
  'products'          = "select p.* from products p join auth.users u on u.id=p.business_id where u.is_anonymous";
  'orders'            = "select o.* from orders o where o.customer_id in (select id from auth.users where is_anonymous) or o.business_id in (select id from auth.users where is_anonymous)";
  'auth_users_anon'   = "select id, created_at, last_sign_in_at from auth.users where is_anonymous";
}
foreach ($k in $tablas.Keys) {
  $r = Query $tablas[$k]
  if (-not $r -or $r -match '"_tag":"Error"') { Write-Host "No se pudo respaldar $k. Detenido, no se borro nada." -ForegroundColor Red; exit 1 }
  $f = Join-Path $dir "$stamp-$k.json"
  Set-Content -Path $f -Value $r -Encoding UTF8
  Write-Host ("Respaldo {0}: {1:N0} KB" -f $k, ((Get-Item $f).Length / 1KB)) -ForegroundColor Green
}

Write-Host "`nEjecutando limpieza..." -ForegroundColor Cyan
for ($i = 1; $i -le 5; $i++) {
  $all = & supabase db query --linked -f (Join-Path $PSScriptRoot 'supabase\limpiar-datos-de-prueba.sql') 2>&1 | ForEach-Object { $_.ToString() }
  $t = ($all | Where-Object { $_ -notmatch 'PostHog' }) -join ' '
  if ($t -match 'Failed to connect|TLS handshake|timeout|ConnectTempRole') { Start-Sleep 10; continue }
  break
}
if ($t -match '"_tag":"Error"|ERROR:|SQLSTATE') { Write-Host "FALLO: $t" -ForegroundColor Red; exit 1 }
Write-Host ($t -replace '\s+', ' ')
