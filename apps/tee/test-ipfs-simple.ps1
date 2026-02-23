$ErrorActionPreference = "Stop"

Write-Host "=== SIMPLE IPFS UPLOAD TEST ===" -ForegroundColor Cyan
Write-Host ""

# Test IPFS health check
Write-Host "Step 1: Checking IPFS service status..." -ForegroundColor Yellow

try {
    $healthResponse = Invoke-RestMethod -Uri "http://localhost:3001/health/contract" -Method Get
    Write-Host $healthResponse.Content -ForegroundColor Green
    
    $healthData = $healthResponse.Content | ConvertFrom-Json
    Write-Host "  IPFS Status: $($healthData.ipfs)" -ForegroundColor Cyan
    
    if ($healthData.ipfs -eq "configured") {
        Write-Host "  IPFS is ready for testing!" -ForegroundColor Green
    } else {
        Write-Host "  IPFS not configured - test will use mock mode" -ForegroundColor Yellow
    }
}
catch {
    Write-Host "  Health check failed: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== TEST COMPLETE ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Status: IPFS service is $($healthData.ipfs)" -ForegroundColor $(if($healthData.ipfs -eq "configured"){"Green"}else{"Yellow"})
