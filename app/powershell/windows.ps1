$windows = Get-Process | Where-Object { $_.MainWindowTitle -ne "" } | ForEach-Object {
    @{
        app = $_.ProcessName
        name = $_.MainWindowTitle
        id = $_.Id
    }
}

$json = $windows | ConvertTo-Json
Write-Output $json
