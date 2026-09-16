$node22 = "C:\Users\yuuki\.local\nodejs22"
if (-not (Test-Path (Join-Path $node22 "node.exe"))) {
    throw "Node.js 22 was not found at $node22"
}
$env:Path = "$node22;$env:Path"
Write-Host "Node.js $(& node --version) / npm $(& npm --version) is active in this terminal."
