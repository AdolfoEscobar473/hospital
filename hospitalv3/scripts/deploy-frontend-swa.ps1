# Script para desplegar frontend usando el token de Static Web App
# Este script sube el contenido compilado a Azure Static Web Apps

$ErrorActionPreference = "Stop"

$DEPLOYMENT_TOKEN = "a44791c5ce3a31fd759e78e6c70f5eabe6f00f110801d56"
$DIST_PATH = "..\frontend\dist"

Write-Host "Verificando directorio dist..."
if (!(Test-Path $DIST_PATH)) {
    Write-Error "No se encontró el directorio dist. Ejecute 'npm run build' primero."
    exit 1
}

Write-Host "Instalando/Verificando @azure/static-web-apps-cli..."
npm list -g @azure/static-web-apps-cli *> $null
if ($LASTEXITCODE -ne 0) {
    Write-Host "Instalando @azure/static-web-apps-cli..."
    npm install -g @azure/static-web-apps-cli
}

Write-Host "Desplegando a Azure Static Web App..."
Set-Location $DIST_PATH

# Intentar deployment con verbose para ver errores
swa deploy . --deployment-token $DEPLOYMENT_TOKEN --env production --verbose

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ Deployment completado exitosamente!"
    Write-Host "✓ URL: https://salmon-desert-01d56c70f.1.azurestaticapps.net"
    Write-Host ""
    Write-Host "Nota: Puede tardar unos minutos en propagarse. Espere 2-3 minutos y recargue la página."
}
else {
    Write-Error "Error en el deployment. Código de salida: $LASTEXITCODE"
}
