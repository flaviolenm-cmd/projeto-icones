[CmdletBinding()]
param(
 [string]$SvgRoot = ""
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

$builderScript = Join-Path $scriptRoot "build-svg-manifest.ps1"
if(-not (Test-Path -LiteralPath $builderScript)){
 throw "Script de geração não encontrado em $builderScript"
}

if(-not (Test-Path -LiteralPath $SvgRoot)){
 throw "Pasta SVG não encontrada em $SvgRoot"
}

function Invoke-Build{
 try{
  & $builderScript | Out-Null
  Write-Host ("[{0}] Manifesto atualizado." -f (Get-Date).ToString("HH:mm:ss"))
 }catch{
  Write-Warning $_
 }
}

$watcher = New-Object IO.FileSystemWatcher $SvgRoot
$watcher.IncludeSubdirectories = $true
$watcher.NotifyFilter = [IO.NotifyFilters]"DirectoryName, FileName, LastWrite"
$watcher.Filter = "*.*"
$watcher.EnableRaisingEvents = $true

$script:lastRun = [DateTime]::MinValue

$action = {
 $path = $Event.SourceEventArgs.FullPath
 $isFolderEvent = $Event.SourceEventArgs.ChangeType -eq [IO.WatcherChangeTypes]::Renamed

 if((Test-Path -LiteralPath $path -PathType Leaf) -and ([IO.Path]::GetExtension($path).ToLowerInvariant() -ne ".svg")){
  return
 }

 $now = Get-Date
 if(($now - $script:lastRun).TotalMilliseconds -lt 500){
  return
 }

 $script:lastRun = $now
 Invoke-Build
}

$registrations = @(
 Register-ObjectEvent -InputObject $watcher -EventName Created -Action $action,
 Register-ObjectEvent -InputObject $watcher -EventName Changed -Action $action,
 Register-ObjectEvent -InputObject $watcher -EventName Deleted -Action $action,
 Register-ObjectEvent -InputObject $watcher -EventName Renamed -Action $action
)

Invoke-Build
Write-Host "Monitorando $SvgRoot. Pressione Ctrl+C para encerrar."

try{
 while($true){
  Wait-Event -Timeout 1 | Out-Null
 }
}finally{
 foreach($registration in $registrations){
  Unregister-Event -SourceIdentifier $registration.Name -ErrorAction SilentlyContinue
  Remove-Job -Id $registration.Id -Force -ErrorAction SilentlyContinue
 }

 $watcher.Dispose()
}
