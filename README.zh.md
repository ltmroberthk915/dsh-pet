# 多形象会话桌宠 · DSH Session Pet

独立维护的 DSH 插件：`@ltmroberthk915/dsh-pet`。本项目 fork 自 [zhu1090093659/dsh-pet](https://github.com/zhu1090093659/dsh-pet)，沿用 Apache-2.0 许可证及原素材署名；改动由 ltmroberthk915 维护。

![五套模型配色](docs/palettes.png)

## 功能

- 内置鲸鱼娘精致版、MIKU 会话版与现代商务小蓝鲸；在「设置 → 宠物」切换。新增形象的动作、配色与玩法见[说明](docs/miku-business-pets.md)。
- 每个活跃顶层会话一个宠物；当前对话使用主大小，其他为 52.7%，不弹气泡。
- 按底层模型首次分配豆沙绿 GPT、橙色 Claude、黑色 Kimi、暗紫 GLM、蓝色 DeepSeek；中途换模型不换色。
- 所有左右跑步（含工具执行）可用固定 FPS、素材原速或 `FPS = clamp(k × tok/s + b, 1, 60)`；每只跟随自己对话底栏统计。
- 后台完成的小宠物保留等待查看；打开对话就变为主宠物，不需要输入。前台查看后，切走时回收。
- 所有宠物共享累计喂食、亲密度及小鱼干；大小、字号、拖动、命名和设置保存继续可用。
- Windows 原生 DSH 安装插件后自动启动独立透明窗口；主窗口最小化后继续显示，支持跨屏拖动和避让。

## 安装与更新

下载预构建的 [GitHub Release](https://github.com/ltmroberthk915/dsh-pet/releases/latest)，或在 DSH 外部终端运行：

```sh
dsh plugin --profile desktop add https://github.com/ltmroberthk915/dsh-pet/releases/latest/download/dsh-session-pet.tgz
```

Web 宿主使用自己的 web profile。安装前备份 DSH 数据，并移除或停用旧 `@linxin666/dsh-pet` 的加载声明；两版共用宠物服务，不能同时启用。升级时只从此仓库的 Release 更新；不要安装原作者同名旧包覆盖本 fork。配置继续使用 `pet` 行及原养成数据。

**v1.2.0 起，独立窗口随插件自动启用，新机器无需 Agent、补丁脚本或额外安装。** 首次启用会在当前用户缓存中准备 DSH 自带的 Electron 运行库，通常需等待几秒；不下载运行库，不修改宿主 `app.asar`，也不退出或重启 DSH。窗口运行时直接使用本插件的渲染器，更新插件即可同步更新窗口。旧版宿主桥接自动停用，养成数据保留。

设置页显示准备、运行及失败状态，并提供「重试独立窗口」和「宠物窗口归位」。Windows 原生 DSH 0.2.0-rc.2 / Electron 44 已通过隔离实机验证；纯 Web 或其他平台继续使用应用内宠物。详细边界和旧补丁恢复见[Windows 安装说明](docs/install-desktop-windows.md)。

更新时使用插件管理器的更新操作或：

```sh
dsh plugin --profile desktop update @ltmroberthk915/dsh-pet
```

如果旧依赖固定在旧版下载地址，请改为本次明确的版本地址：

```sh
dsh plugin --profile desktop add https://github.com/ltmroberthk915/dsh-pet/releases/download/v1.3.0/dsh-session-pet.tgz
```

不要用 GUI「安装」反复提交同一个 URL 来重装已存在的依赖；DSH 可能报 `ambiguous-install`。当前使用 GitHub 预编译包分发；Git 分支也带有 `lib/`，无 `prepare` 或消费者构建步骤，不需要 `allowBuilds`、pnpm shim 或修改全局构建策略。

### 安装故障排查

| 原始错误或状态 | 处理 |
| --- | --- |
| `ERR_PNPM_GIT_DEP_PREPARE_NOT_ALLOWED` | 正在安装旧 Git 提交。改用本版预编译下载地址；不要为旧提交反复加白名单。 |
| `pnpm is not recognized` / `ERR_PNPM_IGNORED_BUILDS` / `strictDepBuilds` | 旧 Git 源触发了嵌套构建。安装本版完整包，无须降低全局构建保护。 |
| `ambiguous-install` / 无法从依赖变更中确定安装了哪一个包 | 使用更新操作；若更换版本，提交新版本的明确下载地址。 |
| `minimumReleaseAge` | pnpm 的 registry 发布冷却策略可能延后选中刚发布的版本。本项目的明确 Release 文件地址不依赖 registry 自动选版。 |
| npm 镜像返回 404 | 当前分发入口是上面的 Release 文件；不要将仓库名称当作已发布的 npm 包。 |
| 独立窗口准备失败 | 查看设置页具体原因，处理磁盘空间或权限后点击重试；应用内宠物仍可使用。 |

## 开发

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm build:entries
pnpm typecheck
pnpm build:local
```

自动窗口检查使用真实 Electron 和独立测试数据，覆盖三个形象、启停、沙箱、私有接口、失败重试与退出清理；实际新电脑尚未现场验证。历史 v1.1.1 有 155 项相关回归、120 项隔离 Electron 检查和 17 项安装器检查。待查看状态随宿主会话生命周期存在，退出程序后不恢复旧活动。

## 来源

[原项目](https://github.com/zhu1090093659/dsh-pet)提供基础框架、素材和交互。此 fork 增加会话级桌面伴侣、配色、调速、回收规则、安全修复与调度优化。见 [LICENSE](LICENSE) 与 [NOTICE](NOTICE)。

v1.2.0：插件自动启动独立窗口，取消日常安装对宿主补丁的依赖；预编译产物随 Git 和 Release 一起交付，移除 Git 安装的 `prepare`。仓库保留开发及 CI 使用的 pnpm 版本声明，消费者不触发嵌套安装；Release 包也不携带该声明。

v1.1.1：读取命令任务输出时使用托腮动作；五色鲸鱼娘固定站立腿部、统一直立高度。提供了旧版宿主补丁安装器；新版自动窗口无需运行该工具。

v1.1.0：引入原作者 v0.4.4 MIKU，保留养成玩法并补齐九种会话动作；修复跑动不摆臂、伸臂像挥拳及相邻帧边缘残片，统一跑步人物比例。新增现代商务小蓝鲸，简洁状态文案、关闭随机碎碎念。两者兼容现有多会话、模型配色、tok/s 调速与共享互动记录。

v1.0.5：逐帧重审七组非跑步动作，修复多余手臂、袖口残影、肩膀断连和托腮缺失长袖。以原版头饰宽度统一比例、固定脚底；剔除身体变短和额外闭眼的生成帧。110 个播放帧位、五色共 550 个帧位通过尺寸与透明轮廓检查；测量报告随素材发布。左右跑步仍共用所属会话底栏 tok/s 的 k、b，保留减半眨眼和省电调度。

v1.0.3：明确宠物在任务栏之上的层级，外部激活导致取消置顶时按事件恢复；电脑控制连续拉起已置顶的 DSH 主窗口时，宠物仍优先显示。不抢键盘焦点，也不持续抬高空闲窗口。宠物标记为工具窗口，避免被电脑控制误认作 DSH 主窗口。鼠标离开、失焦与拖动中断统一处理，避免点击穿透与拖动后误触。

v1.0.1：思考、正文与其他工具参数生成向右跑；写文件、编辑、替换和补丁参数生成向左跑。两种生成动作共用可调 k、b；v1.0.4 将该调速范围扩展到所有左右跑步。鲸鱼娘独立语音包保留全部场景，每类精选 3 句。
