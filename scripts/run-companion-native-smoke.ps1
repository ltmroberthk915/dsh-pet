param(
  [string]$EntryPoint = 'scripts/companion-smoke/smoke.mjs',
  [string]$OutputName = 'companion-verification',
  [string]$RuntimeRoot,
  [ValidateSet('', '1', '1.75', '2')][string]$ScaleFactor = ''
)
$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$fixtureRoot = if ($RuntimeRoot) { [IO.Path]::GetFullPath($RuntimeRoot) } else { [IO.Path]::GetFullPath((Join-Path $taskRoot '../electron-smoke')) }
$fixtureExecutable = if ($RuntimeRoot) { 'DshPetDesktop.exe' } else { 'DeepSeek Harness.exe' }
$fixturePackage = Join-Path $fixtureRoot 'resources/app/package.json'
$outputDir = Join-Path $taskRoot ('output/' + $OutputName)
$previousPackage = [IO.File]::ReadAllText($fixturePackage)
$fixtureProcess = $null
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
try {
  $fixtureManifest = $previousPackage | ConvertFrom-Json
  $fixtureManifest.main = [IO.Path]::GetRelativePath((Join-Path $fixtureRoot 'resources/app'), (Join-Path $taskRoot $EntryPoint))
  [IO.File]::WriteAllText($fixturePackage, ($fixtureManifest | ConvertTo-Json), [Text.UTF8Encoding]::new($false))
  $fixtureArgs = @('--enable-logging')
  if ($ScaleFactor) { $fixtureArgs += '--force-device-scale-factor=' + $ScaleFactor }
  $fixtureProcess = Start-Process -FilePath (Join-Path $fixtureRoot $fixtureExecutable) -WorkingDirectory $fixtureRoot -WindowStyle Hidden -PassThru -ArgumentList $fixtureArgs -RedirectStandardOutput (Join-Path $outputDir 'native-stdout.txt') -RedirectStandardError (Join-Path $outputDir 'native-stderr.txt')
  if (-not $fixtureProcess.WaitForExit(90000)) {
    $fixtureProcess.Kill()
    throw 'Isolated companion fixture timed out.'
  }
  $resultPath = Join-Path $outputDir 'native-results.json'
  if (-not (Test-Path -LiteralPath $resultPath)) {
    Get-Content (Join-Path $outputDir 'native-stderr.txt')
    throw 'Isolated fixture did not write a result.'
  }
  $result = [IO.File]::ReadAllText($resultPath) | ConvertFrom-Json
  [PSCustomObject]@{success=$result.success; checks=$result.checks.Count; error=$result.error} | ConvertTo-Json
  if (-not $result.success) { exit 1 }
} finally {
  [IO.File]::WriteAllText($fixturePackage, $previousPackage, [Text.UTF8Encoding]::new($false))
}
