@echo off
cd /d "%~dp0"
cls
echo ============================================
echo     StockIQ Mobile - Expo Launcher
echo ============================================
echo.
echo  [1] LAN   - Misma red WiFi (recomendado)
echo  [2] Tunnel - Redes distintas / datos movil
echo  [3] Salir
echo.
set /p opcion="Elige una opcion (1/2/3): "

if "%opcion%"=="1" (
  echo.
  echo Iniciando en modo LAN...
  echo Abre Expo Go en tu celular y escanea el QR.
  echo.
  npx expo start --clear
  goto fin
)

if "%opcion%"=="2" (
  echo.
  echo Iniciando en modo Tunnel (puede tardar ~30 seg)...
  echo Abre Expo Go en tu celular y escanea el QR.
  echo.
  npx expo start --tunnel --clear
  goto fin
)

:fin
pause
