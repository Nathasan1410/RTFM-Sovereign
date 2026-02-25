$apiKey = "f59d712d954fa8138789"
$secretKey = "77ad7eb824848831bc4f5d37992b0f4b771ba269ec97cc5bb204a396efdda427"

Write-Host "Testing Pinata API with new credentials..." -ForegroundColor Cyan

$testData = @{
    pinataContent = @{
        name = "test"
        description = "Direct API test with new credentials"
    } | ConvertTo-Json -Compress
    pinataMetadata = @{
        name = "test-metadata-new"
    }
} | ConvertTo-Json -Depth 10 -Compress

try {
    $headers = @{
        "Content-Type" = "application/json"
        "pinata_api_key" = $apiKey
        "pinata_secret_api_key" = $secretKey
    }
    
    $response = Invoke-RestMethod -Uri "https://api.pinata.cloud/pinning/pinJSONToIPFS" -Method Post -Body $testData -Headers $headers
    Write-Host "Success with new API Key!" -ForegroundColor Green
    Write-Host "IPFS Hash: $($response.IpfsHash)" -ForegroundColor Yellow
}
catch {
    Write-Host "Failed with new API Key: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.ErrorDetails.Message)" -ForegroundColor Red
}

Write-Host "`n=== Pinata API Test Complete ===" -ForegroundColor Cyan
