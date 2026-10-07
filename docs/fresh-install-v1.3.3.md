# v1.3.3 新机安装与改名迁移

npm 包名固定为 `dsh-pet-copilot`。Release 提供同名版本包、完全相同的 dsh-session-pet.tgz 兼容副本、迁移附件及 SHA256SUMS.txt。Release、npm 发布、冷却与市场收录分别核实，不能互相替代。

## 安装入口

```powershell
$dsh = "$env:LOCALAPPDATA/Programs/DeepSeek Harness/resources/runtime/cli/bin/dsh.cmd"
& $dsh plugin --profile desktop why dsh-pet-copilot
```

自定义安装时改成实际安装目录下的完整 CLI 路径。PATH 上的旧全局 dsh 可能拒绝 desktop。不要把 resources/runtime/bin 加入全局 PATH。

从对应 Release 下载 dsh-pet-copilot-1.3.3.tgz，核对 SHA256SUMS.txt 后，用已下载的本地文件安装：

```powershell
& $dsh plugin --profile desktop add 'dsh-pet-copilot@file:C:/Downloads/dsh-pet-copilot-1.3.3.tgz'
```

替换为实际下载位置；不必克隆、构建、pack 或安装 pnpm。显式使用已下载并审阅的本地包，不等同于绕过 npm registry 的年龄检查。

首次新增 bundle 可热加载。替换已加载版本、客户端未刷新或收到 restart-required 时，保存工作后完整退出重开。成功热加载无需为安装本身重启。

## 冷却边界

DSH 0.2.0-rc.2 / pnpm 11.7.0 默认非严格配置可能安装刚发布的版本并自动加入单版本 minimumReleaseAgeExclude。显式 minimumReleaseAge: 1440 且未关闭严格行为时，未成熟版本会被拒绝。minimumReleaseAgeStrict: true 下，裸包名、精确版本及 npm tgz URL 都不是通用绕过方法。用户设置 48 小时等更长等待期也继续有效。

已有正式版本时，发布者先发 next，保留原 latest；至少满 24 小时且通过无例外的严格 registry 安装验证后才推广 latest。首次新包名例外：npm 自动创建 latest，暂存流程指向空的 0.0.0-stage，而且 npm 拒绝删除该标签。官方源全新安装与同版本重复安装都通过后，才将默认标签初始化为第一个真实版本；有任何更早真实版本就不能使用此入口。项目不改动用户全局策略。

首次安装、升级和再次添加同一版本需要分别验证。在真实 pnpm 11.7.0、宿主管理器与隔离 registry 中，1.3.2 → 1.3.3 升级成功后，立即重复添加 1.3.3 会在锁文件检查阶段报 `ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`；两个版本已自动加入例外也仍被拒绝。已安装版本与 bundle 选择保留。遇到此错误先核对已装版本，不要反复重装、删除用户锁文件或关闭全局冷却。单次安装成功不保证重复安装成功；隔离 registry 的结果不代表公共 npm 验收。

## 卸载

卸载出现长时间等待或 `package.json.lock` 写入锁超时时，参见[卸载与网络等待](uninstall.md)。两个桌面卸载入口共用宿主管理器，已安装依赖可在备份后启用 profile 范围的缓存优先设置。

## 旧名称迁移

DSH 同时匹配覆盖项的 id 与 name；保持 pet ID 本身不能保留旧名称下的配置。

1. 备份整个 DSH_HOME。
2. 在目标 profile 移除旧 @ltmroberthk915/dsh-pet 或 @linxin666/dsh-pet，安装新包，不要同时启用两套 bundle。
3. 解压 Release 中 dsh-pet-profile-migration-1.3.3.zip，双击 migrate-profile.cmd；默认处理 desktop。使用已安装包 scripts 目录中的相同工具也可以。
4. 非默认目录或预览使用下面的命令。未加 Apply 只读核验；web profile 要单独指定。

```powershell
powershell -NoProfile -File ./migrate-profile.ps1 -DshInstall 'D:/Apps/DeepSeek Harness' -ProfileDirectory "$env:USERPROFILE/.dsh/profiles/desktop"
powershell -NoProfile -File ./migrate-profile.ps1 -DshInstall 'D:/Apps/DeepSeek Harness' -ProfileDirectory "$env:USERPROFILE/.dsh/profiles/desktop" -Apply
```

启动器使用系统 Windows PowerShell 和 DSH 自带 Node，不要求另装 PowerShell 7、Node 或 pnpm。目录示例需替换为实际位置。

工具用宿主 loadProfileDirectory 和 composeEntries 核对配置，在文件锁内重新检查源文件、保存精确备份并原子写入。只改变 pet 旧名称标量；config、disabled、注释、换行和其他插件保持原字节。备份在原补丁旁，名称含 before-pet-rename。

若已有后来保存的新设置，仅在证明改名不改变该合成结果时执行。旧项在后、禁用标记冲突、YAML 别名或并发编辑会停止并说明原因。工具拒绝修改共享 home 补丁；共享旧项需审阅 profile 范围，不可全局替换影响尚未迁移的其他宿主。

## 发布查询

```powershell
node scripts/release-channel.mjs check 1.3.3
$env:DSH_PET_REGISTRY = 'https://registry.npmmirror.com'
node scripts/release-channel.mjs check 1.3.3
node scripts/release-channel.mjs promote 1.3.3 path/to/strict-install-receipt.json
# 仅用于包名的首次正式发布，修正 npm 自动生成的默认标签：
node scripts/release-channel.mjs initialize-latest 1.3.3 path/to/official-install-receipt.json
```

镜像仅影响 check，输出注明 registry 与 authoritative；网络故障不被当作未发布。promote 始终重新访问 npm 官方源，核对身份、发布时间、完整性及当前 latest，拒绝倒退或未成熟版本，并要求官方严格安装回执。initialize-latest 也只访问官方源，要求全新安装与重复安装回执，并在改标签前重新检查全部已发布版本，不能用来升级已有正式版本。镜像同步与用户更长冷却仍有独立边界。

## 验证与体积

正式发布包排除开发源码和测试，剔除当前 manifest 不再使用的 640 张 MIKU 插值帧，重新解包检查三个形象的全部服务资源。素材仍完整内置，以保留离线启动能力；包体积以该次正式产物报告为准。

真实 Host 配置合成、默认/严格冷却、首次/重复安装及升级分别使用隔离 profile 验证。loopback registry 结果不冒充公共 npm 或另一台电脑的验收。旧 app.asar 补丁仅作为历史维护工具保留。
