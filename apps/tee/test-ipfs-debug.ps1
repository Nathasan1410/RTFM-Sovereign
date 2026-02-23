# Debug IPFS upload issue
# Test the exact data structure being sent to Pinata

$baseUrl = "http://localhost:3001"

# Create a simple test session
Write-Host "Creating test session..." -ForegroundColor Cyan

$sessionPayload = @{
    userAddress = "0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48"
    goldenPath = @{
        project_id = [guid]::NewGuid().ToString()
        project_title = "test-project"
        learning_objectives = @("Test objective")
        tech_stack = @{
            framework = "React"
            styling = "CSS"
            language = "TypeScript"
        }
        file_structure = @(
            @{ path = "test.tsx"; purpose = "Test"; template_type = "component" }
        )
        milestones = @(
            @{
                milestone_id = 1
                title = "Test Milestone"
                description = "Test description"
                success_criteria = @("Criteria 1")
                deep_mode = $false
                estimated_time = 10
                prerequisites = @()
                rubric = @{
                    functionality_weight = 0.4
                    code_quality_weight = 0.3
                    best_practices_weight = 0.2
                    innovation_weight = 0.1
                }
                key_concepts = @("Concept 1")
            }
        )
        final_deliverable = @{
            description = "Test deliverable"
            demo_commands = @("npm test")
            verification_tests = @("Test 1")
        }
    }
} | ConvertTo-Json -Depth 10

try {
    $sessionResponse = Invoke-RestMethod -Uri "$baseUrl/session/create" -Method Post -Body $sessionPayload -ContentType "application/json"
    $sessionId = $sessionResponse.sessionId
    Write-Host "Session ID: $sessionId" -ForegroundColor Green
}
catch {
    Write-Host "Failed to create session: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Add a single simple milestone score
Write-Host "`nAdding milestone score..." -ForegroundColor Cyan

$scoresPayload = @{
    sessionId = $sessionId
    scores = @(
        @{ milestone_id = 1; score = 75; feedback = "Simple test score" }
    )
} | ConvertTo-Json

try {
    $scoresResponse = Invoke-RestMethod -Uri "$baseUrl/test/add-milestone-scores" -Method Post -Body $scoresPayload -ContentType "application/json"
    Write-Host "Score added successfully" -ForegroundColor Green
}
catch {
    Write-Host "Failed to add score: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Test IPFS upload with minimal data
Write-Host "`nTesting IPFS upload..." -ForegroundColor Cyan

$attestationPayload = @{
    sessionId = $sessionId
} | ConvertTo-Json

try {
    $attestationResponse = Invoke-RestMethod -Uri "$baseUrl/contract/submit-attestation" -Method Post -Body $attestationPayload -ContentType "application/json"
    
    if ($attestationResponse.success) {
        Write-Host "IPFS upload successful!" -ForegroundColor Green
        Write-Host "  IPFS Hash: $($attestationResponse.ipfsHash)" -ForegroundColor Yellow
        Write-Host "  Transaction Hash: $($attestationResponse.txHash)" -ForegroundColor Yellow
        Write-Host "  Final Score: $($attestationResponse.finalScore)" -ForegroundColor Yellow
    } else {
        Write-Host "IPFS upload failed: $($attestationResponse.error)" -ForegroundColor Red
    }
}
catch {
    Write-Host "IPFS upload error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.ErrorDetails.Message)" -ForegroundColor Red
}

Write-Host "`n=== Debug Test Complete ===" -ForegroundColor Cyan
