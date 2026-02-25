# Local Manual Testing Script for TEE Service
# PowerShell Automation Script for Local Testing

param(
    [string]$ServerUrl = "http://localhost:3001",
    [string]$UserAddress = "0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48",
    [switch]$Verbose,
    [switch]$NoPause
)

$ErrorActionPreference = "Continue"

function Write-Separator {
    param([string]$Char = "=", [int]$Length = 50)
    Write-Host ($Char * $Length) -ForegroundColor Cyan
}

function Write-TestHeader {
    param([string]$Title)
    Write-Separator
    Write-Host "  $Title" -ForegroundColor Cyan
    Write-Separator
}

function Write-Result {
    param(
        [string]$Message,
        [string]$Status = "info"
    )
    
    $icon = switch ($Status) {
        "success" { "✅" }
        "error" { "❌" }
        "warning" { "⚠️" }
        "info" { "ℹ️" }
        default { "•" }
    }
    
    $color = switch ($Status) {
        "success" { "Green" }
        "error" { "Red" }
        "warning" { "Yellow" }
        "info" { "Cyan" }
        default { "White" }
    }
    
    Write-Host "$icon $Message" -ForegroundColor $color
}

function Invoke-Api {
    param(
        [string]$Endpoint,
        [string]$Method = "GET",
        [object]$Body,
        [switch]$NoError
    )
    
    try {
        $params = @{
            Uri = "$ServerUrl$Endpoint"
            Method = $Method
            UseBasicParsing = $true
        }
        
        if ($Body) {
            $params.Body = ($Body | ConvertTo-Json -Depth 4)
            $params.ContentType = "application/json"
        }
        
        $response = Invoke-RestMethod @params
        return $response
    }
    catch {
        if (-not $NoError) {
            Write-Result "API Error: $_" -Status "error"
        }
        return $null
    }
}

# Test Functions

function Test-Health {
    Write-TestHeader "Health Check"
    
    $result = Invoke-Api -Endpoint "/health"
    
    if ($result -and $result.status -eq "operational") {
        Write-Result "Health check passed" -Status "success"
        
        if ($Verbose) {
            Write-Host "`nResponse:" -ForegroundColor Gray
            Write-Host ($result | ConvertTo-Json -Depth 3) -ForegroundColor Gray
        }
        return $true
    }
    
    Write-Result "Health check failed" -Status "error"
    return $false
}

function Test-SessionCreate {
    Write-TestHeader "Session Creation"
    
    $body = @{
        userAddress = $UserAddress
        goldenPath = @{
            theory = "React Development"
            topic = "React Development"
            objectives = @()
            prerequisites = @()
            milestones = @(
                @{ id = 1; title = "M1 - Basics"; description = "Learn React basics" }
                @{ id = 2; title = "M2 - Components"; description = "Understand components" }
                @{ id = 3; title = "M3 - State"; description = "State management" }
                @{ id = 4; title = "M4 - Hooks"; description = "React hooks" }
                @{ id = 5; title = "M5 - Advanced"; description = "Advanced patterns" }
            )
        }
    }
    
    $result = Invoke-Api -Endpoint "/session/create" -Method "POST" -Body $body
    
    if ($result -and $result.success) {
        Write-Result "Session created successfully" -Status "success"
        Write-Result "Session ID: $($result.sessionId)" -Status "info"
        
        if ($Verbose) {
            Write-Host "`nResponse:" -ForegroundColor Gray
            Write-Host ($result | ConvertTo-Json -Depth 3) -ForegroundColor Gray
        }
        
        return $result.sessionId
    }
    
    Write-Result "Session creation failed" -Status "error"
    if ($result -and $result.message) {
        Write-Result "Error: $($result.message)" -Status "info"
    }
    return $null
}

function Test-ChallengeGenerate {
    param(
        [string]$Topic = "React Development",
        [int]$Seed = 12345
    )
    
    Write-TestHeader "Challenge Generation"
    
    $body = @{
        userAddress = $UserAddress
        topic = $Topic
        seed = $Seed
    }
    
    $result = Invoke-Api -Endpoint "/challenge/generate" -Method "POST" -Body $body
    
    if ($result -and $result.success -and $result.challenge) {
        Write-Result "Challenge generated successfully" -Status "success"
        Write-Result "Question: $($result.challenge.question)" -Status "info"
        Write-Result "Correct Answer: $($result.challenge.options[$result.challenge.correctAnswer])" -Status "info"
        
        if ($Verbose) {
            Write-Host "`nResponse:" -ForegroundColor Gray
            Write-Host ($result | ConvertTo-Json -Depth 3) -ForegroundColor Gray
        }
        
        return $result.challenge
    }
    
    Write-Result "Challenge generation failed" -Status "error"
    if ($result -and $result.message) {
        Write-Result "Error: $($result.message)" -Status "info"
    }
    return $null
}

function Test-AnswerSubmit {
    param(
        [string]$Topic = "React Development",
        [string]$Question,
        [string]$Answer,
        [int]$Seed = 12345
    )
    
    Write-TestHeader "Answer Submission"
    
    if (-not $Question -or -not $Answer) {
        Write-Result "Skipping - Question or Answer not provided" -Status "warning"
        return $null
    }
    
    $body = @{
        userAddress = $UserAddress
        topic = $Topic
        question = $Question
        answer = $Answer
        seed = $Seed
    }
    
    $result = Invoke-Api -Endpoint "/challenge/submit" -Method "POST" -Body $body
    
    if ($result -and $result.success) {
        Write-Result "Answer submitted successfully" -Status "success"
        Write-Result "Score: $($result.score)" -Status "info"
        Write-Result "Correct: $($result.correct)" -Status "info"
        
        if ($Verbose) {
            Write-Host "`nResponse:" -ForegroundColor Gray
            Write-Host ($result | ConvertTo-Json -Depth 3) -ForegroundColor Gray
        }
        
        return $result
    }
    
    Write-Result "Answer submission failed" -Status "error"
    if ($result -and $result.message) {
        Write-Result "Error: $($result.message)" -Status "info"
    }
    return $null
}

function Test-SessionStatus {
    param([string]$SessionId)
    
    Write-TestHeader "Session Status"
    
    if (-not $SessionId) {
        Write-Result "Skipping - No session ID provided" -Status "warning"
        return $null
    }
    
    $result = Invoke-Api -Endpoint "/session/$SessionId/status"
    
    if ($result) {
        Write-Result "Session status retrieved successfully" -Status "success"
        
        if ($Verbose) {
            Write-Host "`nResponse:" -ForegroundColor Gray
            Write-Host ($result | ConvertTo-Json -Depth 4) -ForegroundColor Gray
        }
        
        return $result
    }
    
    Write-Result "Failed to retrieve session status" -Status "error"
    return $null
}

function Test-GetSkills {
    Write-TestHeader "Get Available Skills"
    
    $result = Invoke-Api -Endpoint "/skills"
    
    if ($result -and $result.skills) {
        Write-Result "Retrieved $($result.skills.Count) skills" -Status "success"
        
        if ($Verbose) {
            Write-Host "`nSkills:" -ForegroundColor Gray
            $result.skills | ForEach-Object { Write-Host "  - $_" -ForegroundColor Gray }
        }
        
        return $result.skills
    }
    
    Write-Result "Failed to retrieve skills" -Status "error"
    return $null
}

function Test-StakingStatus {
    param(
        [string]$UserAddress = $UserAddress,
        [string]$Skill = "React Development"
    )
    
    Write-TestHeader "Staking Status"
    
    $encodedSkill = [System.Web.HttpUtility]::UrlEncode($Skill)
    $result = Invoke-Api -Endpoint "/staking/status?user=$UserAddress&skill=$encodedSkill"
    
    if ($result) {
        Write-Result "Staking status retrieved successfully" -Status "success"
        
        if ($Verbose) {
            Write-Host "`nResponse:" -ForegroundColor Gray
            Write-Host ($result | ConvertTo-Json -Depth 3) -ForegroundColor Gray
        }
        
        return $result
    }
    
    Write-Result "Failed to retrieve staking status" -Status "error"
    return $null
}

function Test-CompleteFlow {
    Write-TestHeader "Complete Integration Flow"
    
    # Step 1: Create Session
    Write-Host "`n[Step 1/4] Creating session..." -ForegroundColor Yellow
    $sessionId = Test-SessionCreate
    
    if (-not $sessionId) {
        Write-Result "Flow aborted - Session creation failed" -Status "error"
        return $false
    }
    
    # Step 2: Generate Challenge
    Write-Host "`n[Step 2/4] Generating challenge..." -ForegroundColor Yellow
    $challenge = Test-ChallengeGenerate
    
    if (-not $challenge) {
        Write-Result "Flow aborted - Challenge generation failed" -Status "error"
        return $false
    }
    
    # Step 3: Submit Answer
    Write-Host "`n[Step 3/4] Submitting answer..." -ForegroundColor Yellow
    $question = $challenge.question
    $correctAnswer = $challenge.options[$challenge.correctAnswer]
    $result = Test-AnswerSubmit -Question $question -Answer $correctAnswer
    
    if (-not $result) {
        Write-Result "Flow aborted - Answer submission failed" -Status "error"
        return $false
    }
    
    # Step 4: Get Session Status
    Write-Host "`n[Step 4/4] Getting session status..." -ForegroundColor Yellow
    $status = Test-SessionStatus -SessionId $sessionId
    
    if (-not $status) {
        Write-Result "Flow aborted - Session status failed" -Status "error"
        return $false
    }
    
    Write-Result "Complete flow test passed!" -Status "success"
    return $true
}

# Main Execution

function Main {
    Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
    Write-Host "     LOCAL MANUAL TESTING - TEE SERVICE" -ForegroundColor Cyan
    Write-Host ("=" * 60) + "`n" -ForegroundColor Cyan
    
    Write-Host "Configuration:" -ForegroundColor Yellow
    Write-Host "  Server URL: $ServerUrl"
    Write-Host "  User Address: $UserAddress"
    Write-Host "  Verbose Mode: $Verbose`n"
    
    $passed = 0
    $failed = 0
    $testResults = @()
    
    # Run Individual Tests
    $testResults += [PSCustomObject]@{
        Test = "Health Check"
        Status = if (Test-Health) { "PASS" } else { "FAIL" }
    }
    if ($testResults[-1].Status -eq "PASS") { $passed++ } else { $failed++ }
    
    $sessionId = Test-SessionCreate
    $testResults += [PSCustomObject]@{
        Test = "Session Creation"
        Status = if ($sessionId) { "PASS" } else { "FAIL" }
    }
    if ($testResults[-1].Status -eq "PASS") { $passed++ } else { $failed++ }
    
    $challenge = Test-ChallengeGenerate
    $testResults += [PSCustomObject]@{
        Test = "Challenge Generation"
        Status = if ($challenge) { "PASS" } else { "FAIL" }
    }
    if ($testResults[-1].Status -eq "PASS") { $passed++ } else { $failed++ }
    
    if ($challenge) {
        $answerResult = Test-AnswerSubmit -Question $challenge.question -Answer $challenge.options[$challenge.correctAnswer]
        $testResults += [PSCustomObject]@{
            Test = "Answer Submission"
            Status = if ($answerResult) { "PASS" } else { "FAIL" }
        }
        if ($testResults[-1].Status -eq "PASS") { $passed++ } else { $failed++ }
    }
    
    if ($sessionId) {
        $statusResult = Test-SessionStatus -SessionId $sessionId
        $testResults += [PSCustomObject]@{
            Test = "Session Status"
            Status = if ($statusResult) { "PASS" } else { "FAIL" }
        }
        if ($testResults[-1].Status -eq "PASS") { $passed++ } else { $failed++ }
    }
    
    $skills = Test-GetSkills
    $testResults += [PSCustomObject]@{
        Test = "Get Skills"
        Status = if ($skills) { "PASS" } else { "FAIL" }
    }
    if ($testResults[-1].Status -eq "PASS") { $passed++ } else { $failed++ }
    
    # Run Complete Flow Test
    Write-Separator
    Write-Result "Running Complete Flow Test..." -Status "info"
    Write-Separator
    
    $flowPassed = Test-CompleteFlow
    $testResults += [PSCustomObject]@{
        Test = "Complete Flow"
        Status = if ($flowPassed) { "PASS" } else { "FAIL" }
    }
    if ($flowPassed) { $passed++ } else { $failed++ }
    
    # Print Summary
    Write-Separator
    Write-Host "TEST SUMMARY" -ForegroundColor Cyan
    Write-Separator
    Write-Host "`n" + ("-" * 60) -ForegroundColor Gray
    Write-Host "{0,-30} {1,-10}" -f "Test Name", "Status"
    Write-Host ("-" * 60) -ForegroundColor Gray
    
    foreach ($result in $testResults) {
        $color = if ($result.Status -eq "PASS") { "Green" } else { "Red" }
        Write-Host ("{0,-30} {1,-10}" -f $result.Test, $result.Status) -ForegroundColor $color
    }
    
    Write-Host ("-" * 60) -ForegroundColor Gray
    
    $total = $passed + $failed
    $percentage = if ($total -gt 0) { [math]::Round(($passed / $total) * 100, 2) } else { 0 }
    
    Write-Host "`nTotal Tests: $total" -ForegroundColor Cyan
    Write-Result "Passed: $passed" -Status "success"
    Write-Result "Failed: $failed" -Status "error"
    Write-Host "`nSuccess Rate: $percentage%" -ForegroundColor $(if ($percentage -ge 80) { "Green" } elseif ($percentage -ge 50) { "Yellow" } else { "Red" })
    
    # Final Result
    Write-Separator
    
    if ($failed -eq 0) {
        Write-Host "`n🎉 All local tests passed!" -ForegroundColor Green
        Write-Host "Ready for production deployment." -ForegroundColor Green
        $exitCode = 0
    }
    else {
        Write-Host "`n⚠️  Some tests failed." -ForegroundColor Yellow
        Write-Host "Please review the errors above and fix issues." -ForegroundColor Yellow
        $exitCode = 1
    }
    
    Write-Separator
    
    if (-not $NoPause) {
        Write-Host "`nPress any key to continue..." -ForegroundColor Gray
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    }
    
    exit $exitCode
}

# Run Main
Main
