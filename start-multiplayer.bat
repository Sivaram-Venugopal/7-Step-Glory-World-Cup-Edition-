@echo off
echo ===================================================
echo   WORLD CUP DRAFT - MULTIPLAYER DEV SERVER RUNNER
echo ===================================================
echo.
echo Starting backend server on port 5000...
start cmd /k "cd server && npm start"
echo.
echo Starting frontend client on port 5173...
start cmd /k "cd client && npm run dev"
echo.
echo Dev environment launched successfully!
echo Close this window to stop monitoring, or press any key to exit.
pause
