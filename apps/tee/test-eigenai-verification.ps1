$body = @{
    userAddress = "0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48"
    topic = "Vue 3 Composition API"
    deep = $true
    mode = "pro"
} | ConvertTo-Json

$response = Invoke-WebRequest -Uri "http://localhost:3001/challenge/generate" -Method Post -Body $body -ContentType "application/json" -UseBasicParsing

Write-Host "Response Status: $($response.StatusCode)" -ForegroundColor Green
Write-Host "Response Length: $($response.Content.Length) characters" -ForegroundColor Yellow

$json = $response.Content | ConvertFrom-Json
Write-Host "Title: $($json.title)" -ForegroundColor Cyan
Write-Host "Modules: $($json.modules.Count)" -ForegroundColor Cyan

if ($json.modules.Count -eq 7) {
    Write-Host "✅ SUCCESS: EigenAI generated 7 modules as expected!" -ForegroundColor Green
} else {
    Write-Host "❌ FAIL: Expected 7 modules, got $($json.modules.Count)" -ForegroundColor Red
}

$json.modules | ForEach-Object { 
    Write-Host "  - $($_.title)" -ForegroundColor Gray
}
