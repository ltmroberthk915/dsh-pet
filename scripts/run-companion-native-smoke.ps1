param(
  [string]$EntryPoint = 'scripts/companion-smoke/smoke.mjs',
  [string]$OutputName = 'companion-verification'
)
$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$fixtureRoot = [IO.Path]::GetFullPath((Join-Path $taskRoot '../electron-smoke'))
$fixturePackage = Join-Path $fixtureRoot 'resources/app/package.json'
$outputDir = Join-Path $taskRoot ('output/' + $OutputName)
$previousPackage = [IO.File]::ReadAllText($fixturePackage)
$fixtureProcess = $null
New-Item -ItemType Directory -Path $outputDir -Force | Out-Null
try {
  $fixtureManifest = $previousPackage | ConvertFrom-Json
  $fixtureManifest.main = '../../../dsh-pet/' + $EntryPoint
  [IO.File]::WriteAllText($fixturePackage, ($fixtureManifest | ConvertTo-Json), [Text.UTF8Encoding]::new($false))
  $fixtureProcess = Start-Process -FilePath (Join-Path $fixtureRoot 'DeepSeek Harness.exe') -WorkingDirectory $fixtureRoot -WindowStyle Hidden -PassThru -ArgumentList '--enable-logging' -RedirectStandardOutput (Join-Path $outputDir 'native-stdout.txt') -RedirectStandardError (Join-Path $outputDir 'native-stderr.txt')
  if (-not $fixtureProcess.WaitForExit(60000)) {
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
