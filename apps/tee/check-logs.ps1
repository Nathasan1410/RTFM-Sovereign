$logContent = Get-Content .\logs\tee.log -Tail 100
$eigenAiLogs = $logContent | Select-String -Pattern "EigenAI|provider|Vue 3 Composition"

Write-Host "=== Recent EigenAI Logs ===" -ForegroundColor Cyan
$eigenAiLogs | Select-Object -Last 15 | ForEach-Object {
    $line = $_.ToString()
    if ($line -like "*provider:EigenAI*") {
        Write-Host $line -ForegroundColor Green
    } elseif ($line -like "*Provider SUCCESS*") {
        Write-Host $line -ForegroundColor Green
    } elseif ($line -like "*Roadmap generated*") {
        Write-Host $line -ForegroundColor Yellow
    } else {
        Write-Host $line -ForegroundColor White
    }
}
