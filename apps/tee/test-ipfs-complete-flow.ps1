# Complete IPFS Flow Test
# This script tests the full attestation flow with IPFS integration

$baseUrl = "http://localhost:3001"

# Test 1: Create Session with complete schema-compliant payload
Write-Host "Test 1: Creating session with full schema..." -ForegroundColor Cyan

$sessionPayload = @{
    userAddress = "0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48"
    goldenPath = @{
        project_id = [guid]::NewGuid().ToString()
        project_title = "react-card"
        learning_objectives = @("Learn React basics", "Build card component", "Test with Jest")
        tech_stack = @{
            framework = "React"
            styling = "Tailwind CSS"
            language = "TypeScript"
        }
        file_structure = @(
            @{ path = "src/App.tsx"; purpose = "Main App component"; template_type = "component" },
            @{ path = "src/components/Card.tsx"; purpose = "Card component"; template_type = "component" },
            @{ path = "tailwind.config.js"; purpose = "Tailwind configuration"; template_type = "config" }
        )
        milestones = @(
            @{
                milestone_id = 1
                title = "Project Setup"
                description = "Initialize React project with Vite and TypeScript"
                success_criteria = @("React installed", "Vite configured", "TypeScript enabled")
                deep_mode = $false
                estimated_time = 30
                prerequisites = @()
                rubric = @{
                    functionality_weight = 0.4
                    code_quality_weight = 0.3
                    best_practices_weight = 0.2
                    innovation_weight = 0.1
                }
                key_concepts = @("React", "Vite", "TypeScript", "Project initialization")
            },
            @{
                milestone_id = 2
                title = "Card Component"
                description = "Create reusable card component with props"
                success_criteria = @("Component created", "Props interface defined", "Styled properly")
                deep_mode = $false
                estimated_time = 45
                prerequisites = @(1)
                rubric = @{
                    functionality_weight = 0.4
                    code_quality_weight = 0.3
                    best_practices_weight = 0.2
                    innovation_weight = 0.1
                }
                key_concepts = @("React components", "Props", "Component composition", "Tailwind styling")
            },
            @{
                milestone_id = 3
                title = "Testing"
                description = "Test the card component with Jest"
                success_criteria = @("Tests pass", "Coverage adequate", "Edge cases covered")
                deep_mode = $false
                estimated_time = 30
                prerequisites = @(2)
                rubric = @{
                    functionality_weight = 0.4
                    code_quality_weight = 0.3
                    best_practices_weight = 0.2
                    innovation_weight = 0.1
                }
                key_concepts = @("Jest", "React Testing Library", "Unit testing", "Test coverage")
            }
        )
        final_deliverable = @{
            description = "A functional card component with full test coverage"
            demo_commands = @("npm run dev", "npm run test")
            verification_tests = @("Component renders correctly", "Props work as expected", "Tests pass")
        }
    }
} | ConvertTo-Json -Depth 10

try {
    $sessionResponse = Invoke-RestMethod -Uri "$baseUrl/session/create" -Method Post -Body $sessionPayload -ContentType "application/json"
    Write-Host "Session created successfully!" -ForegroundColor Green
    Write-Host "Session ID: $($sessionResponse.sessionId)" -ForegroundColor Yellow
    
    $sessionId = $sessionResponse.sessionId
}
catch {
    Write-Host "Failed to create session: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Error Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
    exit 1
}

# Test 2: Verify session exists in health check
Write-Host "`nTest 2: Verifying contract health..." -ForegroundColor Cyan
try {
    $healthResponse = Invoke-RestMethod -Uri "$baseUrl/health/contract" -Method Get
    Write-Host "Contract Health:" -ForegroundColor Yellow
    Write-Host "  Status: $($healthResponse.status)" -ForegroundColor Green
    Write-Host "  Signer: $($healthResponse.signer)" -ForegroundColor Green
    Write-Host "  IPFS: $($healthResponse.ipfs)" -ForegroundColor Green
    Write-Host "  Attestation Contract: $($healthResponse.attestationContract)" -ForegroundColor Green
    Write-Host "  Staking Contract: $($healthResponse.stakingContract)" -ForegroundColor Green
}
catch {
    Write-Host "Health check failed: $($_.Exception.Message)" -ForegroundColor Red
}

# Test 2.5: Add mock milestone scores for testing
Write-Host "`nTest 2.5: Adding mock milestone scores for testing..." -ForegroundColor Cyan

$scoresPayload = @{
    sessionId = $sessionId
    scores = @(
        @{ milestone_id = 1; score = 85; feedback = "Excellent project setup" },
        @{ milestone_id = 2; score = 92; feedback = "Great component design" },
        @{ milestone_id = 3; score = 78; feedback = "Good test coverage" }
    )
} | ConvertTo-Json

try {
    $scoresResponse = Invoke-RestMethod -Uri "$baseUrl/test/add-milestone-scores" -Method Post -Body $scoresPayload -ContentType "application/json"
    Write-Host "Milestone scores added successfully!" -ForegroundColor Green
    Write-Host "  Added $($scoresResponse.scores.Count) scores" -ForegroundColor Yellow
    Write-Host "  Average Score: $([math]::Round(($scoresResponse.scores | ForEach-Object { $_.score } | Measure-Object -Average).Average, 2))" -ForegroundColor Yellow
}
catch {
    Write-Host "Failed to add milestone scores: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Error Details: $($_.ErrorDetails.Message)" -ForegroundColor Red
}

# Test 3: Submit final attestation (this should upload to IPFS)
Write-Host "`nTest 3: Submitting final attestation with IPFS upload..." -ForegroundColor Cyan

$attestationPayload = @{
    sessionId = $sessionId
} | ConvertTo-Json

try {
    $attestationResponse = Invoke-RestMethod -Uri "$baseUrl/contract/submit-attestation" -Method Post -Body $attestationPayload -ContentType "application/json"
    
    if ($attestationResponse.success) {
        Write-Host "Attestation submitted successfully!" -ForegroundColor Green
        Write-Host "  Transaction Hash: $($attestationResponse.txHash)" -ForegroundColor Yellow
        Write-Host "  IPFS Hash: $($attestationResponse.ipfsHash)" -ForegroundColor Yellow
        Write-Host "  Final Score: $($attestationResponse.finalScore)" -ForegroundColor Yellow
        
        # Test 4: Verify IPFS gateway access
        if ($attestationResponse.ipfsHash) {
            Write-Host "`nTest 4: Verifying IPFS gateway access..." -ForegroundColor Cyan
            $ipfsGateway = "https://gateway.pinata.cloud/ipfs/$($attestationResponse.ipfsHash)"
            
            try {
                $gatewayResponse = Invoke-WebRequest -Uri $ipfsGateway -Method Get -TimeoutSec 10
                Write-Host "IPFS gateway accessible!" -ForegroundColor Green
                Write-Host "  Gateway URL: $ipfsGateway" -ForegroundColor Yellow
                Write-Host "  Status Code: $($gatewayResponse.StatusCode)" -ForegroundColor Yellow
                Write-Host "  Content Length: $($gatewayResponse.ContentLength) bytes" -ForegroundColor Yellow
                Write-Host "`n  Content Preview (first 500 chars):" -ForegroundColor Yellow
                $content = [System.Text.Encoding]::UTF8.GetString($gatewayResponse.Content)
                if ($content.Length -gt 500) {
                    Write-Host "    $($content.Substring(0, 500))..." -ForegroundColor Gray
                } else {
                    Write-Host "    $content" -ForegroundColor Gray
                }
            }
            catch {
                Write-Host "Gateway check failed (may need time to propagate): $($_.Exception.Message)" -ForegroundColor Yellow
            }
        }
    }
    else {
        Write-Host "Attestation submission failed: $($attestationResponse.error)" -ForegroundColor Red
    }
}
catch {
    Write-Host "Attestation submission error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.ErrorDetails.Message)" -ForegroundColor Red
}

# Test 5: Test claim refund
Write-Host "`nTest 5: Testing refund claim..." -ForegroundColor Cyan
$refundPayload = @{
    sessionId = $sessionId
} | ConvertTo-Json

try {
    $refundResponse = Invoke-RestMethod -Uri "$baseUrl/contract/claim-refund" -Method Post -Body $refundPayload -ContentType "application/json"
    
    if ($refundResponse.success) {
        Write-Host "Refund claimed successfully!" -ForegroundColor Green
        Write-Host "  Transaction Hash: $($refundResponse.txHash)" -ForegroundColor Yellow
        Write-Host "  Refund Amount: $($refundResponse.refundAmount)" -ForegroundColor Yellow
        Write-Host "  Final Score: $($refundResponse.finalScore)" -ForegroundColor Yellow
    }
    else {
        Write-Host "Refund claim failed: $($refundResponse.error)" -ForegroundColor Red
    }
}
catch {
    Write-Host "Refund claim error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.ErrorDetails.Message)" -ForegroundColor Red
}

Write-Host "`n=== IPFS Complete Flow Test Finished ===" -ForegroundColor Cyan
