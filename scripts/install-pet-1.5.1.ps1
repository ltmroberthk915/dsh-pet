<#
  安装 dsh-pets-multiworkers 1.5.1（宠物看板「命名」→「保持对话专宠」）

  为什么必须退出 DSH 才能跑：
  pnpm 替换已安装包时，Windows 不允许覆盖正在被进程打开的文件（EPERM），
  而且 pnpm 在重试改名之前会尽量清掉目标目录——被占用时不只"没换成"，
  旁边的文件也可能已经被删。所以本脚本要求 DSH 完全退出后再执行。

  用法（完整退出 DSH 之后）：
    pwsh -NoProfile -ExecutionPolicy Bypass -File .\scripts\install-pet-1.5.1.ps1
  或直接双击 install-pet-1.5.1.cmd

  做了什么：
    1. 确认没有 DeepSeek Harness 进程（有就停手，不动你的正在运行的实例）
    2. 校验 1.5.1 包 SHA256 与打包回执一致
    3. 备份当前已安装的宠物包（同目录，绝不删旧的）
    4. dsh plugin --profile <pf> add 安装新包
    5. 回读安装结果：client.js 里必须是新文案，旧文案必须不在
    6. 任何一步失败都停下并给出恢复命令
#>
[CmdletBinding()]
param(
  [string]$Profile = 'desktop',
  [string]$Tgz = 'C:\Users\Ming\.dsh\vendor\dsh-pets-multiworkers-1.5.1.tgz',
  [string]$ExpectedSha256 = 'ebf2e9747ee8d8a08754bbd1d24e7cca79810060f3619dd30ee3be18cdc082c3',
  [string]$DshCli = 'D:\Users\Ming\AppData\Local\Programs\DeepSeek Harness\resources\runtime\cli\bin\dsh.cmd',
  [switch]$UseWebProfile
)
$ErrorActionPreference = 'Stop'

function Fail([string]$message) {
  Write-Host ''
  Write-Host "失败：$message" -ForegroundColor Red
  Write-Host "已安装的旧包备份在：$script:BackupDir" -ForegroundColor Yellow
  Write-Host '恢复命令（会覆盖当前安装）：' -ForegroundColor Yellow
  Write-Host ("  Remove-Item -LiteralPath `"$script:PkgDir`" -Recurse -Force; Copy-Item -LiteralPath `"$script:BackupDir\pkg`" -Destination `"$script:PkgDir`" -Recurse")
  exit 1
}

Write-Host '=== 1/5 确认 DSH 已退出 ==='
$running = @(Get-Process -Name 'DeepSeek Harness' -ErrorAction SilentlyContinue)
if ($running.Count -gt 0) {
  Write-Host ("检测到 $($running.Count) 个 DeepSeek Harness 进程：" + (($running | ForEach-Object { $_.Id }) -join ', ')) -ForegroundColor Yellow
  Write-Host '请在托盘里完整退出 DSH（不是关窗口），然后重新运行本脚本。' -ForegroundColor Yellow
  Write-Host '本脚本不会结束这些进程。' -ForegroundColor Yellow
  exit 2
}
Write-Host 'DSH 未运行，可以安全替换文件。'

Write-Host ''
Write-Host '=== 2/5 校验安装包 ==='
if (-not (Test-Path -LiteralPath $Tgz)) { Fail "找不到安装包：$Tgz" }
$actual = (Get-FileHash -LiteralPath $Tgz -Algorithm SHA256).Hash.ToLower()
if ($actual -ne $ExpectedSha256.ToLower()) { Fail "SHA256 不匹配（期望 $ExpectedSha256，实际 $actual）" }
Write-Host "SHA256 一致：$actual"
Write-Host ("大小：" + [math]::Round((Get-Item -LiteralPath $Tgz).Length / 1MB, 1) + ' MB')

Write-Host ''
Write-Host '=== 3/5 备份当前安装 ==='
$script:PkgDir = "C:\Users\Ming\.dsh\profiles\$Profile\node_modules\dsh-pets-multiworkers"
$script:BackupDir = 'D:\BuyKey\dsh-backup-pet-install-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
New-Item -ItemType Directory -Path $script:BackupDir -Force | Out-Null
if (Test-Path -LiteralPath $script:PkgDir) {
  Copy-Item -LiteralPath $script:PkgDir -Destination (Join-Path $script:BackupDir 'pkg') -Recurse -Force
  $oldVersion = (Get-Content -Raw (Join-Path $script:PkgDir 'package.json') | ConvertFrom-Json).version
  Write-Host "已备份 $oldVersion -> $($script:BackupDir)\pkg"
} else {
  Write-Host '当前未安装该包，跳过备份。'
}
foreach ($f in @('package.json', 'pnpm-lock.yaml', 'cordis.patch.yml')) {
  $p = "C:\Users\Ming\.dsh\profiles\$Profile\$f"
  if (Test-Path -LiteralPath $p) { Copy-Item -LiteralPath $p -Destination (Join-Path $script:BackupDir $f) -Force }
}
Write-Host "profile 配置也已备份到 $($script:BackupDir)"

Write-Host ''
Write-Host '=== 4/5 安装 ==='
if (-not (Test-Path -LiteralPath $DshCli)) { Fail "找不到 DSH CLI：$DshCli" }
$spec = 'dsh-pets-multiworkers@file:' + ($Tgz -replace '\\', '/')
Write-Host "执行：dsh plugin --profile $Profile add $spec"
& $DshCli plugin --profile $Profile add $spec
if ($LASTEXITCODE -ne 0) { Fail "dsh plugin add 退出码 $LASTEXITCODE" }

Write-Host ''
Write-Host '=== 5/5 回读安装结果 ==='
if (-not (Test-Path -LiteralPath $script:PkgDir)) { Fail "安装后找不到包目录：$script:PkgDir" }
$newVersion = (Get-Content -Raw (Join-Path $script:PkgDir 'package.json') | ConvertFrom-Json).version
Write-Host "已安装版本：$newVersion"
if ($newVersion -ne '1.5.1') { Fail "版本不是 1.5.1，而是 $newVersion" }
$client = Get-Content -Raw (Join-Path $script:PkgDir 'lib\client.js')
# The esbuild output escapes non-ASCII as \uXXXX, so match the escaped form
# ("保持对话专宠" == \u4FDD\u6301\u5BF9\u8BDD\u4E13\u5BA0) or a literal, whichever
# the build emitted; the structural probes below are the real gate anyway.
$keepText = ([string][char]0x4FDD + [char]0x6301 + [char]0x5BF9 + [char]0x8BDD + [char]0x4E13 + [char]0x5BA0)
$escaped = ($keepText.ToCharArray() | ForEach-Object { '\u{0:X4}' -f [int]$_ }) -join ''
if ($client -notmatch [regex]::Escape($keepText) -and $client -notmatch [regex]::Escape($escaped)) {
  Fail 'client.js 里没有「保持对话专宠」文案，替换未生效'
}
if ($client -notmatch 'onToggleKeep') { Fail 'client.js 里没有看板保持按钮的处理函数' }
if ($client -match 'renameRow') { Fail 'client.js 里仍有旧的改名面板代码' }
if ($client -match 'pet_nameInput') { Fail 'client.js 里仍有旧的改名输入框样式' }
$voice = Join-Path $script:PkgDir 'assets\blue-whale-business\voice.json'
$voiceJson = Get-Content -Raw $voice | ConvertFrom-Json
if (-not ($voiceJson.panel.labels.PSObject.Properties.Name -contains 'keep')) { Fail '商务鲸鱼声音包没有 keep 标签' }
if ($voiceJson.panel.labels.PSObject.Properties.Name -contains 'rename') { Fail '商务鲸鱼声音包仍带废弃的 rename 标签' }
$bridge = Get-Content -Raw (Join-Path $script:PkgDir 'desktop\bridge-manifest.json') | ConvertFrom-Json
if ($bridge.version -ne '1.5.1') { Fail "桌面桥清单版本是 $($bridge.version)，不是 1.5.1" }
Write-Host '文案、声音包与桌面桥清单全部核对通过。'

if ($UseWebProfile) {
  Write-Host ''
  Write-Host '=== 附加：web profile ==='
  & $DshCli plugin --profile web add $spec
  if ($LASTEXITCODE -ne 0) { Write-Host "web profile 安装失败（退出码 $LASTEXITCODE），desktop 已经装好，可稍后单独重试。" -ForegroundColor Yellow }
  else { Write-Host 'web profile 也已更新。' }
}

Write-Host ''
Write-Host '完成。现在重新打开 DeepSeek Harness：' -ForegroundColor Green
Write-Host '  右键宠物 → 看板里的按钮是「补充能量 / 保持对话专宠 / 隐藏」，不再有「命名」。'
Write-Host "  旧安装备份：$($script:BackupDir)"
