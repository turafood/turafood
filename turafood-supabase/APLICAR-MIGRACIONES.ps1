# Aplica a produccion (btaddjjzpvyqltkchqki) las migraciones que faltan,
# una por una. Cada archivo corre en su propia transaccion: si falla,
# no deja nada a medias y el script se detiene.
# Respaldo de definiciones previo guardado en la carpeta scratchpad de la sesion.
$ErrorActionPreference = 'Continue'
$env:DO_NOT_TRACK = '1'
$env:SUPABASE_TELEMETRY_DISABLED = '1'
Set-Location $PSScriptRoot

$files = Get-ChildItem supabase\migrations -Filter *.sql |
  Where-Object { $_.Name -ge '20260817000006' } | Sort-Object Name

foreach ($f in $files) {
  $ver = ($f.Name -split '_')[0]

  # Ya aplicada antes: se omite (el script se puede volver a correr sin riesgo).
  if ($ver -lt '20260820') { continue }

  # 20260820000000: ya estaba aplicada a mano en produccion (verificado: 4 politicas,
  #   columna source_channel y realtime). No es idempotente, se registra sin ejecutar.
  # 20260820000001: crea el trigger roto que 20260822 elimina. Se registra sin ejecutar.
  if ($ver -eq '20260820000000' -or $ver -eq '20260820000001') {
    for ($i = 1; $i -le 4; $i++) {
      $r = & supabase migration repair --status applied $ver 2>&1 | Out-String
      if ($r -match 'Repaired|applied') { break }
      Start-Sleep -Seconds 6
    }
    Write-Host "$ver  REGISTRADA sin ejecutar" -ForegroundColor Yellow
    continue
  }

  # Reintenta solo si la conexion a la base falla (red inestable). Un error
  # de SQL no se reintenta: la migracion es transaccional y se reporta.
  for ($intento = 1; $intento -le 5; $intento++) {
    $all = & supabase db query --linked -f $f.FullName 2>&1 | ForEach-Object { $_.ToString() }
    $code = $LASTEXITCODE
    # El CLI a veces sale con error solo porque falla su telemetria (PostHog)
    # aunque el SQL ya se ejecuto. Se ignora esa linea.
    $texto = ($all | Where-Object { $_ -notmatch 'PostHog' }) -join ' '
    if ($texto -match 'Failed to connect|TLS handshake|timeout|ConnectTempRole|connection refused') {
      Write-Host "$ver  sin conexion (intento $intento/5), reintento en 10s..." -ForegroundColor DarkYellow
      Start-Sleep -Seconds 10
      continue
    }
    break
  }
  $falloReal = ($texto -match '"_tag":"Error"') -or ($texto -match 'ERROR:') -or ($texto -match 'SQLSTATE') -or ($code -ne 0 -and $texto -notmatch '"rows"')
  if ($falloReal) {
    Write-Host "$ver  FALLO (exit $code)" -ForegroundColor Red
    ($all -join ' ') -replace '\s+', ' ' | Write-Host
    Write-Host "Detenido. No se aplico nada mas." -ForegroundColor Red
    exit 1
  }
  supabase migration repair --status applied $ver 2>$null | Out-Null
  Write-Host "$ver  OK" -ForegroundColor Green
}

Write-Host "`nListo. Estado final:" -ForegroundColor Cyan
supabase migration list --linked 2>$null | Select-String 'migrations' | Out-Null
supabase db push --dry-run 2>$null | Select-Object -Last 4
