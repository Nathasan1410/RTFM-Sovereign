# Test JWT token loading from .env

$envPath = ".env"
$envContent = Get-Content $envPath -Raw

Write-Host "Raw JWT from .env:" -ForegroundColor Cyan
$jwtMatch = [regex]::Match($envContent, "PINATA_JWT=(.+)")
if ($jwtMatch) {
    $jwt = $jwtMatch.Groups[1].Value
    Write-Host "JWT Length: $($jwt.Length)" -ForegroundColor Yellow
    Write-Host "JWT Starts with: $($jwt.Substring(0, 50))..." -ForegroundColor Yellow
    Write-Host "JWT Ends with: ...$($jwt.Substring($jwt.Length - 50))" -ForegroundColor Yellow
    
    # Check for newlines
    if ($jwt -match "`r`n") {
        Write-Host "WARNING: JWT contains newlines!" -ForegroundColor Red
    } else {
        Write-Host "JWT does not contain newlines" -ForegroundColor Green
    }
    
    # Test token format
    $parts = $jwt.Split('.')
    Write-Host "JWT Parts Count: $($parts.Length)" -ForegroundColor Yellow
    if ($parts.Length -eq 3) {
        Write-Host "JWT format is correct (3 parts)" -ForegroundColor Green
    } else {
        Write-Host "JWT format is incorrect (expected 3 parts)" -ForegroundColor Red
    }
} else {
    Write-Host "JWT not found in .env" -ForegroundColor Red
}

Write-Host "`n=== JWT Test Complete ===" -ForegroundColor Cyan
