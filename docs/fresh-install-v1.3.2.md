# v1.3.2 新机安装修复

这是历史版本记录。当前下载、完整 CLI 路径及迁移命令请使用 [Windows 安装指南](install-desktop-windows.md)。

本版保留 v1.3.1 的舒缓原始动作、同组配色帧及窗口缓存修复，帧率改为用户分别控制。

## 已修正

- 所有形象使用相同的帧率规则。左右跑动按固定 FPS、素材原速或 `k × 底部 tok/s + b` 播放，默认没有上限；可启用「限制左右跑动帧率」并填写上限。
- 非左右跑动动作可通过「自设其他动作速率」单独填写 FPS；关闭时保留原始逐帧时长。不强制 12 或 60 FPS，且不受跑动上限影响。
- 例如 `k = 1`、`b = 1`、底部速度为 293 tok/s 时，未设置上限的跑动预览为 294 FPS。
- npm 分发名为 `dsh-pet-copilot`。旧包用户请按当前安装指南备份、替换包并迁移 profile 中旧包名覆盖项；仅替换依赖名称不会自动修复旧配置的匹配。

- 设置 → 宠物增加「悬停展开看板」，默认关闭自动展开；仍可右键宠物打开看板。保存后重启保留开关。
- 商务小蓝鲸在每一种设定大小下按 0.75 缩放图像、占位底板和点击区域，后台小宠物再叠加原有的 52.7% 比例。

- 宿主连接失败后持续自动重试，宿主恢复后自动显示宠物选项；不再只尝试三次就永久停止。
- 将未授权（HTTP 401/403）与宿主暂不可达分开提示。HTTP 401 本身不能证明插件未加载。
- 去掉让用户编辑 `$DSH_HOME/settings.yaml` 的错误建议。断线期间禁用依赖宿主的保存，保留草稿；恢复后清除连接错误。
- 发布包收录完整预编译 JavaScript，包括额外分块及 Live2D vendor 文件，不依赖新机安装编译器、pnpm shim 或放宽 `strictDepBuilds`。
- 发布产物不带开发依赖、安装脚本或 `packageManager` 字段，保留 `dsh.bundle.patch`。

## 安装与重启

推荐分发身份为 `dsh-pet-copilot@1.3.2`，但只有 npm 实际发布并可查询后才能在市场使用该 registry 目标。准备完成的本地包不等于 npm 已发布。

从磁盘安装时，使用带包名的目标可让 DSH 在重复安装同一版本时仍识别包身份：

```powershell
dsh plugin --profile desktop add 'dsh-pet-copilot@file:C:/Downloads/dsh-pet-copilot-1.3.2.tgz'
```

使用 DSH 官方桌面安装携带的 `dsh` 入口。路径替换成实际下载位置。纯 Web 宿主使用其 `web` profile。

DSH 0.2.0-rc.2 会监听 profile 清单，首次新增 bundle 可热加载，包括通过配套 CLI 安装的情况。替换已经加载的版本、客户端 UI 变更或返回 `restart-required` 时，保存工作并完整退出 DSH 后重开。独立宠物窗口自动准备，无需宿主补丁。

新 npm 版本仍遵守 pnpm 的发布等待策略；不要承诺发布当天市场必定可装，不修改用户全局策略来绕过等待。

## 验证方式

`scripts/test-market-install.mjs` 使用隔离的 `DSH_HOME`、实际 DSH 0.2.0-rc.2 Host、官方 plugin manager、已安装的 dshmarket 桌面桥接及只监听本机的 registry 测试服务。两份真实预编译包分别覆盖首次安装、重复安装、升级和重启读回；测试服务提供已过等待期的元数据，不替代公共 npm 或另一台电脑的实际验收。

本次仅处理 dsh-pet，不修改 dsh-computer-use。
