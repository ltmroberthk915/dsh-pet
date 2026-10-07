# 卸载与网络等待

PET 的卸载由 DSH 插件管理器执行。官方插件页面和 dshmarket 的桌面端桥接最终调用同一个 `removeBundle`，共享目标 profile 的 `package.json.lock`。

DSH 0.2.0-rc.2 自带的 pnpm 11.7.0 在移除依赖时，可能查询其他已安装插件的 registry 元数据。如果 npm 请求超时，卸载会持有写入锁继续重试。此时再次发起卸载可能出现：

```text
atomic-write: timed out waiting for the writer lock at .../profiles/desktop/package.json.lock
```

这条错误说明另一个操作还持有锁。实际目标和进展以 `profiles/desktop/.plugin-manager/logs/operation-*/pnpm.log` 为准；不要根据错误提示推断是谁占锁。复现中，PET 卸载请求也曾被同时进行的 dshmarket 卸载阻塞。

## 给已安装依赖启用缓存优先

等待当前包管理操作结束并备份整个 DSH_HOME 后，在目标 profile 的 `pnpm-workspace.yaml` 中加入一个顶层设置：

```yaml
preferOffline: true
```

保留原有配置，已有同名设置时修改该值，不要重复添加。这个设置让包管理器优先使用已缓存的元数据；它作用于该 profile 的两个卸载入口，无需为这一设置重启宿主。

`preferOffline` 仍会在缺少缓存时访问 registry，也可能使用尚未刷新的版本列表。缓存不齐时仍需恢复网络；它不是完全离线模式。相关行为见 [pnpm 的缓存优先说明](https://pnpm.io/cli/install#--prefer-offline)。不要将 `offline: true` 常驻到 profile，否则会影响下载尚未缓存的新插件。

此处理不更换 registry、不写入代理端口，也不关闭 `minimumReleaseAge` 或其他安装策略。请保留现有锁文件和配置。正在运行的卸载没有结束时，直接删除 `package.json.lock` 会允许并发写入同一个 profile。

## 命令行恢复

当前操作结束后，可以使用 DSH 安装目录中的官方 CLI；运行中的 PET 应先通过宿主停用，或保存工作后退出宿主。

```powershell
$dsh = "$env:LOCALAPPDATA/Programs/DeepSeek Harness/resources/runtime/cli/bin/dsh.cmd"
& $dsh plugin --profile desktop remove dsh-pet-copilot
```

自定义安装目录时替换 `$dsh`。Web 与 desktop 是独立环境；需要移除 Web 那份时单独指定 `--profile web`。

只在缓存齐全且本次卸载确实需要完全离线时，使用单次配置参数：

```powershell
& $dsh plugin --profile desktop remove dsh-pet-copilot --config.offline=true
```

pnpm 11.7.0 的 `remove` 不接受裸 `--offline`；上述参数已通过官方 CLI 在隔离 DSH_HOME 验证。不要将它写成永久离线设置。

## 验证边界

复现机器的完整依赖副本启用缓存优先后，普通 PET 1.3.3 卸载约 1 秒完成，其他直接依赖规格保持一致。完整备份后应用同一设置，实际卸载约 2 秒完成，PET 包、依赖与操作记录移除，写入锁释放，其他依赖、配置和宠物数据保持一致。

`scripts/test-market-install.mjs` 另外使用隔离 DSH_HOME 与 loopback registry，验证官方管理器和市场桥接在 registry 断开后完成卸载、释放锁、卸载路由、重新安装以及保留养成数据。测试 fixture 的发布时间为已成熟日期，不代表公共 npm 新版本的冷却验收。可在已有运行时、市场桥接和两个正式安装包的环境中，仅执行卸载回归：

```text
node scripts/test-market-install.mjs <prepared-dsh-runtime> <desktop-runtime-support> <old.tgz> <new.tgz> <dshmarket/lib/official-desktop.js> --uninstall-only
```
