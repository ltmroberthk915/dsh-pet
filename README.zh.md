# 多形象会话桌宠 · dsh-pet-copilot

**npm 包名是 `dsh-pet-copilot`，GitHub 仓库是 `ltmroberthk915/dsh-pet`。** 从本仓库 [Release](https://github.com/ltmroberthk915/dsh-pet/releases) 下载同名预编译包。`dsh-session-pet.tgz` 仅作为同一包的兼容文件名保留。

本项目 fork 自 [zhu1090093659/dsh-pet](https://github.com/zhu1090093659/dsh-pet)，由 ltmroberthk915 独立维护，沿用 Apache-2.0 与原素材署名。

![五套模型配色](docs/palettes.png)

## 功能

- 鲸鱼娘、MIKU 与商务小蓝鲸；每个活跃顶层会话一个宠物，当前对话使用主大小，其他为 52.7%。商务鲸鱼的图像、底板和点击区域再统一乘以 0.75。
- 模型配色在会话首次分配后保持稳定；后台会话完成后等待查看，查看后切走时收回。
- 等待智能体时保持等待动作；打开子会话后主宠物跟随它自己的生成状态和底栏 tok/s，切回父会话后恢复父会话状态。
- 左右跑动采用固定 FPS、素材原速或 `FPS = max(1, k × 底栏 tok/s + b)`，默认没有上限，可由用户自行限制。非左右跑动动作可独立设置 FPS；关闭时保留素材原始时长。所有形象规则相同。
- 共享喂食与亲密度，支持拖动、大小和命名。悬停展开看板默认关闭，可在设置中开启；右键仍可打开看板。
- 官方 Windows DSH 自动启动独立桌宠，无需修改 app.asar 或另装 Node、Electron、PowerShell 7。

## 安装与更新

在插件管理页面填 `dsh-pet-copilot`；只有 npm 已有可解析的版本且满足本机安装策略时，该路径才可用。GitHub tag、Release 或本地打包成功均不能证明 npm 已发布；市场目录另有审核和同步过程。

终端诊断应使用**桌面安装目录中的 CLI**，不要依赖 PATH 上的旧全局 dsh：

```powershell
$dsh = "$env:LOCALAPPDATA/Programs/DeepSeek Harness/resources/runtime/cli/bin/dsh.cmd"
& $dsh plugin --profile desktop why dsh-pet-copilot
```

自定义安装位置时，把 $dsh 改为那个安装目录下 resources/runtime/cli/bin/dsh.cmd 的完整路径。不要把 resources/runtime/bin 加入全局 PATH。

离线包从对应 Release 下载 `dsh-pet-copilot-1.3.3.tgz`，按 `SHA256SUMS.txt` 核对后，用带包名的本地目标安装：

```powershell
& $dsh plugin --profile desktop add 'dsh-pet-copilot@file:C:/Downloads/dsh-pet-copilot-1.3.3.tgz'
```

替换示例路径为实际下载位置。无需自行 pack 或安装 pnpm。Web 宿主使用 web profile。

**首次新增 bundle 可以热加载。** 替换已加载版本、收到 `restart-required` 或界面仍在使用旧客户端时，保存工作后完整退出并重开 DSH；热加载成功时无需为安装本身重启。

## 旧包名迁移

先备份 DSH，在目标 profile 移除 `@ltmroberthk915/dsh-pet` 或 `@linxin666/dsh-pet` 并安装新包，再运行 Release 的 `dsh-pet-profile-migration-1.3.3.zip` 内迁移启动器，也可使用已安装包的 scripts 目录。**只保留 pet 行 ID 不足以迁移配置，DSH 还匹配 name。**

迁移器用真实宿主合成配置，备份后只修改该 profile 中 pet 覆盖项的旧名称。配置、禁用状态、注释、其他插件及共享 home 补丁保持不变。旧项与后来保存的新设置冲突，或存在别名、并发编辑时会停止说明原因。名字和养成数据仍保存在原 pet.json 中。详见 [新机与迁移说明](docs/fresh-install-v1.3.3.md)。

## 冷却策略与发布查询

DSH 0.2.0-rc.2 / pnpm 11.7.0 的**默认非严格配置**可能安装刚发布的版本并自动写入单版本 minimumReleaseAgeExclude。显式设置 minimumReleaseAge: 1440、未同时关闭严格行为时，未成熟版本会被拒绝。minimumReleaseAgeStrict: true 下，精确版本和 npm tgz URL 也不能绕过门槛；用户设置更长的冷却继续有效。默认安装成功不能证明严格配置通过，也不是所有用户都必须等 24 小时。

本项目发布者先发 npm next，确认原 latest 未变；至少满 24 小时并通过无例外的严格 registry 安装后才推广 latest。首次新包名可能暂时没有 latest。项目不会修改用户全局安装策略。

维护者运行 `node scripts/release-channel.mjs check 1.3.3`。仅检查时可设置 `DSH_PET_REGISTRY=https://registry.npmmirror.com`，输出会标明 registry 与 authoritative。网络失败会注明查询源，不会误判成未发布。promote 始终忽略镜像设置，重新查询 npm 官方源，并要求成熟后的严格安装回执。

## 构建与验证

使用 pnpm 11.7.0：依次运行 `pnpm install --frozen-lockfile --ignore-scripts`、`pnpm typecheck`、`pnpm test`、`pnpm build`，随后执行 `node scripts/build-desktop-manifest.mjs` 与 `node scripts/package-companions.mjs`。

发布包不含开发源码、测试或安装脚本，剔除未使用的 MIKU 插值帧，并重新解包验证全部素材及 JavaScript 入口。配置迁移使用实际 loadProfileDirectory 与 composeEntries；冷却验证使用隔离 profile、缓存、store、官方管理器和市场桥接。测试 registry、公共 npm 和市场目录结果分别记录，不代替另一台新机器的验收。详见 [Windows 说明](docs/install-desktop-windows.md)。
