$body = @{
    userAddress = "0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48"
    topic = "Tailwind CSS"
    deep = $true
    mode = "pro"
} | ConvertTo-Json

Write-Host "Testing roadmap generation for: Tailwind CSS"
Write-Host "Request: $body"
Write-Host ""

$response = Invoke-WebRequest -Uri "http://localhost:3001/challenge/generate" -Method Post -Body $body -ContentType "application/json" -UseBasicParsing

Write-Host "Response Status: $($response.StatusCode)"
Write-Host "Response Length: $($response.Content.Length) characters"
Write-Host ""
Write-Host "Response Content:"
Write-Host $response.Content
