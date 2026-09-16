$project = "C:\Users\yuuki\cosfind-runtime"
$listener = Get-NetTCPConnection -LocalPort 3000 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
if ($listener) { exit 0 }
Set-Location -LiteralPath $project
& "C:\Users\yuuki\.local\nodejs22\node.exe" "node_modules\next\dist\bin\next" dev --webpack -H 127.0.0.1 -p 3000 *>> ".cosfind-server.log"
