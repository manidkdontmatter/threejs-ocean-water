$ErrorActionPreference = 'Stop'
$server = $null
try {
  if (Test-Path 'output/web-game') { Remove-Item 'output/web-game' -Recurse -Force }
  New-Item -ItemType Directory -Path 'output/web-game' -Force | Out-Null
  New-Item -ItemType Directory -Path 'output' -Force | Out-Null

  $server = Start-Process -FilePath 'cmd.exe' -ArgumentList '/c', 'npm run dev -- --host 127.0.0.1 --port 5173' -WorkingDirectory 'C:\Users\Main\OneDrive\Desktop\web-ocean-water' -PassThru -WindowStyle Hidden -RedirectStandardOutput 'output/devserver.log' -RedirectStandardError 'output/devserver.err.log'

  $ready = $false
  for ($i = 0; $i -lt 80; $i++) {
    try {
      $resp = Invoke-WebRequest -Uri 'http://127.0.0.1:5173' -UseBasicParsing -TimeoutSec 2
      if ($resp.StatusCode -ge 200) { $ready = $true; break }
    } catch {}
    Start-Sleep -Milliseconds 500
  }

  if (-not $ready) { throw 'Dev server did not become ready on port 5173.' }

  node "C:/Users/Main/.codex/skills/develop-web-game/scripts/web_game_playwright_client.js" --url http://127.0.0.1:5173 --actions-file "C:/Users/Main/.codex/skills/develop-web-game/references/action_payloads.json" --iterations 3 --pause-ms 250 --screenshot-dir "output/web-game"

  Write-Host 'Artifacts:'
  Get-ChildItem -Path 'output/web-game' | Select-Object Name,Length | Format-Table -AutoSize
} finally {
  if ($null -ne $server -and -not $server.HasExited) {
    Stop-Process -Id $server.Id -Force
  }
}
