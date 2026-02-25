$body = @{
    userAddress = "0x3ED0B957Fd306FEB580A7dAe191ce71BA4157B48"
    topic = "Next.js App Router"
    deep = $true
    mode = "pro"
} | ConvertTo-Json

Invoke-WebRequest -Uri "http://localhost:3001/challenge/generate" -Method Post -Body $body -ContentType "application/json" -UseBasicParsing | Select-Object -ExpandProperty Content
