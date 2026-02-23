# Direct Pinata API test to debug authentication

$apiKey = "829e656b5b1cdaf44541"
$secretKey = "85b6a1a78e3a1731e1599f6f806947eb87cfdd2ebc90507a20056081ce18301f"
$jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJiZGY0ZWFmMi1jOWYzLTQ2YzItYWEzNS05YjU0ZjRlODczNTgiLCJlbWFpbCI6Im5zNDQ2MDc0M0BnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwic2NvcGVkS2V5IjoiODI5ZTY1NmI1YjFjZGFmNDQ1NDEiLCJzY29wZWRLZXlTZWNyZXQiOiI4NWI2YTFhNzhlM2ExNzMxZTE1OTlmNmY4MDY5NDdlYjg3Y2ZkZDJlYmM5MDUwN2EyMDA1NjA4MWNlMTgzMDFmIiwiZXhwIjoxODAzMzY2NzE4fQ.a4NLkOlrjHeB3JebJWxVaQx_LURGUVEG2Pl6I-Oyy3M"

Write-Host "Testing Pinata API with API Key/Secret..." -ForegroundColor Cyan

$testData = @{
    pinataContent = @{
        name = "test"
        description = "Direct API test"
    } | ConvertTo-Json -Compress
    pinataMetadata = @{
        name = "test-metadata"
    }
} | ConvertTo-Json -Depth 10 -Compress

try {
    $headers = @{
        "Content-Type" = "application/json"
        "pinata_api_key" = $apiKey
        "pinata_secret_api_key" = $secretKey
    }
    
    $response = Invoke-RestMethod -Uri "https://api.pinata.cloud/pinning/pinJSONToIPFS" -Method Post -Body $testData -Headers $headers
    Write-Host "Success with API Key!" -ForegroundColor Green
    Write-Host "IPFS Hash: $($response.IpfsHash)" -ForegroundColor Yellow
}
catch {
    Write-Host "Failed with API Key: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.ErrorDetails.Message)" -ForegroundColor Red
}

Write-Host "`nTesting Pinata API with JWT..." -ForegroundColor Cyan

$testData = @{
    pinataContent = @{
        name = "test"
        description = "Direct API test with JWT"
    } | ConvertTo-Json -Compress
    pinataMetadata = @{
        name = "test-metadata-jwt"
    }
} | ConvertTo-Json -Depth 10 -Compress

try {
    $headers = @{
        "Content-Type" = "application/json"
        "Authorization" = "Bearer $jwt"
    }
    
    $response = Invoke-RestMethod -Uri "https://api.pinata.cloud/pinning/pinJSONToIPFS" -Method Post -Body $testData -Headers $headers
    Write-Host "Success with JWT!" -ForegroundColor Green
    Write-Host "IPFS Hash: $($response.IpfsHash)" -ForegroundColor Yellow
}
catch {
    Write-Host "Failed with JWT: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.ErrorDetails.Message)" -ForegroundColor Red
}

Write-Host "`n=== Pinata API Test Complete ===" -ForegroundColor Cyan
