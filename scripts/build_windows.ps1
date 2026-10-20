$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root

$python = "python"
if (Test-Path -LiteralPath (Join-Path $root ".venv\Scripts\python.exe")) {
    $python = Join-Path $root ".venv\Scripts\python.exe"
}

& $python -m pip install --upgrade pyinstaller
& $python -m PyInstaller --noconfirm --clean --onefile --noconsole `
    --name workadapt-agent `
    --add-data "catalogs;catalogs" `
    --add-data "config.json;." `
    workadapt_agent.py

Write-Host "Built: $root\dist\workadapt-agent.exe"
Write-Host "Copy config.json and catalogs/ next to the exe to customize."
