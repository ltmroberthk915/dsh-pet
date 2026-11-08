# v1.5.0 新机安装、更名迁移与「专属宠物保持」

本版本起 npm 包名固定为 **`dsh-pets-multiworkers`**（旧名 `dsh-pet-copilot`）。插件行 id 仍为 `pet`，`pet.json` 数据与设置命名空间不变。Release 提供 `dsh-pets-multiworkers-<version>.tgz`、迁移附件与 `SHA256SUMS.txt`；`dsh-session-pet.tgz` 仅作为兼容文件名保留。

## 安装入口

```powershell
$dsh = "$env:LOCALAPPDATA/Programs/DeepSeek Harness/resources/runtime/cli/bin/dsh.cmd"
& $dsh plugin --profile desktop why dsh-pets-multiworkers
```

自定义安装时改成实际安装目录下的完整 CLI 路径。不要把 `resources/runtime/bin` 加入全局 PATH。

从对应 Release 下载 `dsh-pets-multiworkers-1.5.0.tgz`，核对 `SHA256SUMS.txt` 后安装：

```powershell
& $dsh plugin --profile desktop add 'dsh-pets-multiworkers@file:C:/Downloads/dsh-pets-multiworkers-1.5.0.tgz'
```

替换为实际下载位置；不必克隆、构建、pack 或安装 pnpm。首次新增 bundle 可热加载；替换已加载版本、客户端未刷新或收到 `restart-required` 时，保存工作后完整退出重开 DSH。

## 从旧包名迁移

DSH 同时按行 id 与 name 匹配覆盖项，只保留 `id: pet` 不足以保留旧名称下的配置：

1. 备份整个 DSH_HOME。
2. 在目标 profile 移除 `dsh-pet-copilot`（以及更早的 `@ltmroberthk915/dsh-pet`、`@linxin666/dsh-pet`），安装新包，不要同时启用两套 bundle。
3. 运行迁移器（默认只预览，`--apply` 才写入；写入前用真实宿主 `loadProfileDirectory`/`composeEntries` 核对合成结果）：

```powershell
node scripts/migrate-profile.mjs --patch "$env:USERPROFILE/.dsh/profiles/desktop/cordis.patch.yml"
node scripts/migrate-profile.mjs --patch "$env:USERPROFILE/.dsh/profiles/desktop/cordis.patch.yml" --apply
```

迁移器只改 pet 行中旧名称的标量，config、disabled、注释、换行和其他插件保持原字节；旧项在后、禁用标记冲突、YAML 别名或并发编辑会停止并说明原因。共享 home 补丁不会被改写。

4. 完整退出并重开 DSH 加载新代码。

## 「专属宠物保持」

侧栏具体会话的 `...` 菜单新增 **「专属宠物保持」**：

- 选择后，该会话所属主代理宠物在结果已查看、焦点切走时**不再被回收**；它仍按现有规则随焦点切换主/次大小。
- 该会话的子代理宠物仍按原有逻辑显示与隐藏。
- 再次选择 **「取消专属宠物保持」** 恢复原回收规则；状态持久化在 `pet.json` 的 `keptSessions`，重启后仍生效。
- 该菜单行需要宿主提供 `sidebar.workspaces.session.menu.item` 槽位；没有该槽位的旧宿主会跳过这一行，宠物本体不受影响。

## 冷却与发布

发布仍按既有流程：先发 `next`，至少 24 小时且通过无例外的严格 registry 安装验证后才推广 `latest`；首次新包名使用单独的 `initialize-latest` 入口。首次安装、升级和同版本重复安装分别验证，隔离 registry 结果不冒充公共 npm 验收。详见 `docs/fresh-install-v1.3.3.md` 的冷却边界说明（名称按本版本替换）。
