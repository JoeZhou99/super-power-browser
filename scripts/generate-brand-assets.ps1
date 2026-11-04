$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$root = Split-Path -Parent $PSScriptRoot
$destination = Join-Path $root 'branding'
New-Item -ItemType Directory -Path $destination -Force | Out-Null
$svg = @'
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" fill="none">
  <defs><linearGradient id="blue" x2="1" y2="1"><stop stop-color="#5B88FF"/><stop offset="1" stop-color="#2F50E8"/></linearGradient></defs>
  <rect width="128" height="128" rx="29" fill="url(#blue)"/>
  <rect x="1" y="1" width="126" height="126" rx="28" stroke="#fff" stroke-opacity=".16"/>
  <path d="M91 24H53C38 24 27 34 27 47C27 58 34 65 48 69L71 75C76 76 79 79 79 82C79 86 75 89 69 89H34L26 104H70C88 104 101 95 101 80C101 68 93 60 79 56L56 50C51 49 48 47 48 44C48 40 52 38 57 38H83Z" fill="#fff"/>
</svg>
'@
[IO.File]::WriteAllText((Join-Path $destination 'mark.svg'), $svg, [Text.UTF8Encoding]::new($false))
$mark = $svg.Replace('viewBox="0 0 128 128"','width="64" height="64" viewBox="0 0 128 128"')
$wordmark = '<svg xmlns="http://www.w3.org/2000/svg" width="300" height="64" viewBox="0 0 300 64">'+$mark+'<text x="80" y="39" fill="#273957" font-family="Segoe UI,Arial,sans-serif" font-size="32" font-weight="650">SuperPower</text></svg>'
[IO.File]::WriteAllText((Join-Path $destination 'wordmark.svg'), $wordmark, [Text.UTF8Encoding]::new($false))
function RoundedPath([single]$x, [single]$y, [single]$width, [single]$height, [single]$radius) {
    $shape = New-Object Drawing.Drawing2D.GraphicsPath
    $diameter = 2 * $radius
    $shape.AddArc($x,$y,$diameter,$diameter,180,90)
    $shape.AddArc(($x+$width-$diameter),$y,$diameter,$diameter,270,90)
    $shape.AddArc(($x+$width-$diameter),($y+$height-$diameter),$diameter,$diameter,0,90)
    $shape.AddArc($x,($y+$height-$diameter),$diameter,$diameter,90,90)
    $shape.CloseFigure()
    return ,$shape
}
$bitmap = New-Object Drawing.Bitmap 1024,1024
$graphics = [Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.ScaleTransform(8,8)
$ink = New-Object Drawing.Drawing2D.LinearGradientBrush ([Drawing.Rectangle]::new(0,0,128,128)),([Drawing.ColorTranslator]::FromHtml('#5B88FF')),([Drawing.ColorTranslator]::FromHtml('#2F50E8')),45
$white = New-Object Drawing.SolidBrush ([Drawing.Color]::White)
$edge = New-Object Drawing.Pen ([Drawing.Color]::FromArgb(41,255,255,255)),1
$background = RoundedPath 0 0 128 128 29
$border = RoundedPath 1 1 126 126 28
$symbol = New-Object Drawing.Drawing2D.GraphicsPath
$symbol.AddLine(91,24,53,24)
$symbol.AddBezier(53,24,38,24,27,34,27,47)
$symbol.AddBezier(27,47,27,58,34,65,48,69)
$symbol.AddLine(48,69,71,75)
$symbol.AddBezier(71,75,76,76,79,79,79,82)
$symbol.AddBezier(79,82,79,86,75,89,69,89)
$symbol.AddLine(69,89,34,89); $symbol.AddLine(34,89,26,104); $symbol.AddLine(26,104,70,104)
$symbol.AddBezier(70,104,88,104,101,95,101,80)
$symbol.AddBezier(101,80,101,68,93,60,79,56)
$symbol.AddLine(79,56,56,50)
$symbol.AddBezier(56,50,51,49,48,47,48,44)
$symbol.AddBezier(48,44,48,40,52,38,57,38)
$symbol.AddLine(57,38,83,38); $symbol.CloseFigure()
$graphics.FillPath($ink,$background)
$graphics.DrawPath($edge,$border)
$graphics.FillPath($white,$symbol)
$sizes = @(16,19,24,32,48,64,128,256)
$images = @()
foreach ($size in $sizes) {
    $scaled = New-Object Drawing.Bitmap $size,$size
    $canvas = [Drawing.Graphics]::FromImage($scaled)
    $canvas.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $canvas.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $canvas.DrawImage($bitmap,0,0,$size,$size)
    $file = Join-Path $destination "icon-$size.png"
    $scaled.Save($file,[Drawing.Imaging.ImageFormat]::Png)
    $images += ,([IO.File]::ReadAllBytes($file))
    $canvas.Dispose(); $scaled.Dispose()
}
$stream = [IO.File]::Create((Join-Path $destination 'app.ico'))
$writer = New-Object IO.BinaryWriter $stream
$writer.Write([uint16]0); $writer.Write([uint16]1); $writer.Write([uint16]$sizes.Count)
$offset = 6 + 16 * $sizes.Count
for ($index = 0; $index -lt $sizes.Count; $index++) {
    $dimension = if ($sizes[$index] -eq 256) { 0 } else { $sizes[$index] }
    $writer.Write([byte]$dimension); $writer.Write([byte]$dimension)
    $writer.Write([byte]0); $writer.Write([byte]0); $writer.Write([uint16]1); $writer.Write([uint16]32)
    $writer.Write([uint32]$images[$index].Length); $writer.Write([uint32]$offset)
    $offset += $images[$index].Length
}
foreach ($bytes in $images) { $writer.Write([byte[]]$bytes) }
$writer.Dispose(); $stream.Dispose()
foreach ($item in @($background,$border,$symbol,$ink,$white,$edge,$graphics,$bitmap)) { $item.Dispose() }
$public = Join-Path $root 'super-power-browser-web\public'
New-Item -ItemType Directory -Path $public -Force | Out-Null
Copy-Item -LiteralPath (Join-Path $destination 'mark.svg') -Destination (Join-Path $public 'brand-mark.svg')
Copy-Item -LiteralPath (Join-Path $destination 'app.ico') -Destination (Join-Path $public 'favicon.ico')
Write-Output 'Generated original SuperPower SVG, PNG and multi-size ICO assets.'
