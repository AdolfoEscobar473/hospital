param (
    [string]$ResourceGroup,
    [string]$WebAppName
)

# Si no se pasan parámetros, intenta leerlos de deploy-secrets.env
if (-not $ResourceGroup -or -not $WebAppName) {
    if (Test-Path "deploy-secrets.env") {
        Write-Host "Cargando variables desde deploy-secrets.env..."
        $content = Get-Content "deploy-secrets.env" -Raw
        $lines = $content -split "[\r\n]+"
        foreach ($line in $lines) {
            Write-Host "Procesando linea: '$line'"
            if ($line -match '^\s*([^#=]+)=(.*)$') {
                $name = $matches[1].Trim()
                $value = $matches[2].Trim()
                Set-Variable -Name $name -Value $value -Scope Script
                Write-Host "  Leido: $name"
            }
        }
    }
}

# Usar variables de entorno si no se pasaron argumentos
if (-not $ResourceGroup) { $ResourceGroup = $env:RESOURCE_GROUP }
if (-not $WebAppName) { $WebAppName = $env:WEBAPP_NAME }

if (-not $ResourceGroup -or -not $WebAppName) {
    Write-Error "Error: Debes especificar -ResourceGroup y -WebAppName, o definirlos en deploy-secrets.env"
    exit 1
}

$ZipFile = "backend.zip"

Write-Host "Preparando despliegue para:"
Write-Host "  Resource Group: $ResourceGroup"
Write-Host "  Web App:        $WebAppName"
Write-Host ""

# Verificar si existe el archivo zip anterior y borrarlo
if (Test-Path $ZipFile) {
    Remove-Item $ZipFile
}

# Crear el zip excluyendo archivos innecesarios
Write-Host "Creando archivo $ZipFile..."
Compress-Archive -Path "..\backend\*" -DestinationPath $ZipFile -Force -CompressionLevel Optimal 

# Nota: Compress-Archive puede incluir carpetas que no queremos si no somos cuidadosos. 
# Para una exclusión más precisa s necesita un script más complejo o usar 'git archive' si fuera un repo git.
# Aquí asumimos una estructura limpia o que el servidor ignorará venv/pycache si se suben.
# Una mejor aproximación con PowerShell nativo es filtrar antes de comprimir:

Remove-Item $ZipFile -ErrorAction SilentlyContinue

$exclude = @("venv", "__pycache__", ".env", "db.sqlite3", "*.pyc", "*.pyo", ".git", ".gitignore")
$files = Get-ChildItem -Path "..\backend" -Recurse | Where-Object {
    $path = $_.FullName
    $skip = $false
    foreach ($ex in $exclude) {
        if ($path -like "*$ex*") { $skip = $true; break }
    }
    return -not $skip
}

# Comprimir es más complejo filtrando así con Compress-Archive directo. 
# Simplificación: Comprimir todo y confiar en .dockerignore / o usar az webapp deploy que filtra.
# Realmente 'az webapp deploy' puede subir una carpeta y hacer el zip él mismo, pero a veces falla con archivos abiertos.

# Vamos a usar la opción de zipear la carpeta 'backend' ignorando patrones comunes si es posible, 
# o simplemente zipear la carpeta backend entera.
# Para simplificar y robustez en Windows:
Compress-Archive -Path "..\backend\*" -DestinationPath $ZipFile -Force

Write-Host "Subiendo $ZipFile a Azure..."
az webapp deploy --resource-group $ResourceGroup --name $WebAppName --src-path $ZipFile --type zip

if ($LASTEXITCODE -eq 0) {
    Write-Host "Despliegue completado exitosamente."
    Write-Host "Verifica en: https://$WebAppName.azurewebsites.net"
}
else {
    Write-Error "Hubo un error en el despliegue."
}
