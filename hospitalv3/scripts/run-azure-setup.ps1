# Crea los recursos en Azure (Resource Group, Plan, Web App, App Settings) y registra la clave en deploy-secrets.env.
# Requisito: az login y una suscripcion activa (az account set -s <subscription-id>).
# Uso: .\run-azure-setup.ps1

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$secretsFile = Join-Path $scriptDir "deploy-secrets.env"

if (-not (Test-Path $secretsFile)) {
    Write-Host "No existe deploy-secrets.env. Copia deploy-secrets.env.example a deploy-secrets.env y rellena DJANGO_SECRET_KEY y nombres."
    exit 1
}

$vars = @{}
Get-Content $secretsFile | Where-Object { $_ -match '^\s*([A-Za-z_0-9]+)=(.*)$' } | ForEach-Object {
    $vars[$matches[1]] = $matches[2].Trim()
}
$RG = $vars["RESOURCE_GROUP"]
$LOC = $vars["LOCATION"]
$PLAN = $vars["PLAN_NAME"]
$WEBAPP = $vars["WEBAPP_NAME"]
$SECRET = $vars["DJANGO_SECRET_KEY"]
$SubId = $vars["SUBSCRIPTION_ID"]
if (-not $RG -or -not $WEBAPP -or -not $SECRET) {
    Write-Error "Faltan RESOURCE_GROUP, WEBAPP_NAME o DJANGO_SECRET_KEY en deploy-secrets.env"
    exit 1
}

if ($SubId) {
    Write-Host "Usando suscripcion: $SubId"
    az account set -s $SubId
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Inicia sesion con la cuenta que tenga esta suscripcion: az login"
        exit 1
    }
}

Write-Host "Creando Resource Group: $RG"
az group create --name $RG --location $LOC

Write-Host "Creando App Service plan: $PLAN"
az appservice plan create --name $PLAN --resource-group $RG --location $LOC --is-linux --sku B1

Write-Host "Creando Web App: $WEBAPP"
az webapp create --resource-group $RG --plan $PLAN --name $WEBAPP --runtime "PYTHON:3.10"

Write-Host "Configurando startup y app settings"
az webapp config set --resource-group $RG --name $WEBAPP --startup-file "bash startup.sh"
az webapp config appsettings set --resource-group $RG --name $WEBAPP --settings `
  DJANGO_SECRET_KEY="$SECRET" `
  DJANGO_DEBUG="false" `
  DJANGO_ALLOWED_HOSTS="${WEBAPP}.azurewebsites.net" `
  USE_SQLITE="true" `
  CORS_ALLOWED_ORIGINS="https://placeholder.azurestaticapps.net" `
  CSRF_TRUSTED_ORIGINS="https://placeholder.azurestaticapps.net"

Write-Host "Listo. API: https://${WEBAPP}.azurewebsites.net/api"
Write-Host "Siguiente: ejecuta deploy-backend.ps1 para subir el codigo."
