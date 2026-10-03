#Requires -Version 5.1
param([switch]$Apply, [string]$DshInstall = '', [string]$ProfileDirectory = '')
$ErrorActionPreference = 'Stop'
$petPreviousNodeMode = $env:ELECTRON_RUN_AS_NODE
try {
    if (-not $DshInstall) {
        $petCandidates = @(Join-Path $env:LOCALAPPDATA 'Programs/DeepSeek Harness')
        foreach ($petRegistry in @('HKCU:/Software/Microsoft/Windows/CurrentVersion/Uninstall/*', 'HKLM:/Software/Microsoft/Windows/CurrentVersion/Uninstall/*')) {
            $petEntries = Get-ItemProperty $petRegistry -ErrorAction SilentlyContinue | Where-Object { $_.DisplayName -like 'DeepSeek Harness*' }
            foreach ($petEntry in $petEntries) { if ($petEntry.InstallLocation) { $petCandidates += [string]$petEntry.InstallLocation } }
        }
        $DshInstall = $petCandidates | Where-Object { Test-Path -LiteralPath (Join-Path $_ 'DeepSeek Harness.exe') } | Select-Object -First 1
    }
    if (-not $DshInstall) { throw 'DSH Desktop was not found. Pass -DshInstall with its installation directory.' }
    if (-not $ProfileDirectory) {
        $petDataDirectory = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $env:USERPROFILE '.dsh' }
        $ProfileDirectory = Join-Path $petDataDirectory 'profiles/desktop'
    }
    $petPatch = [IO.Path]::GetFullPath((Join-Path $ProfileDirectory 'cordis.patch.yml'))
    $petExecutable = Join-Path $DshInstall 'DeepSeek Harness.exe'
    $petArguments = @('--expose-internals', (Join-Path $PSScriptRoot 'migrate-profile.mjs'), '--patch', $petPatch)
    if ($Apply) { $petArguments += '--apply' }
    $env:ELECTRON_RUN_AS_NODE = '1'
    & $petExecutable @petArguments | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "Migration failed (exit $LASTEXITCODE); inspect the error above." }
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
} finally {
    if ($null -eq $petPreviousNodeMode) { Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue }
    else { $env:ELECTRON_RUN_AS_NODE = $petPreviousNodeMode }
}
