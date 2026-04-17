[CmdletBinding()]
param(
 [string]$SvgRoot = "",
 [string]$OutputPath = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$scriptRoot = if($PSScriptRoot){
 $PSScriptRoot
}elseif($MyInvocation.MyCommand.Path){
 Split-Path -Parent $MyInvocation.MyCommand.Path
}else{
 (Get-Location).Path
}

if([string]::IsNullOrWhiteSpace($SvgRoot)){
 $SvgRoot = Join-Path $scriptRoot "svg"
}

if([string]::IsNullOrWhiteSpace($OutputPath)){
 $OutputPath = Join-Path $scriptRoot "svg-icon-manifest.js"
}

function Convert-ToSlug([string]$Text){
 if([string]::IsNullOrWhiteSpace($Text)){
  return "item"
 }

 $normalized = $Text.Normalize([Text.NormalizationForm]::FormD)
 $builder = [System.Text.StringBuilder]::new()

 foreach($char in $normalized.ToCharArray()){
  $category = [Globalization.CharUnicodeInfo]::GetUnicodeCategory($char)
  if($category -ne [Globalization.UnicodeCategory]::NonSpacingMark){
   [void]$builder.Append($char)
  }
 }

 $ascii = $builder.ToString().Normalize([Text.NormalizationForm]::FormC).ToLowerInvariant()
 $ascii = [regex]::Replace($ascii, "[^a-z0-9]+", "-").Trim("-")

 if([string]::IsNullOrWhiteSpace($ascii)){
  return "item"
 }

 return $ascii
}

function Convert-ToLabel([string]$Text){
 if([string]::IsNullOrWhiteSpace($Text)){
  return "Sem nome"
 }

 $collapsed = [regex]::Replace(($Text -replace "[_\-]+", " "), "\s+", " ").Trim()
 if([string]::IsNullOrWhiteSpace($collapsed)){
  return "Sem nome"
 }

 $culture = [Globalization.CultureInfo]::GetCultureInfo("pt-BR")
 return $culture.TextInfo.ToTitleCase($collapsed.ToLower($culture))
}

function Normalize-StyleColor([string]$StyleValue){
 if([string]::IsNullOrWhiteSpace($StyleValue)){
  return ""
 }

 $segments = New-Object System.Collections.Generic.List[string]

 foreach($part in ($StyleValue -split ";")){
  $segment = $part.Trim()
  if(-not $segment){
   continue
  }

  $pair = $segment -split ":", 2
  if($pair.Count -ne 2){
   $segments.Add($segment)
   continue
  }

  $name = $pair[0].Trim()
  $value = $pair[1].Trim()
  $lowerName = $name.ToLowerInvariant()
  $lowerValue = $value.ToLowerInvariant()

  if($lowerName -eq "fill" -and $lowerValue -notmatch "^(none|currentcolor|url\(#)"){
   $segments.Add("fill:currentColor")
   continue
  }

  if($lowerName -eq "stroke" -and $lowerValue -notmatch "^(none|currentcolor|url\(#)"){
   $segments.Add("stroke:currentColor")
   continue
  }

  $segments.Add("${name}:$value")
 }

 return ($segments -join "; ")
}

function Get-FirstMatchValue([string]$Text, [string[]]$Patterns){
 foreach($pattern in $Patterns){
  $match = [regex]::Match($Text, $pattern, [Text.RegularExpressions.RegexOptions]::IgnoreCase)
  if($match.Success){
   return $match.Groups[1].Value
  }
 }

 return ""
}

function Convert-ToInvariantNumber([string]$Value){
 if([string]::IsNullOrWhiteSpace($Value)){
  return 0
 }

 $clean = ($Value -replace "[^0-9\.\-]", "")
 if([string]::IsNullOrWhiteSpace($clean)){
  return 0
 }

 return [double]::Parse($clean, [Globalization.CultureInfo]::InvariantCulture)
}

function Get-RelativePathSafe([string]$BasePath, [string]$TargetPath){
 $baseUri = New-Object System.Uri(((Resolve-Path -LiteralPath $BasePath).Path.TrimEnd("\") + "\"))
 $targetUri = New-Object System.Uri((Resolve-Path -LiteralPath $TargetPath).Path)
 return $baseUri.MakeRelativeUri($targetUri).ToString().Replace("\", "/")
}

function Get-SanitizedSvgData([string]$FilePath){
 $raw = Get-Content -LiteralPath $FilePath -Raw -Encoding UTF8
 $viewBox = Get-FirstMatchValue $raw @(
  'viewBox\s*=\s*"([^"]+)"',
  "viewBox\s*=\s*'([^']+)'"
 )

 $width = 0
 $height = 0

 if($viewBox){
  $parts = $viewBox -split "\s+" | Where-Object { $_ }
  if($parts.Count -ge 4){
   $width = Convert-ToInvariantNumber $parts[2]
   $height = Convert-ToInvariantNumber $parts[3]
  }
 }

 if(-not $viewBox){
  $rawWidth = Get-FirstMatchValue $raw @(
   'width\s*=\s*"([^"]+)"',
   "width\s*=\s*'([^']+)'"
  )
  $rawHeight = Get-FirstMatchValue $raw @(
   'height\s*=\s*"([^"]+)"',
   "height\s*=\s*'([^']+)'"
  )
  $width = Convert-ToInvariantNumber $rawWidth
  $height = Convert-ToInvariantNumber $rawHeight

  if($width -gt 0 -and $height -gt 0){
   $viewBox = "0 0 $width $height"
  }
 }

 if(-not $viewBox){
  $viewBox = "0 0 1024 1024"
  $width = 1024
  $height = 1024
 }

 if($width -le 0 -or $height -le 0){
  $parts = $viewBox -split "\s+" | Where-Object { $_ }
  if($parts.Count -ge 4){
   $width = [Math]::Max(1, (Convert-ToInvariantNumber $parts[2]))
   $height = [Math]::Max(1, (Convert-ToInvariantNumber $parts[3]))
  }else{
   $width = 1024
   $height = 1024
  }
 }

 $svgMatch = [regex]::Match($raw, "<svg\b[^>]*>([\s\S]*?)</svg>", [Text.RegularExpressions.RegexOptions]::IgnoreCase)
 if(-not $svgMatch.Success){
  throw "Não foi possível ler o conteúdo do SVG: $FilePath"
 }

 $inner = $svgMatch.Groups[1].Value
 $inner = [regex]::Replace($inner, "<!--[\s\S]*?-->", "", [Text.RegularExpressions.RegexOptions]::IgnoreCase)
 $inner = [regex]::Replace($inner, "<metadata\b[\s\S]*?</metadata>", "", [Text.RegularExpressions.RegexOptions]::IgnoreCase)
 $inner = [regex]::Replace($inner, "<title\b[\s\S]*?</title>", "", [Text.RegularExpressions.RegexOptions]::IgnoreCase)
 $inner = [regex]::Replace($inner, "<desc\b[\s\S]*?</desc>", "", [Text.RegularExpressions.RegexOptions]::IgnoreCase)
 $inner = [regex]::Replace($inner, "<style\b[\s\S]*?</style>", "", [Text.RegularExpressions.RegexOptions]::IgnoreCase)
 $inner = [regex]::Replace($inner, "<defs\b[\s\S]*?</defs>", "", [Text.RegularExpressions.RegexOptions]::IgnoreCase)
 $inner = [regex]::Replace($inner, '\sclass=(["'']).*?\1', "")
 $inner = [regex]::Replace($inner, '\sid=(["'']).*?\1', "")

 $inner = [regex]::Replace($inner, 'fill=(["''])(?!none\b|currentColor\b|url\(#)[^"'']*\1', 'fill="currentColor"', [Text.RegularExpressions.RegexOptions]::IgnoreCase)
 $inner = [regex]::Replace($inner, 'stroke=(["''])(?!none\b|currentColor\b|url\(#)[^"'']*\1', 'stroke="currentColor"', [Text.RegularExpressions.RegexOptions]::IgnoreCase)

 $inner = [regex]::Replace(
  $inner,
  'style=(["''])(.*?)\1',
  {
   param($match)
   $style = Normalize-StyleColor $match.Groups[2].Value
   if([string]::IsNullOrWhiteSpace($style)){
    return ""
   }
   return 'style="' + $style + '"'
  },
  [Text.RegularExpressions.RegexOptions]::IgnoreCase
 )

 $inner = [regex]::Replace($inner, "\s{2,}", " ")
 $inner = $inner.Trim()

 return [PSCustomObject]@{
  ViewBox = $viewBox
  Width = [Math]::Round($width, 2)
  Height = [Math]::Round($height, 2)
  Markup = $inner
 }
}

if(-not (Test-Path -LiteralPath $SvgRoot)){
 throw "Pasta SVG não encontrada em $SvgRoot"
}

$categories = New-Object System.Collections.Generic.List[object]
$folderIndex = @{}
$fileIndex = @{}

$folders = Get-ChildItem -LiteralPath $SvgRoot -Directory | Sort-Object Name
foreach($folder in $folders){
 $folderKey = Convert-ToSlug $folder.BaseName
 if($folderIndex.ContainsKey($folderKey)){
  $folderIndex[$folderKey]++
  $folderKey = "$folderKey-$($folderIndex[$folderKey])"
 }else{
  $folderIndex[$folderKey] = 1
 }

 $icons = New-Object System.Collections.Generic.List[object]
 $svgFiles = Get-ChildItem -LiteralPath $folder.FullName -File -Filter *.svg | Sort-Object Name

 foreach($svgFile in $svgFiles){
  $asset = Get-SanitizedSvgData $svgFile.FullName
  $baseKey = Convert-ToSlug $svgFile.BaseName
  $iconKey = "$folderKey-$baseKey"

  if($fileIndex.ContainsKey($iconKey)){
   $fileIndex[$iconKey]++
   $iconKey = "$iconKey-$($fileIndex[$iconKey])"
  }else{
   $fileIndex[$iconKey] = 1
  }

  $relativePath = Get-RelativePathSafe $scriptRoot $svgFile.FullName
  $icons.Add([PSCustomObject]@{
   key = $iconKey
   label = Convert-ToLabel $svgFile.BaseName
   src = $relativePath
   viewBox = $asset.ViewBox
   width = $asset.Width
   height = $asset.Height
   markup = $asset.Markup
  })
 }

 if($icons.Count -gt 0){
  $categories.Add([PSCustomObject]@{
   key = $folderKey
   title = Convert-ToLabel $folder.BaseName
   icons = $icons
  })
 }
}

$manifest = [PSCustomObject]@{
 generatedAt = (Get-Date).ToString("s")
 categories = $categories
}

$json = $manifest | ConvertTo-Json -Depth 8 -Compress
$content = @(
 "window.SVG_ICON_MANIFEST = $json;"
 ""
) -join [Environment]::NewLine

Set-Content -LiteralPath $OutputPath -Value $content -Encoding UTF8
Write-Host "Manifesto SVG atualizado em $OutputPath"
