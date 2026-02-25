$ErrorActionPreference = "Stop"

Write-Host "`n" + ("=" * 60) -ForegroundColor Cyan
Write-Host "     FULL STACK TESTING AUTOMATION" -ForegroundColor Cyan
Write-Host "     Testing Backend + Frontend Integration" -ForegroundColor Cyan
Write-Host ("=" * 60) + "`n" -ForegroundColor Cyan

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  Backend URL: http://localhost:3001"
Write-Host "  Frontend URL: http://localhost:3000`n" -ForegroundColor Gray

$passed = 0
$failed = 0
$testResults = @()

function Write-TestResult($testName, $passed, $message) {
    $status = if ($passed) { "✅" } else { "❌" }
    $color = if ($passed) { "Green" } else { "Red" }
    Write-Host "$status $testName" -ForegroundColor $color
    if ($message) {
        Write-Host "   $message" -ForegroundColor Gray
    }
}

try {
    Write-Host "[1/3] Testing backend health..." -ForegroundColor Yellow
    $health = Invoke-RestMethod -Uri "http://localhost:3001/health" -Method Get
    if ($health.status -eq "operational") {
        Write-TestResult "Backend health check" $true "Uptime: $($health.uptime.ToString('F2'))s"
        $passed++
        $testResults += "Backend: PASS"
    } else {
        Write-TestResult "Backend health check" $false "Status: $($health.status)"
        $failed++
        $testResults += "Backend: FAIL"
    }
} catch {
    Write-TestResult "Backend health check" $false $_.Exception.Message
    $failed++
    $testResults += "Backend: FAIL"
}

try {
    Write-Host "`n[2/3] Testing frontend health..." -ForegroundColor Yellow
    $frontend = Invoke-WebRequest -Uri "http://localhost:3000" -Method Get -UseBasicParsing
    if ($frontend.StatusCode -eq 200) {
        Write-TestResult "Frontend health check" $true "Status: $($frontend.StatusCode)"
        $passed++
        $testResults += "Frontend: PASS"
    } else {
        Write-TestResult "Frontend health check" $false "Status: $($frontend.StatusCode)"
        $failed++
        $testResults += "Frontend: FAIL"
    }
} catch {
    Write-TestResult "Frontend health check" $false $_.Exception.Message
    $failed++
    $testResults += "Frontend: FAIL"
}

try {
    Write-Host "`n[3/3] Testing API integration..." -ForegroundColor Yellow
    $apiTest = @{
        topic = "Test Integration"
        version = "lite"
    } | ConvertTo-Json

    $apiResponse = Invoke-RestMethod -Uri "http://localhost:3000/api/generate" -Method Post -Body $apiTest -ContentType "application/json"
    if ($apiResponse.title -and $apiResponse.modules) {
        Write-TestResult "API integration" $true "Generated: $($apiResponse.title) ($($apiResponse.modules.Count) modules)"
        $passed++
        $testResults += "API Integration: PASS"
    } else {
        Write-TestResult "API integration" $false "Invalid response format"
        $failed++
        $testResults += "API Integration: FAIL"
    }
} catch {
    Write-TestResult "API integration" $false $_.Exception.Message
    $failed++
    $testResults += "API Integration: FAIL"
}

Write-Host "`n" + ("-" * 60) -ForegroundColor Cyan
Write-Host "TEST RESULTS:" -ForegroundColor Yellow
Write-Host "  Passed: $passed/3" -ForegroundColor Green
Write-Host "  Failed: $failed/3" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })
Write-Host ("-" * 60) + "`n" -ForegroundColor Cyan

if ($failed -eq 0) {
    Write-Host "=== FULL STACK TESTING PASSED ===" -ForegroundColor Green
    Write-Host "🎉 All tests completed successfully!" -ForegroundColor Cyan
    Write-Host "`nNext steps:" -ForegroundColor Yellow
    Write-Host "  1. Open http://localhost:3000 for manual testing" -ForegroundColor Gray
    Write-Host "  2. Run browser console tests from LOCAL_MANUAL_TESTING.md Step 12" -ForegroundColor Gray
    exit 0
} else {
    Write-Host "=== FULL STACK TESTING FAILED ===" -ForegroundColor Red
    Write-Host "`nFailed tests:" -ForegroundColor Yellow
    $testResults | Where-Object { $_ -like "*FAIL*" } | ForEach-Object {
        Write-Host "  - $_" -ForegroundColor Red
    }
    Write-Host "`nTroubleshooting:" -ForegroundColor Yellow
    Write-Host "  - Check if both servers are running" -ForegroundColor Gray
    Write-Host "  - Check LOCAL_MANUAL_TESTING.md for troubleshooting tips" -ForegroundColor Gray
    exit 1
}
