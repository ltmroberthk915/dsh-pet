# DSH Session Pet

An independently maintained fork published as `@ltmroberthk915/dsh-pet`. [中文说明](README.zh.md).

Based on [zhu1090093659/dsh-pet](https://github.com/zhu1090093659/dsh-pet), licensed under Apache-2.0 with upstream attribution preserved in LICENSE and NOTICE.

![Model palettes](docs/palettes.png)

This fork adds a refined whale-girl companion per active top-level conversation, a full-size main companion and 52.7% background companions, model-based palettes, per-session footer tok/s playback with editable slope and intercept, shared affinity and feeding, and finished companions that wait until their results are viewed. Selecting a conversation promotes its pet without requiring a message. A viewed, completed companion retires when the user leaves that conversation.

Install the prebuilt package from this repository's releases:

```sh
dsh plugin --profile desktop add https://github.com/ltmroberthk915/dsh-pet/releases/latest/download/dsh-session-pet.tgz
```

Use your web profile for a web host. Back up DSH first and disable/remove the upstream package's loading declaration before enabling this fork; both provide the same pet service. Settings retain the existing `pet` identity and shared care data. Updates should come from this repository's releases, not the upstream npm package.

The archive includes prebuilt JavaScript and assets, with no install-time scripts. Normal installation provides embedded companions. **Independent native windows require a separate desktop adapter**, currently reviewed only for specific DSH Desktop 0.2.0-rc.2 archives. The package includes a hash-gated patcher that writes a separate output archive; it does not modify the host during package installation. See the [desktop guide](docs/desktop-refined-pet.md) for integration, collision avoidance, lifecycle and compatibility limits.

Build with `pnpm install --frozen-lockfile --ignore-scripts`, `pnpm prepare`, `pnpm typecheck`, and `pnpm build:local`. Source validation: 599 passing tests with the documented optional-asset/Windows exclusions; 50 isolated Electron checks passed. Completion-review state is transient and released when the host session or application is disposed.

Version 1.0.2 keeps pets above the Windows taskbar and restores their topmost state after external activation, without stealing keyboard focus or continuously raising idle windows. Native tool-window identity prevents computer-use helpers from confusing pets with the DSH main window. Pointer hit regions survive synthetic leave/blur events, and interrupted drags release cleanly.

Version 1.0.1 distinguishes model generation from tool execution: reasoning, answers and other tool arguments run right; file writing/editing/patch arguments run left. Both generation directions follow the conversation footer tok/s with the same editable k and b; actual tool execution uses native timing. The whale voice pack keeps every upstream scene with three concise lines per category.
