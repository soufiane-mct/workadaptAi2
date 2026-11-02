param(
    [string]$ExePath = "",
    [string]$TaskName = "WorkAdaptAgent",
    [switch]$Disabled
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot

if ([string]::IsNullOrWhiteSpace($ExePath)) {
    $ExePath = Join-Path $root "dist\workadapt-agent.exe"
}
if (-not (Test-Path -LiteralPath $ExePath)) {
    throw "Executable introuvable: $ExePath. Lancez scripts\build_windows.ps1 d'abord."
}

$exe = (Resolve-Path -LiteralPath $ExePath).Path
$workdir = Split-Path -Parent $exe

$action = New-ScheduledTaskAction -Execute $exe -WorkingDirectory $workdir
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -RestartCount 3 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit ([TimeSpan]::Zero)

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "WorkAdapt activity agent" `
    -Force | Out-Null

if ($Disabled) {
    Disable-ScheduledTask -TaskName $TaskName | Out-Null
    Write-Host "Tache '$TaskName' installee mais desactivee."
    Write-Host "Activer: Enable-ScheduledTask -TaskName $TaskName; Start-ScheduledTask -TaskName $TaskName"
} else {
    Start-ScheduledTask -TaskName $TaskName
    Write-Host "Tache '$TaskName' installee et demarree."
}
Write-Host "Donnees et logs: $workdir\data"
