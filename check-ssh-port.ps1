
$target = "185.27.133.19"
$ports = @(22, 2222, 21098, 2200, 2022, 1022, 8022)

Write-Host "Checking SSH ports on $target..."
foreach ($port in $ports) {
    try {
        $tcp = New-Object System.Net.Sockets.TcpClient
        $connect = $tcp.BeginConnect($target, $port, $null, $null)
        $wait = $connect.AsyncWaitHandle.WaitOne(1000, $false)
        if ($wait -and $tcp.Connected) {
            Write-Host "✅ Port $port is OPEN!" -ForegroundColor Green
            $tcp.Close()
        } else {
            Write-Host "❌ Port $port is closed/filtered." -ForegroundColor Red
        }
    } catch {
        Write-Host "❌ Port $port is closed." -ForegroundColor Red
    }
}
