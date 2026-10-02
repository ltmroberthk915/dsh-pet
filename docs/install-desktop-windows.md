# Windows 独立桌宠：安装插件即可使用

适用插件：`@ltmroberthk915/dsh-pet` v1.2.0 起。原生 Windows DSH 安装并启用插件后，独立窗口自动启动；新电脑无需 Agent、PowerShell 补丁、额外 Node 或 Electron 安装，也无需退出 DSH。

```powershell
dsh plugin --profile desktop add https://github.com/ltmroberthk915/dsh-pet/releases/download/v1.2.0/dsh-session-pet.tgz
```

在「设置 → 宠物」勾选「独立桌面宠物」并保存（默认开启）。首次准备需等待运行库复制和校验完成，设置页随后显示「独立窗口已运行 · 1.2.0」。鲸鱼娘、MIKU、商务小蓝鲸共用这套窗口，插件更新时渲染器一同更新。

如果已经安装旧版，可使用插件管理器的更新操作，或 `dsh plugin --profile desktop update @ltmroberthk915/dsh-pet`；固定旧版 URL 的依赖应改用上面的新版 URL。避免反复用 GUI「安装」提交完全相同的 URL，DSH 可能无法识别此次依赖变化。原生桌面使用 `desktop` profile，`web` 仅用于 Web 宿主。

### 自动窗口如何运行

- 插件识别当前原生 DSH Host 的可执行文件，复制并校验其 Electron 运行文件到当前用户 `%LOCALAPPDATA%\dsh-pet\<数据目录标识>\runtime`。约需数百 MiB 磁盘空间，不复制宿主 `app.asar` 或账户/会话文件，不依赖网络下载。
- 复制完成后运行插件自己的窗口入口。宿主安装目录保持原样，窗口代码直接来自当前插件，后续宿主升级会按实际运行文件指纹选择缓存。
- 窗口位置和 Chromium 缓存在同目录的 `window-data` 中。养成数据仍使用原来的宠物持久层。自定义 `DSH_HOME` 会隔离对应窗口数据。
- 主窗口隐藏或最小化后宠物继续运行；停用或卸载插件、退出 DSH 后窗口关闭。通信中断时窗口自行退出，关闭桌面开关则收起所有宠物窗口。
- 私有服务只监听随机本地端口，使用每次启动生成的凭证，只提供宠物 API；凭证不写入文件、命令行或浏览器页面。窗口仍启用沙箱、上下文隔离及来源校验。
- 已有旧补丁的主窗口桥接会停用旧窗口。旧补丁文件可以保留；当前窗口与它解耦。若要恢复宿主，请按下面的历史收据回滚说明操作。

本机已用 DSH Desktop 0.2.0-rc.2 / Electron 44 的真实运行库验证自动启动与三种形象。Windows 以外平台、纯 Web Host 或未来禁止外部应用入口的 Electron 构建可能不支持此路径；失败时应用内宠物继续可用，设置页显示原因和「重试独立窗口」。没有在用户的另一台新电脑直接测试。

### 排查

磁盘空间不足或缓存目录不可写：按设置页提示处理后点击重试。若收到 `ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED`、找不到 `pnpm` 或 `ERR_PNPM_IGNORED_BUILDS`，正在使用旧 Git 安装链路，请改用本版完整 Release 包；不需要修改全局 `strictDepBuilds` 或添加提交 SHA 白名单。详见 [README 排查表](../README.zh.md#安装故障排查)。

---

## 历史宿主补丁工具（可选维护，新安装无需执行）

下文保留旧补丁检查、安装和回滚入口，用于已有旧部署的维护。它只接受经过审查的 DSH Desktop **0.2.0-rc.2** 归档；未知构建显示 SHA256 并拒绝覆盖。自动窗口不调用这些安装命令。

## 1. 安装插件

从[同版本 Release](https://github.com/ltmroberthk915/dsh-pet/releases/tag/v1.2.0)下载主包 `dsh-session-pet.tgz`，在 DSH 外部终端执行：

```powershell
dsh plugin --profile desktop add .\dsh-session-pet.tgz
```

包内包含三个形象、自动窗口以及 `desktop/` 下的历史补丁维护工具。回滚旧安装时优先使用该旧安装版本附带的工具与原始收据。

## 2. 检查与应用

在插件或附件的 `desktop` 文件夹打开 PowerShell。默认自动查找 Windows 安装目录并优先使用宿主自带 Node，无须另装 Node。先运行检查：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Install-Desktop.ps1 -Mode Check
```

检查不会修改安装。它在内存中构建并校验目标归档，`compatible` 表示产物通过哈希闸门，`outputSha256` 为目标哈希。`not-installed` 表示可首次安装，`upgrade` 表示可升级旧补丁，`current` 表示已是本版。`running: true` 表示 DSH 仍在运行，补丁写入仍需正常退出。

保存正在进行的工作，通过 DSH 菜单或系统托盘**正常退出整个程序**，然后执行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Install-Desktop.ps1 -Mode Apply
```

工具不会结束 DSH 进程；如果程序仍在运行，就会停止。成功结果为 `installed`，并输出备份目录及 `receipt.json` 的完整路径。重复运行已安装版本不再写入或新建备份。

如自动定位失败或使用自定义路径，可明确指定：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Install-Desktop.ps1 -Mode Check `
  -AppDirectory 'D:\Apps\DeepSeek Harness' `
  -DshHome 'D:\DSH 数据' `
  -PluginDirectory 'D:\DSH 数据\profiles\desktop\node_modules\@ltmroberthk915\dsh-pet'
```

将 `Check` 改为 `Apply` 即应用。目录支持中文与空格。`-NodePath 'D:\Tools\node.exe'` 可指定 Node 22+；工具不依赖 `resources/runtime/bin/node.cmd`。

安装器也支持直接使用 Node：

```powershell
node .\install-desktop.cjs --check --app-dir 'D:\Apps\DeepSeek Harness'
node .\install-desktop.cjs --apply --app-dir 'D:\Apps\DeepSeek Harness'
```

Node 入口支持 `--dsh-home`、`--plugin-dir`。权限不足时，原归档和已生成备份保留；若程序位于受保护目录，可在管理员 PowerShell 中使用同样的明确路径重新运行。

## 3. 重启检查

重新打开原生 DSH Desktop，进入「设置 → 宠物」，开启独立桌面宠物并保存。缺少窗口接口的提示应消失。将主窗口最小化，宠物应继续显示；退出整个 DSH 后宠物关闭。在普通浏览器中打开 DSH 仍使用应用内宠物。

本次补丁将最终版桌面渲染器一并嵌入宿主，包含三种形象、五色站姿稳定修复和读取任务输出动作修正。插件、宿主适配器应使用同一发布版本。

## 4. 回滚

正常退出 DSH，在 `desktop` 目录使用安装成功时输出的收据：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\Install-Desktop.ps1 -Mode Rollback `
  -ReceiptPath 'D:\Apps\DeepSeek Harness\resources\dsh-pet-backups\安装记录目录\receipt.json'
```

备份在 `<安装目录>/resources/dsh-pet-backups/`，包含原始 `app.asar`、前后校验值、版本和修改清单。回滚只恢复该程序归档。安装、升级和回滚都不修改 `.dsh`、会话、账户、设置或亲密度数据。

若 DSH 官方升级或其他修改已改变程序归档，旧收据会拒绝回滚，避免覆盖新版宿主。官方更新可能移除桌面接口；重新运行 `Check` 确认兼容性，未知归档需重新适配。

## 验证范围

在本地使用真实已审查归档的副本完成首次安装、旧版升级、重复安装、精确回滚及失败恢复测试；中文路径、空 PATH 下宿主 Node、进程重检、未知归档拒绝、备份/写入/替换失败均有隔离测试。仅九个预期 ASAR 路径可能改变，其余文件载荷及 unpacked/link 条目保留；完整性逐文件验证。

另有三种形象、五色、会话动作及独立渲染的 Electron 检查。**尚未在用户的新电脑执行安装或最小化实测**，实际归档兼容性以该机 `Check` 结果为准。
