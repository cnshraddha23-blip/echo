Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "          Starting Echo AI Desktop Assistant              " -ForegroundColor Yellow
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Start Python Backend in background job
Write-Host "[1/2] Launching Python FastAPI + Socket.IO Backend..." -ForegroundColor Green
$backendJob = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    python -m uvicorn backend.main:combined_asgi_app --host 127.0.0.1 --port 5000
}

Start-Sleep -Seconds 3

# 2. Check health endpoint
try {
    $health = Invoke-RestMethod -Uri "http://127.0.0.1:5000/api/health" -Method Get
    Write-Host "[OK] Backend Online: $($health.service) v$($health.version)" -ForegroundColor Green
} catch {
    Write-Host "[WARNING] Backend check pending, opening interface..." -ForegroundColor Yellow
}

# 3. Open browser interface
Write-Host "[2/2] Opening Echo Desktop Interface..." -ForegroundColor Green
Start-Process "http://127.0.0.1:5000"

Write-Host "Echo Voice Assistant is running at http://127.0.0.1:5000" -ForegroundColor Cyan
Write-Host "Press Ctrl+C to terminate or stop job." -ForegroundColor Gray

# Keep alive or wait for user input
Receive-Job -Job $backendJob -Wait
