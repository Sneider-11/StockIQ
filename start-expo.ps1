Set-Location $PSScriptRoot

Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "     StockIQ Mobile - Expo Launcher" -ForegroundColor Cyan
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host " [1] LAN    - Misma red WiFi (recomendado)" -ForegroundColor Green
Write-Host " [2] Tunnel - Redes distintas / datos movil" -ForegroundColor Yellow
Write-Host " [3] Salir" -ForegroundColor Gray
Write-Host ""

$opcion = Read-Host "Elige una opcion (1/2/3)"

switch ($opcion) {
    "1" {
        Write-Host "`nIniciando en modo LAN..." -ForegroundColor Green
        Write-Host "Abre Expo Go en tu celular y escanea el QR.`n" -ForegroundColor Gray
        npx expo start --clear
    }
    "2" {
        Write-Host "`nIniciando en modo Tunnel (puede tardar ~30 seg)..." -ForegroundColor Yellow
        Write-Host "Abre Expo Go en tu celular y escanea el QR.`n" -ForegroundColor Gray
        npx expo start --tunnel --clear
    }
    default {
        Write-Host "Cancelado." -ForegroundColor Gray
    }
}
