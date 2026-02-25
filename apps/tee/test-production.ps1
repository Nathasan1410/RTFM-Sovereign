# PowerShell Test Script for TEE Service
# Production Testing Automation

param(
    [string]$ServerUrl = "http://localhost:3001",
    [string]$UserAddress = "0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48",
    [switch]$Verbose
)

$ErrorActionPreference = "Stop"

function Write-Status {
    param(
        [string]$Message,
        [string]$Status
    )
    
    $icon = switch ($Status) {
        "success" { "✅" }
        "error" { "❌" }
        "warning" { "⚠️" }
        "info" { "ℹ️" }
        default { "•" }
    }
    
    Write-Host "$icon $Message"
}

function Test-HealthCheck {
    Write-Host "`n=== Testing Health Check ===" -ForegroundColor Cyan
    
    try {
        $response = Invoke-RestMethod -Uri "$ServerUrl/health" -Method Get -UseBasicParsing
        
        if ($response.status -eq "operational") {
            Write-Status "Health check passed" -Status "success"
            if ($Verbose) {
                Write-Host "Response: $($response | ConvertTo-Json -Depth 3)" -ForegroundColor Gray
            }
            return $true
        } else {
            Write-Status "Health check failed - status: $($response.status)" -Status "error"
            return $false
        }
    }
    catch {
        Write-Status "Health check failed: $_" -Status "error"
        return $false
    }
}

function Test-SessionCreation {
    Write-Host "`n=== Testing Session Creation ===" -ForegroundColor Cyan
    
    $body = @{
        userAddress = $UserAddress
        goldenPath = @{
            theory = "React Development"
            topic = "React Development"
            objectives = @()
            prerequisites = @()
            milestones = @(
                @{ id = 1; title = "M1"; description = "Basics" },
                @{ id = 2; title = "M2"; description = "Components" },
                @{ id = 3; title = "M3"; description = "State" },
                @{ id = 4; title = "M4"; description = "Hooks" },
                @{ id = 5; title = "M5"; description = "Advanced" }
            )
        }
    } | ConvertTo-Json -Depth 4
    
    try {
        $response = Invoke-RestMethod -Uri "$ServerUrl/session/create" -Method Post -Body $body -ContentType "application/json" -UseBasicParsing
        
        if ($response.success) {
            Write-Status "Session created successfully" -Status "success"
            Write-Status "Session ID: $($response.sessionId)" -Status "info"
            if ($Verbose) {
                Write-Host "Response: $($response | ConvertTo-Json -Depth 3)" -ForegroundColor Gray
            }
            return $response.sessionId
        } else {
            Write-Status "Session creation failed: $($response.message)" -Status "error"
            return $null
        }
    }
    catch {
        Write-Status "Session creation failed: $_" -Status "error"
        return $null
    }
}

function Test-ChallengeGeneration {
    param(
        [string]$Topic = "React Development",
        [int]$Seed = 12345
    )
    
    Write-Host "`n=== Testing Challenge Generation ===" -ForegroundColor Cyan
    
    $body = @{
        userAddress = $UserAddress
        topic = $Topic
        seed = $Seed
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$ServerUrl/challenge/generate" -Method Post -Body $body -ContentType "application/json" -UseBasicParsing
        
        if ($response.success -and $response.challenge) {
            Write-Status "Challenge generated successfully" -Status "success"
            Write-Status "Question: $($response.challenge.question)" -Status "info"
            if ($Verbose) {
                Write-Host "Response: $($response | ConvertTo-Json -Depth 3)" -ForegroundColor Gray
            }
            return $response.challenge
        } else {
            Write-Status "Challenge generation failed: $($response.message)" -Status "error"
            return $null
        }
    }
    catch {
        Write-Status "Challenge generation failed: $_" -Status "error"
        return $null
    }
}

function Test-AnswerSubmission {
    param(
        [string]$Topic = "React Development",
        [string]$Question,
        [string]$Answer,
        [int]$Seed = 12345
    )
    
    Write-Host "`n=== Testing Answer Submission ===" -ForegroundColor Cyan
    
    if (-not $Question) {
        Write-Status "Skipping - no question provided" -Status "warning"
        return $null
    }
    
    $body = @{
        userAddress = $UserAddress
        topic = $Topic
        question = $Question
        answer = $Answer
        seed = $Seed
    } | ConvertTo-Json
    
    try {
        $response = Invoke-RestMethod -Uri "$ServerUrl/challenge/submit" -Method Post -Body $body -ContentType "application/json" -UseBasicParsing
        
        if ($response.success) {
            Write-Status "Answer submitted successfully" -Status "success"
            Write-Status "Score: $($response.score)" -Status "info"
            if ($Verbose) {
                Write-Host "Response: $($response | ConvertTo-Json -Depth 3)" -ForegroundColor Gray
            }
            return $response
        } else {
            Write-Status "Answer submission failed: $($response.message)" -Status "error"
            return $null
        }
    }
    catch {
        Write-Status "Answer submission failed: $_" -Status "error"
        return $null
    }
}

function Test-CompleteFlow {
    Write-Host "`n=== Testing Complete Flow ===" -ForegroundColor Cyan
    
    # Step 1: Create Session
    Write-Host "`n[Step 1/4] Creating session..." -ForegroundColor Yellow
    $sessionId = Test-SessionCreation
    
    if (-not $sessionId) {
        Write-Status "Flow aborted - session creation failed" -Status "error"
        return $false
    }
    
    # Step 2: Generate Challenge
    Write-Host "`n[Step 2/4] Generating challenge..." -ForegroundColor Yellow
    $challenge = Test-ChallengeGeneration
    
    if (-not $challenge) {
        Write-Status "Flow aborted - challenge generation failed" -Status "error"
        return $false
    }
    
    # Step 3: Submit Answer
    Write-Host "`n[Step 3/4] Submitting answer..." -ForegroundColor Yellow
    $question = $challenge.question
    $correctAnswer = $challenge.options[$challenge.correctAnswer]
    $result = Test-AnswerSubmission -Question $question -Answer $correctAnswer
    
    if (-not $result) {
        Write-Status "Flow aborted - answer submission failed" -Status "error"
        return $false
    }
    
    # Step 4: Get Session Status
    Write-Host "`n[Step 4/4] Getting session status..." -ForegroundColor Yellow
    try {
        $statusResponse = Invoke-RestMethod -Uri "$ServerUrl/session/$sessionId/status" -Method Get -UseBasicParsing
        Write-Status "Session status retrieved successfully" -Status "success"
        Write-Host "`nSession Status:" -ForegroundColor Cyan
        Write-Host ($statusResponse | ConvertTo-Json -Depth 4) -ForegroundColor Gray
        return $true
    }
    catch {
        Write-Status "Failed to get session status: $_" -Status "error"
        return $false
    }
}

function Main {
    Write-Host "`n========================================" -ForegroundColor Cyan
    Write-Host "   TEE Service Production Test" -ForegroundColor Cyan
    Write-Host "========================================`n" -ForegroundColor Cyan
    
    Write-Host "Configuration:" -ForegroundColor Yellow
    Write-Host "  Server URL: $ServerUrl"
    Write-Host "  User Address: $UserAddress"
    Write-Host "  Verbose: $Verbose`n"
    
    $passed = 0
    $failed = 0
    
    # Run individual tests
    if (Test-HealthCheck) { $passed++ } else { $failed++ }
    
    $sessionId = Test-SessionCreation
    if ($sessionId) { $passed++ } else { $failed++ }
    
    $challenge = Test-ChallengeGeneration
    if ($challenge) { $passed++ } else { $failed++ }
    
    if ($challenge) {
        $result = Test-AnswerSubmission -Question $challenge.question -Answer $challenge.options[$challenge.correctAnswer]
        if ($result) { $passed++ } else { $failed++ }
    }
    
    # Run complete flow test
    Write-Host "`n" + ("=" * 50) -ForegroundColor Cyan
    Write-Host "Running Complete Flow Test" -ForegroundColor Cyan
    Write-Host ("=" * 50) -ForegroundColor Cyan
    if (Test-CompleteFlow) { $passed++ } else { $failed++ }
    
    # Summary
    Write-Host "`n" + ("=" * 50) -ForegroundColor Cyan
    Write-Host "TEST SUMMARY" -ForegroundColor Cyan
    Write-Host ("=" * 50) -ForegroundColor Cyan
    Write-Host "`nTotal Tests: $($passed + $failed)"
    Write-Status "Passed: $passed" -Status "success"
    Write-Status "Failed: $failed" -Status "error"
    
    $percentage = if (($passed + $failed) -gt 0) { [math]::Round(($passed / ($passed + $failed)) * 100, 2) } else { 0 }
    Write-Host "`nSuccess Rate: $percentage%"
    
    if ($failed -eq 0) {
        Write-Host "`n🎉 All tests passed! Ready for production." -ForegroundColor Green
        exit 0
    } else {
        Write-Host "`n⚠️  Some tests failed. Review logs above." -ForegroundColor Yellow
        exit 1
    }
}

# Run main function
Main
