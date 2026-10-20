param(
    [string]$TaskName = "WorkAdaptAgent"
)

$ErrorActionPreference = "Stop"
Stop-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false -ErrorAction SilentlyContinue
Write-Host "Tache '$TaskName' supprimee."
