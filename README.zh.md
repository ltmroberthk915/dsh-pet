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
- 桌面适配器支持独立透明窗口、主窗口最小化后继续显示、跨屏自由拖动和避让；采用事件触发布局和空闲低频动画。

## 安装与更新

下载预构建的 [GitHub Release](https://github.com/ltmroberthk915/dsh-pet/releases/latest)，或在 DSH 外部终端运行：

```sh
dsh plugin --profile desktop add https://github.com/ltmroberthk915/dsh-pet/releases/latest/download/dsh-session-pet.tgz
```

Web 宿主使用自己的 web profile。安装前备份 DSH 数据，并移除或停用旧 `@linxin666/dsh-pet` 的加载声明；两版共用宠物服务，不能同时启用。升级时只从此仓库的 Release 更新；不要安装原作者同名旧包覆盖本 fork。配置继续使用 `pet` 行及原养成数据。

包内包含编译好的 host/client 与素材，无安装时脚本。独立桌面窗口使用包内 `desktop/Install-Desktop.ps1`：先以 `-Mode Check` 检查，正常退出 DSH 后以 `-Mode Apply` 安装。自动识别安装路径、优先使用宿主自带 Node，支持旧补丁升级、重复安装检查和 `-Mode Rollback` 精确回滚。只替换经校验的宿主 `app.asar` 并自动备份，不修改会话和账户数据。Release 另附小体积安装工具 ZIP；未知归档会拒绝。见[Windows 安装与回滚步骤](docs/install-desktop-windows.md)。

## 开发

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm prepare
pnpm typecheck
pnpm build:local
```

v1.1.1 包含 155 项相关功能回归、120 项隔离 Electron 检查以及 17 项安装器检查；类型检查通过。安装器使用真实归档副本验证，新电脑尚未现场安装。待查看状态随宿主会话生命周期存在，退出程序后不恢复旧活动。

## 来源

[原项目](https://github.com/zhu1090093659/dsh-pet)提供基础框架、素材和交互。此 fork 增加会话级桌面伴侣、配色、调速、回收规则、安全修复与调度优化。见 [LICENSE](LICENSE) 与 [NOTICE](NOTICE)。

v1.1.1：读取命令任务输出时使用托腮动作；五色鲸鱼娘固定站立腿部、统一直立高度。补齐 Windows 桌面适配器的检查、安装、升级和回滚入口，设置页提供缺失接口时的安装说明链接。

v1.1.0：引入原作者 v0.4.4 MIKU，保留养成玩法并补齐九种会话动作；修复跑动不摆臂、伸臂像挥拳及相邻帧边缘残片，统一跑步人物比例。新增现代商务小蓝鲸，简洁状态文案、关闭随机碎碎念。两者兼容现有多会话、模型配色、tok/s 调速与共享互动记录。

v1.0.5：逐帧重审七组非跑步动作，修复多余手臂、袖口残影、肩膀断连和托腮缺失长袖。以原版头饰宽度统一比例、固定脚底；剔除身体变短和额外闭眼的生成帧。110 个播放帧位、五色共 550 个帧位通过尺寸与透明轮廓检查；测量报告随素材发布。左右跑步仍共用所属会话底栏 tok/s 的 k、b，保留减半眨眼和省电调度。

v1.0.3：明确宠物在任务栏之上的层级，外部激活导致取消置顶时按事件恢复；电脑控制连续拉起已置顶的 DSH 主窗口时，宠物仍优先显示。不抢键盘焦点，也不持续抬高空闲窗口。宠物标记为工具窗口，避免被电脑控制误认作 DSH 主窗口。鼠标离开、失焦与拖动中断统一处理，避免点击穿透与拖动后误触。

v1.0.1：思考、正文与其他工具参数生成向右跑；写文件、编辑、替换和补丁参数生成向左跑。两种生成动作共用可调 k、b；v1.0.4 将该调速范围扩展到所有左右跑步。鲸鱼娘独立语音包保留全部场景，每类精选 3 句。
