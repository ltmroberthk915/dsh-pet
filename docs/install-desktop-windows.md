# Windows 独立桌宠安装

v1.3.2 完整预编译包包含鲸鱼娘、MIKU、商务小蓝鲸及独立窗口。安装入口、重复安装和市场限制见 [README](../README.zh.md#安装与更新) 与 [新机修复说明](fresh-install-v1.3.2.md)。

安装或升级后保存工作，完整退出 DSH 后重新打开。首次进程内安装可以热加载，覆盖旧版要求重启，不能把“包已下载”当成“新版本已经运行”。宿主加载插件后默认自动准备独立窗口，无需 Agent、PowerShell 补丁或额外 Node/Electron 安装。

- 运行库复制到 $DSH_HOME/cache/pet-desktop/runtime；位置和 Chromium 数据位于同目录的 window-data。不会修改宿主 app.asar 或账户/会话数据。
- 首次准备需要数百 MiB 空间，设置页显示进度、运行版本和具体错误。失败后可点「重试独立窗口」或「宠物窗口归位」。
- 主窗口最小化后宠物继续显示；退出 DSH、停用插件或关闭桌面开关后宠物关闭。
- 私有服务只监听随机本机端口，使用启动凭证；窗口保留沙箱、上下文隔离与来源校验。
- 旧补丁桥接自动停止旧窗口；本版窗口直接读取当前插件，后续更新一起生效。

宿主连接失败时页面持续重连并保留草稿。401/403 表示未获授权，不能直接断言插件没加载。无需手改 settings.yaml。纯 Web 和其他平台使用应用内宠物。没有直接操作用户的另一台新电脑；验证边界见新机修复说明。

---

## 历史宿主补丁工具（可选维护，新安装无需执行）

下文保留旧补丁检查、安装和回滚入口，用于已有旧部署的维护。它只接受经过审查的 DSH Desktop **0.2.0-rc.2** 归档；未知构建显示 SHA256 并拒绝覆盖。自动窗口不调用这些安装命令。

## 1. 安装插件

从[同版本 Release](https://github.com/ltmroberthk915/dsh-pet/releases/tag/v1.3.0)下载主包 `dsh-session-pet.tgz`，在 DSH 外部终端执行：

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
