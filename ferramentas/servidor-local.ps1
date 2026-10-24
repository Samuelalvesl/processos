param([string]$Root = (Split-Path $PSScriptRoot -Parent), [int]$Port = 8765)
Write-Host "Abra http://localhost:$Port no navegador. Ctrl+C para encerrar."
# Servidor de teste: arquivos estáticos + repasse de /modulo-arp/ (imita o Cloudflare Worker).
$types = @{ '.html'='text/html; charset=utf-8'; '.js'='text/javascript; charset=utf-8'; '.css'='text/css; charset=utf-8'; '.png'='image/png'; '.json'='application/json' }
$l = New-Object System.Net.HttpListener
$l.Prefixes.Add("http://localhost:$Port/")
$l.Start()
while ($l.IsListening) {
  $c = $l.GetContext()
  try {
    $path = $c.Request.Url.AbsolutePath
    if ($path.StartsWith('/modulo-arp/')) {
      $tmp = [IO.Path]::GetTempFileName()
      $code = & curl.exe -s -o $tmp -w "%{http_code}" --max-time 90 ("https://dadosabertos.compras.gov.br" + $c.Request.Url.PathAndQuery)
      $b = [IO.File]::ReadAllBytes($tmp); Remove-Item $tmp
      $c.Response.StatusCode = [int]$code
      $c.Response.ContentType = 'application/json; charset=utf-8'
    } else {
      $p = $path.TrimStart('/'); if ($p -eq '') { $p = 'index.html' }
      $f = Join-Path $Root $p
      if (-not (Test-Path $f -PathType Leaf)) { $c.Response.StatusCode = 404; $c.Response.Close(); continue }
      $b = [IO.File]::ReadAllBytes($f)
      $c.Response.ContentType = $types[[IO.Path]::GetExtension($f)]
    }
    $c.Response.OutputStream.Write($b, 0, $b.Length)
  } catch { $c.Response.StatusCode = 500 }
  $c.Response.Close()
}
