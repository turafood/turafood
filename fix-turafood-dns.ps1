# Fix Wi-Fi DNS and Hosts permanently
Write-Host "Configurando DNS de Cloudflare en adaptador Wi-Fi..." -ForegroundColor Cyan
netsh interface ipv4 set dnsservers name="Wi-Fi" source=static address=1.1.1.1 register=none validate=no
netsh interface ipv4 add dnsservers name="Wi-Fi" address=8.8.8.8 index=2 validate=no

Write-Host "Configurando DNS IPv6 en adaptador Wi-Fi..." -ForegroundColor Cyan
netsh interface ipv6 set dnsservers name="Wi-Fi" source=static address=2606:4700:4700::1111 register=none validate=no

Write-Host "Agregando rutas a hosts..." -ForegroundColor Cyan
$hostsPath = "$env:SystemRoot\System32\drivers\etc\hosts"
$content = Get-Content $hostsPath -Raw
if ($content -notmatch "turafood\.com") {
  $entries = @"

# TuraFood Cloudflare Direct Routing
104.21.80.119 turafood.com
104.21.80.119 www.turafood.com
104.21.80.119 app.turafood.com
104.21.80.119 admin.turafood.com
104.21.80.119 rest.turafood.com
104.21.80.119 restaurante.turafood.com
104.21.80.119 demo.turafood.com
"@
  Add-Content -Path $hostsPath -Value $entries -Encoding utf8
}

Write-Host "Limpiando cache de DNS..." -ForegroundColor Cyan
Clear-DnsClientCache
ipconfig /flushdns

Write-Host "Completado con exito!" -ForegroundColor Green
Start-Sleep -Seconds 3
