$payload = @{
    sessionId = "test-ipfs-final"
    user = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    skill = "react-card"
    score = 85
    milestoneScores = @(80, 85, 90, 88, 87)
}

$json = $payload | ConvertTo-Json -Depth 10 -Compress

Write-Host "Sending IPFS upload test request..."
Write-Host "Payload: $json"

try {
    $headers = @{
        "Content-Type" = "application/json"
    }
    
    $response = Invoke-RestMethod -Uri "http://localhost:3001/contract/submit-attestation" `
        -Method Post `
        -Headers $headers `
        -Body $json

    Write-Host "Response:"
    Write-Host $response.Content
}
catch {
    Write-Host "Error: $_"
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)"
}
