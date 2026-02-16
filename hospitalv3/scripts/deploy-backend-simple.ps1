# Script simplificado de deploy directo usando az webapp deployment
$ErrorActionPreference = "Stop"

$RG = "rg-hospital-prod"
$WEBAPP = "hospital-api-carlosdev"

Write-Host "Creando zip del backend..."
$BackendPath = "..\backend"
$ZipPath = "backend-deploy.zip"

# Eliminar zip anterior si existe
if (Test-Path $ZipPath) {
    Remove-Item $ZipPath
}

# Crear zip directamente 
Compress-Archive -Path "$BackendPath\*" -DestinationPath $ZipPath -CompressionLevel Fastest

Write-Host "Desplegando a Azure Web App..."
az webapp deployment source config-zip --resource-group $RG --name $WEBAPP --src $ZipPath

Write-Host "Despliegue completado!"
Write-Host "API disponible en: https://$WEBAPP.azurewebsites.net"
