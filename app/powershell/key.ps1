param (
    [string]$appName,
    [string]$keyString
)

Add-Type -AssemblyName Microsoft.VisualBasic
Add-Type -AssemblyName System.Windows.Forms

$processes = Get-Process | Where-Object { $_.MainWindowTitle -like "*$appName*" }
if ($processes) {
    $process = $processes[0]
    [Microsoft.VisualBasic.Interaction]::AppActivate($process.Id)
    [System.Windows.Forms.SendKeys]::SendWait($keyString)
    Write-Output "Sent keys to $appName"
} else {
    Write-Error "Application $appName not found."
}
