Write-Host "===================================================" -ForegroundColor Yellow
Write-Host "  WORLD CUP DRAFT - MULTIPLAYER DEV SERVER RUNNER" -ForegroundColor Yellow
Write-Host "===================================================" -ForegroundColor Yellow
Write-Host ""

Write-Host "Starting backend server on port 5000..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd server; npm start"

Write-Host "Starting frontend client on port 5173..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd client; npm run dev"

Write-Host ""
Write-Host "Multiplayer mode launched successfully in separate terminals!" -ForegroundColor Cyan
