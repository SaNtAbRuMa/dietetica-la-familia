Add-Type -AssemblyName System.Drawing

$sourcePath = Join-Path $PSScriptRoot "..\WhatsApp Image 2026-10-14 at 10.32.24.jpeg"
$outDir = Join-Path $PSScriptRoot "..\public\images\stories"

$img = [System.Drawing.Bitmap]::FromFile((Resolve-Path $sourcePath))

$cropRadius = 45 # 90x90 circle
$highlights = @(
    @{ Name = "story-ustedes.png";    CenterX = 38;  CenterY = 726 },
    @{ Name = "story-sin-tacc.png";   CenterX = 155; CenterY = 726 },
    @{ Name = "story-productos.png";  CenterX = 272; CenterY = 726 },
    @{ Name = "story-pedidos.png";    CenterX = 390; CenterY = 726 },
    @{ Name = "story-recetas.png";    CenterX = 508; CenterY = 726 }
)

foreach ($h in $highlights) {
    $size = $cropRadius * 2
    $cropX = [Math]::Max(0, [int]($h.CenterX - $cropRadius))
    $cropY = [Math]::Max(0, [int]($h.CenterY - $cropRadius))
    
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    
    $srcRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $size, $size)
    $dstRect = New-Object System.Drawing.Rectangle(0, 0, $size, $size)
    $g.DrawImage($img, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)
    
    # Make transparent outside circle
    $c = $size / 2.0
    for ($y = 0; $y -lt $size; $y++) {
        for ($x = 0; $x -lt $size; $x++) {
            $d = [Math]::Sqrt(($x - $c) * ($x - $c) + ($y - $c) * ($y - $c))
            if ($d -gt ($cropRadius - 1)) {
                $bmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
            }
        }
    }
    
    $outPath = Join-Path $outDir $h.Name
    $bmp.Save($outPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    $g.Dispose()
    Write-Host "Saved $($h.Name)"
}

$img.Dispose()
