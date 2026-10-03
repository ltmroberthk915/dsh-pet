# Windows 独立桌宠安装

当前包名为 `dsh-pet-copilot`，包含鲸鱼娘、MIKU、商务小蓝鲸及独立窗口。[安装、冷却与旧名迁移](fresh-install-v1.3.3.md)给出完整步骤。

桌面 CLI 的明确入口是安装目录下 resources/runtime/cli/bin/dsh.cmd，标准位置示例：

```powershell
& "$env:LOCALAPPDATA/Programs/DeepSeek Harness/resources/runtime/cli/bin/dsh.cmd" plugin --profile desktop why dsh-pet-copilot
```

自定义安装位置使用实际目录。不要依赖旧全局 dsh，不要将 resources/runtime/bin 加到全局 PATH。

首次新增 bundle 可以热加载；替换已加载版本、restart-required 或客户端仍旧时才完整重启。独立窗口自动准备，无需 Agent、宿主补丁或额外运行库安装。

- 校验并复制 DSH 现有 Electron 文件至 $DSH_HOME/cache/pet-desktop/runtime，不改 app.asar。
- 窗口数据位于同目录的 window-data；名字与养成数据保留在原 pet.json。
- 首次准备需要数百 MiB 空间，设置页显示运行版本、进度、错误，并提供重试和归位。
- 主窗口最小化后仍显示；退出 DSH、停用插件或关闭桌面开关后关闭。
- 服务只监听本机随机端口；窗口保留沙箱、上下文隔离与来源校验。

宿主暂不可达时持续重连并保留草稿。401/403 是授权状态，不能据此断言宿主没加载，也无需手改不存在的 settings.yaml。

## Legacy：历史宿主补丁

Install-Desktop.ps1、install-desktop.cjs、patch-desktop.cjs 及 archive-support.cjs 的 ASAR 修改功能仅用于维护 1.2 之前的历史部署，**当前安装和更新均不执行这些工具**。archive-support.cjs 还提供当前插件的文件校验函数，保留该文件不代表仍需补丁。

历史回滚应使用旧版本的工具和收据，参见 [v1.1.1 历史说明](https://github.com/ltmroberthk915/dsh-pet/blob/v1.1.1/docs/install-desktop-windows.md)。不要把旧 Apply 命令用于新安装。
