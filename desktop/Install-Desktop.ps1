# Legacy host-patching maintenance only. DSH Pet 1.2+ needs no ASAR patch.
# Current installation instructions: docs/install-desktop-windows.md.
#requires -Version 5.1
[CmdletBinding()]
param(
  [ValidateSet('Check','Apply','Rollback')][string]$Mode = 'Check',
  [string]$AppDirectory,
  [string]$DshHome,
  [string]$PluginDirectory,
  [string]$NodePath,
  [string]$ReceiptPath
)
$ErrorActionPreference = 'Stop'
if (-not $DshHome) {
  if ($env:DSH_HOME) { $DshHome = $env:DSH_HOME }
  else { $DshHome = Join-Path ([Environment]::GetFolderPath('UserProfile')) '.dsh' }
}
if (-not $AppDirectory -and $Mode -eq 'Rollback' -and $ReceiptPath) {
  $taskReceipt = Get-Content -LiteralPath $ReceiptPath -Raw -Encoding UTF8 | ConvertFrom-Json
  $AppDirectory = $taskReceipt.appDir
}
if (-not $AppDirectory) {
  $taskCandidates = @()
  if ($env:LOCALAPPDATA) { $taskCandidates += Join-Path $env:LOCALAPPDATA 'Programs\DeepSeek Harness' }
  if ($env:ProgramFiles) { $taskCandidates += Join-Path $env:ProgramFiles 'DeepSeek Harness' }
  foreach ($taskRegistry in @('HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*','HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*','HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*')) {
    Get-ItemProperty -Path $taskRegistry -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like 'DeepSeek Harness*' -and $_.InstallLocation } | ForEach-Object { $taskCandidates += $_.InstallLocation }
  }
  $taskCandidates = @($taskCandidates | Where-Object { Test-Path -LiteralPath (Join-Path $_ 'DeepSeek Harness.exe') -PathType Leaf } | ForEach-Object { [IO.Path]::GetFullPath($_) } | Select-Object -Unique)
  if ($taskCandidates.Count -ne 1) { throw 'Set -AppDirectory to the folder containing DeepSeek Harness.exe.' }
  $AppDirectory = $taskCandidates[0]
}
$AppDirectory = [IO.Path]::GetFullPath($AppDirectory)
if (-not $NodePath) {
  $taskBundledNode = Join-Path $AppDirectory 'resources\runtime\primary-runtime\dependencies\node\bin\node.exe'
  if (Test-Path -LiteralPath $taskBundledNode -PathType Leaf) { $NodePath = $taskBundledNode }
  else {
    $taskSystemNode = Get-Command node.exe -ErrorAction SilentlyContinue
    if ($taskSystemNode) { $NodePath = $taskSystemNode.Source }
  }
}
if (-not $NodePath -or -not (Test-Path -LiteralPath $NodePath -PathType Leaf)) { throw 'Node executable unavailable. Set -NodePath to a Node.js 22+ node.exe.' }
$taskNodeVersion = & $NodePath -p 'process.versions.node'
if ($LASTEXITCODE -ne 0 -or [int]($taskNodeVersion.Split('.')[0]) -lt 22) { throw 'Node.js 22 or newer is required.' }
if (-not $PluginDirectory) {
  $taskSiblingPackage = Join-Path $PSScriptRoot '..\package.json'
  if ((Test-Path -LiteralPath $taskSiblingPackage) -and ((Get-Content -LiteralPath $taskSiblingPackage -Raw -Encoding UTF8 | ConvertFrom-Json).name -eq 'dsh-pet-copilot')) {
    $PluginDirectory = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
  } else { $PluginDirectory = Join-Path $DshHome 'profiles\desktop\node_modules\dsh-pet-copilot' }
}
$taskArguments = @((Join-Path $PSScriptRoot 'install-desktop.cjs'), ('--' + $Mode.ToLowerInvariant()), '--app-dir', $AppDirectory, '--dsh-home', $DshHome, '--plugin-dir', $PluginDirectory)
if ($ReceiptPath) { $taskArguments += @('--receipt', $ReceiptPath) }
& $NodePath @taskArguments
if ($LASTEXITCODE -ne 0) { throw 'Desktop adapter operation failed. See the diagnostic above.' }
