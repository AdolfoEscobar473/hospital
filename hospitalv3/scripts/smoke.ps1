param(
  [string]$ApiBase = "http://localhost:8000/api",
  [string]$Username = "admin",
  [string]$Password = "admin123"
)

Write-Host "Smoke test sobre $ApiBase"

$loginBody = @{
  username = $Username
  password = $Password
} | ConvertTo-Json

$login = Invoke-RestMethod -Uri "$ApiBase/auth/login" -Method Post -ContentType "application/json" -Body $loginBody
$token = $login.accessToken

$headers = @{
  Authorization = "Bearer $token"
}

Invoke-RestMethod -Uri "$ApiBase/dashboard/summary" -Headers $headers | Out-Null
Invoke-RestMethod -Uri "$ApiBase/processes/statistics/" -Headers $headers | Out-Null
Invoke-RestMethod -Uri "$ApiBase/risks/statistics/" -Headers $headers | Out-Null
Invoke-RestMethod -Uri "$ApiBase/commitments/reminders/" -Headers $headers | Out-Null

Write-Host "Smoke test finalizado OK"
