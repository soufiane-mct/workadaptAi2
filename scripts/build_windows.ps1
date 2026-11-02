$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $root

$python = "python"
foreach ($candidate in @(".venv-build", ".venv")) {
    $path = Join-Path $root "$candidate\Scripts\python.exe"
    if (Test-Path -LiteralPath $path) {
        $python = $path
        break
    }
}

& $python -m pip install --upgrade pyinstaller
& $python -m PyInstaller --noconfirm --clean --onefile --noconsole `
    --name workadapt-agent `
    --add-data "catalogs;catalogs" `
    --add-data "config.json;." `
    workadapt_agent.py

Write-Host "Built: $root\dist\workadapt-agent.exe"
Write-Host "Copy config.json and catalogs/ next to the exe to customize."
