Add-Type -AssemblyName System.Drawing

$sourcePath = Join-Path $PSScriptRoot "..\WhatsApp Image 2026-10-14 at 10.32.24 (1).jpeg"
$outDir = Join-Path $PSScriptRoot "..\public\images"
if (!(Test-Path $outDir)) { New-Item -ItemType Directory -Path $outDir -Force }

$img = [System.Drawing.Bitmap]::FromFile((Resolve-Path $sourcePath))

# Find the bounding box of non-white pixels
$minX = $img.Width
$maxX = 0
$minY = $img.Height
$maxY = 0

for ($y = 0; $y -lt $img.Height; $y += 2) {
    for ($x = 0; $x -lt $img.Width; $x += 2) {
        $pixel = $img.GetPixel($x, $y)
        if ($pixel.R -lt 240 -or $pixel.G -lt 240 -or $pixel.B -lt 240) {
            if ($x -lt $minX) { $minX = $x }
            if ($x -gt $maxX) { $maxX = $x }
            if ($y -lt $minY) { $minY = $y }
            if ($y -gt $maxY) { $maxY = $y }
        }
    }
}

$cropW = $maxX - $minX
$cropH = $maxY - $minY
$size = [Math]::Max($cropW, $cropH)

$centerX = ($minX + $maxX) / 2
$centerY = ($minY + $maxY) / 2

$finalSize = $size
$cropX = [Math]::Max(0, [int]($centerX - ($finalSize / 2)))
$cropY = [Math]::Max(0, [int]($centerY - ($finalSize / 2)))

$targetBmp = New-Object System.Drawing.Bitmap($finalSize, $finalSize, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [System.Drawing.Graphics]::FromImage($targetBmp)
$graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

$srcRect = New-Object System.Drawing.Rectangle($cropX, $cropY, $finalSize, $finalSize)
$dstRect = New-Object System.Drawing.Rectangle(0, 0, $finalSize, $finalSize)
$graphics.DrawImage($img, $dstRect, $srcRect, [System.Drawing.GraphicsUnit]::Pixel)

# Make pixels outside the circle radius transparent
$centerPt = $finalSize / 2.0
$radius = ($finalSize / 2.0) - 1.0

for ($y = 0; $y -lt $finalSize; $y++) {
    for ($x = 0; $x -lt $finalSize; $x++) {
        $dx = $x - $centerPt
        $dy = $y - $centerPt
        $dist = [Math]::Sqrt($dx * $dx + $dy * $dy)
        if ($dist -gt $radius) {
            $targetBmp.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 0, 0, 0))
        }
    }
}

$targetPath = Join-Path $outDir "logo-la-familia-real.png"
$targetBmp.Save($targetPath, [System.Drawing.Imaging.ImageFormat]::Png)

# Also save a 128x128 version for favicon / icon
$iconBmp = New-Object System.Drawing.Bitmap(128, 128, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
$gIcon = [System.Drawing.Graphics]::FromImage($iconBmp)
$gIcon.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$gIcon.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$gIcon.DrawImage($targetBmp, 0, 0, 128, 128)
$iconPath = Join-Path $outDir "logo-la-familia-icon.png"
$iconBmp.Save($iconPath, [System.Drawing.Imaging.ImageFormat]::Png)

$img.Dispose()
$graphics.Dispose()
$targetBmp.Dispose()
$gIcon.Dispose()
$iconBmp.Dispose()

Write-Host "Real transparent logo successfully saved!"
