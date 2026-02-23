$ErrorActionPreference = "Stop"

Write-Host "=== IPFS + CONTRACT INTEGRATION TEST ===" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create test session
Write-Host "Step 1: Creating test session..." -ForegroundColor Yellow

$createPayload = @{
    user_address = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"
    project_id = "react-card"
}

$createJson = $createPayload | ConvertTo-Json -Compress

Write-Host "Creating session for user: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266"

try {
    $createResponse = Invoke-RestMethod -Uri "http://localhost:3001/session/create" `
        -Method Post `
        -ContentType "application/json" `
        -Body $createJson
    
    Write-Host "Session created: $($createResponse.Content)" -ForegroundColor Green
    
    $sessionData = $createResponse.Content | ConvertFrom-Json
    $sessionId = $sessionData.session_id
    
    Write-Host "Session ID: $sessionId" -ForegroundColor Cyan
    Write-Host ""
}
catch {
    Write-Host "Failed to create session: $_" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    exit 1
}

# Step 2: Submit milestone scores (simulating completion)
Write-Host "Step 2: Submitting milestone scores..." -ForegroundColor Yellow

$milestone1 = @{
    sessionId = $sessionId
    milestoneId = 1
    code = "export const Card = () => { return <div>Hello</div>; };"
    feedback = ""
}

$milestone1Json = $milestone1 | ConvertTo-Json -Compress

try {
    $m1Response = Invoke-RestMethod -Uri "http://localhost:3001/verify-code" `
        -Method Post `
        -ContentType "application/json" `
        -Body $milestone1Json
    
    Write-Host "Milestone 1 submitted: Score $($m1Response.Content)" -ForegroundColor Green
}
catch {
    Write-Host "Milestone 1 failed: $_" -ForegroundColor Red
}

# Submit remaining milestones (simulate 80, 85, 90, 88, 87)
$scores = @(80, 85, 90, 88, 87)

foreach ($score in $scores) {
    $i = $scores.IndexOf($score) + 2
    $milestone = @{
        sessionId = $sessionId
        milestoneId = $i
        code = "export const Card = () => { return <div>Milestone $i</div>; };"
        feedback = ""
    }
    
    $milestoneJson = $milestone | ConvertTo-Json -Compress
    
    try {
        $response = Invoke-RestMethod -Uri "http://localhost:3001/verify-code" `
            -Method Post `
            -ContentType "application/json" `
            -Body $milestoneJson
        Write-Host "Milestone $i submitted: Score $score" -ForegroundColor Green
    } catch {
        Write-Host "Milestone $i failed: $_" -ForegroundColor Red
    }
}

Write-Host ""

# Step 3: Test IPFS upload
Write-Host "Step 3: Testing IPFS upload with Pinata..." -ForegroundColor Yellow

$ipfsPayload = @{
    sessionId = $sessionId
}

$ipfsJson = $ipfsPayload | ConvertTo-Json -Compress

try {
    $ipfsResponse = Invoke-RestMethod -Uri "http://localhost:3001/contract/submit-attestation" `
        -Method Post `
        -ContentType "application/json" `
        -Body $ipfsJson
    
    Write-Host "IPFS Upload Response:" -ForegroundColor Green
    Write-Host $ipfsResponse.Content -ForegroundColor White
    Write-Host ""
    
    $responseData = $ipfsResponse.Content | ConvertFrom-Json
    
    if ($responseData.success -eq $true) {
        Write-Host "SUCCESS! IPFS hash obtained: $($responseData.ipfsHash)" -ForegroundColor Green
        Write-Host "Transaction hash: $($responseData.txHash)" -ForegroundColor Cyan
        Write-Host "Final score: $($responseData.finalScore)" -ForegroundColor Cyan
        
        # Test IPFS retrieval
        Write-Host ""
        Write-Host "Step 4: Verifying IPFS gateway access..." -ForegroundColor Yellow
        
        if ($responseData.ipfsHash) {
            $ipfsUrl = "https://gateway.pinata.cloud/ipfs/$($responseData.ipfsHash)"
            Write-Host "IPFS Gateway URL: $ipfsUrl" -ForegroundColor Cyan
            
            Write-Host "Attempting to retrieve from gateway..." -ForegroundColor Yellow
            try {
                $gatewayResponse = Invoke-WebRequest -Uri $ipfsUrl -UseBasicParsing -TimeoutSec 10
                Write-Host "Gateway accessible: YES" -ForegroundColor Green
                Write-Host "Content preview: $($gatewayResponse.Content.Substring(0, [Math]::Min(200, $gatewayResponse.Content.Length)))..." -ForegroundColor Gray
            } catch {
                Write-Host "Gateway retrieval failed: $_" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "FAILED: $($responseData.error)" -ForegroundColor Red
    }
}
catch {
    Write-Host "IPFS upload failed: $_" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=== TEST COMPLETE ===" -ForegroundColor Cyan
