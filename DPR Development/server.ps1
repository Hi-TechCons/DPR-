$port = 3000
$root = $PSScriptRoot

# Find local active IPv4 address
$localIp = (Get-NetIPAddress -AddressFamily IPv4 | Where-Object { 
    $_.IPAddress -notlike "127.*" -and 
    $_.IPAddress -notlike "169.254.*" 
} | Select-Object -First 1).IPAddress

if (-not $localIp) { $localIp = "127.0.0.1" }

Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host "       DPR MOBILE PRO - LOCAL NETWORK SERVER           " -ForegroundColor Yellow
Write-Host "=======================================================" -ForegroundColor Cyan
Write-Host " [Laptop / PC]    : http://localhost:$port" -ForegroundColor Green
Write-Host " [Mobile Phone]   : http://$($localIp):$port" -ForegroundColor Green
Write-Host "-------------------------------------------------------"
Write-Host " 1. Make sure phone is on the same Wi-Fi network"
Write-Host " 2. Scan the on-screen QR code or open the link above"
Write-Host "=======================================================" -ForegroundColor Cyan

$mimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".ico"  = "image/x-icon"
    ".svg"  = "image/svg+xml"
}

# Bind TcpListener to all network interfaces (0.0.0.0) without requiring admin rights
$listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $port)
$listener.Server.SetSocketOption([System.Net.Sockets.SocketOptionLevel]::Socket, [System.Net.Sockets.SocketOptionName]::ReuseAddress, $true)
$listener.Start()

try {
    while ($true) {
        $client = $listener.AcceptTcpClient()
        try {
            $stream = $client.GetStream()
            $reader = New-Object System.IO.StreamReader($stream)
            $requestLine = $reader.ReadLine()

            if (-not $requestLine) {
                $client.Close()
                continue
            }

            $parts = $requestLine.Split(' ')
            $method = $parts[0]
            $urlPath = if ($parts.Length -gt 1) { $parts[1] } else { "/" }
            $cleanPath = $urlPath.Split('?')[0].Split('#')[0]

            # Special API endpoint to return local Wi-Fi IP to frontend
            if ($cleanPath -eq "/api/network-ip") {
                $json = "{`"ip`":`"$localIp`",`"port`":$port,`"url`":`"http://$localIp`:$port`"}"
                $bodyBytes = [System.Text.Encoding]::UTF8.GetBytes($json)
                $header = "HTTP/1.1 200 OK`r`nContent-Type: application/json`r`nAccess-Control-Allow-Origin: *`r`nContent-Length: $($bodyBytes.Length)`r`nConnection: close`r`n`r`n"
                $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
                $stream.Write($headerBytes, 0, $headerBytes.Length)
                $stream.Write($bodyBytes, 0, $bodyBytes.Length)
                $stream.Flush()
                $client.Close()
                continue
            }

            if ($cleanPath -eq "/" -or $cleanPath -eq "") {
                $cleanPath = "/index.html"
            }

            $filePath = Join-Path $root ($cleanPath.TrimStart('/').Replace('/', '\'))

            if (Test-Path $filePath -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($filePath).ToLower()
                $contentType = $mimeTypes[$ext]
                if (-not $contentType) { $contentType = "application/octet-stream" }

                $bodyBytes = [System.IO.File]::ReadAllBytes($filePath)
                $header = "HTTP/1.1 200 OK`r`nContent-Type: $contentType`r`nAccess-Control-Allow-Origin: *`r`nContent-Length: $($bodyBytes.Length)`r`nConnection: close`r`n`r`n"
                $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
                $stream.Write($headerBytes, 0, $headerBytes.Length)
                $stream.Write($bodyBytes, 0, $bodyBytes.Length)
                $stream.Flush()
            } else {
                $notFound = [System.Text.Encoding]::UTF8.GetBytes("File Not Found")
                $header = "HTTP/1.1 404 Not Found`r`nContent-Type: text/plain`r`nContent-Length: $($notFound.Length)`r`nConnection: close`r`n`r`n"
                $headerBytes = [System.Text.Encoding]::ASCII.GetBytes($header)
                $stream.Write($headerBytes, 0, $headerBytes.Length)
                $stream.Write($notFound, 0, $notFound.Length)
                $stream.Flush()
            }
        } catch {
            # Ignore individual client stream disconnects
        } finally {
            $client.Close()
        }
    }
} finally {
    $listener.Stop()
}
