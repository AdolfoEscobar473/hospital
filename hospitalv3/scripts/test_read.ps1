$content = Get-Content "deploy-secrets.env"
foreach ($line in $content) {
    Write-Host "Line: '$line'"
    if ($line -match '^\s*([^#=]+)=(.*)$') {
        Write-Host "MATCH: $($matches[1]) = $($matches[2])"
    }
    else {
        Write-Host "NO MATCH"
    }
}
