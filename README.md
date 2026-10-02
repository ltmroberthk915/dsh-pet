# DSH Session Pet

An independently maintained fork published as `@ltmroberthk915/dsh-pet`. [中文说明](README.zh.md).

Based on [zhu1090093659/dsh-pet](https://github.com/zhu1090093659/dsh-pet), licensed under Apache-2.0 with upstream attribution preserved in LICENSE and NOTICE.

![Model palettes](docs/palettes.png)

Choose a refined whale-girl, upstream v0.4.4 MIKU with additional session animations, or an original modern business blue whale in Settings → Pet. All three support one companion per active top-level conversation, a full-size main companion and 52.7% background companions, model-based palettes, per-session footer tok/s playback with editable slope and intercept, shared affinity and feeding, and finished companions that wait until their results are viewed. Selecting a conversation promotes its pet without requiring a message. A viewed, completed companion retires when the user leaves that conversation. See the [new companions guide](docs/miku-business-pets.md).

Install the prebuilt package from this repository's releases:

```sh
dsh plugin --profile desktop add https://github.com/ltmroberthk915/dsh-pet/releases/latest/download/dsh-session-pet.tgz
```

Use your web profile for a web host. Back up DSH first and disable/remove the upstream package's loading declaration before enabling this fork; both provide the same pet service. Settings retain the existing `pet` identity and shared care data. Updates should come from this repository's releases, not the upstream npm package.

**Starting with v1.2.0, installing the plugin automatically starts independent windows in native Windows DSH.** No Agent, patch script, additional download or DSH restart is required. On first use, the plugin prepares a private copy of DSH's Electron runtime in the current user's cache. It leaves the host archive intact and loads the renderer directly from the installed plugin, so plugin updates also update the native window. The previous patched renderer is disabled during the transition.

Settings shows preparation, readiness and actionable failures, with Retry and Reset Position buttons. Verified with isolated native windows using DSH Desktop 0.2.0-rc.2 / Electron 44; other platforms and plain web hosts retain the embedded pet. See the [Windows guide](docs/install-desktop-windows.md) for runtime storage and optional legacy rollback.

Update with `dsh plugin --profile desktop update @ltmroberthk915/dsh-pet`. If the dependency is pinned to an older release URL, add the explicit new `releases/download/v1.2.0/dsh-session-pet.tgz` URL instead. Reinstalling an identical URL through the GUI's Install action can trigger DSH's `ambiguous-install` error. Distribution currently uses precompiled GitHub releases; the Git branch also includes `lib/` and has no `prepare` or consumer build hooks. Its pnpm version declaration is for development and CI; consumer installs do not run a nested package-manager install. Release tarballs omit the declaration entirely. Do not work around old Git build errors by changing global `allowBuilds` or `strictDepBuilds` settings. The [Chinese troubleshooting table](README.zh.md#安装故障排查) covers the reported installation errors.

Build with `pnpm install --frozen-lockfile --ignore-scripts`, `pnpm build:entries`, `pnpm typecheck`, and `pnpm build:local`. Automatic-window checks exercise the production controller, all three pets, sandboxing, bridge authentication, lifecycle and recovery in isolated native windows. The user's separate new computer has not been tested directly. Completion-review state is transient and released when the host session or application is disposed.

Version 1.1.1 fixes `job_output` waiting so reading command output uses the review pose. The five whale palettes share planted legs and registered upright height; bows, hops and running retain their intentional movement. Historical validation: 155 relevant regression tests, TypeScript checks and 120 isolated Electron checks. Version 1.2.0 removes the need to update a separate host renderer.

Version 1.1.0 retains MIKU's original gameplay and adds nine session animation states, swinging arms, consistent run registration and clean sprite boundaries. The original business blue whale uses restrained ceramic-blue and silver artwork, concise status text and no random chatter. Both use the existing conversation, palette, FPS and shared-care policies.

Version 1.0.5 repairs all seven non-running action sets: duplicate arms/cuffs, disconnected shoulders and missing long sleeves. Uniform head-size calibration and fixed foot anchors replace bounding-box height matching; shortened-body and extra closed-eye frames are excluded. All 110 animation slots (550 across five palettes) pass geometry checks, with measurement reports included. The per-session footer tok/s policy, half-frequency blinks and sleeping frame scheduler are preserved; all run pixels remain unchanged.

Version 1.0.3 keeps pets above the Windows taskbar and restores their topmost state after external activation, including repeated attention requests on an already-topmost DSH main window. It does not steal keyboard focus or continuously raise idle windows. Native tool-window identity prevents computer-use helpers from confusing pets with the DSH main window. Pointer hit regions survive synthetic leave/blur events, and interrupted drags release cleanly.

Version 1.0.1 distinguishes model generation from tool execution: reasoning, answers and other tool arguments run right; file writing/editing/patch arguments run left. Version 1.0.4 extends the shared editable k and b to every left/right run. The whale voice pack keeps every upstream scene with three concise lines per category.
