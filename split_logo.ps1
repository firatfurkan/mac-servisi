Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('C:\Users\firat\macapp\logospor.jpg')
$width = $img.Width
$height = $img.Height
$halfHeight = [int]($height / 2)

$lightRect = New-Object System.Drawing.Rectangle(0, 0, $width, $halfHeight)
$lightImg = New-Object System.Drawing.Bitmap($width, $halfHeight)
$lightGraphics = [System.Drawing.Graphics]::FromImage($lightImg)
$lightGraphics.DrawImage($img, (New-Object System.Drawing.Rectangle(0, 0, $width, $halfHeight)), $lightRect, [System.Drawing.GraphicsUnit]::Pixel)
$lightImg.Save('C:\Users\firat\macapp\assets\images\logo_light.jpg', [System.Drawing.Imaging.ImageFormat]::Jpeg)

$darkRect = New-Object System.Drawing.Rectangle(0, $halfHeight, $width, $halfHeight)
$darkImg = New-Object System.Drawing.Bitmap($width, $halfHeight)
$darkGraphics = [System.Drawing.Graphics]::FromImage($darkImg)
$darkGraphics.DrawImage($img, (New-Object System.Drawing.Rectangle(0, 0, $width, $halfHeight)), $darkRect, [System.Drawing.GraphicsUnit]::Pixel)
$darkImg.Save('C:\Users\firat\macapp\assets\images\logo_dark.jpg', [System.Drawing.Imaging.ImageFormat]::Jpeg)

Write-Host "Success: split image ($width x $height)"
