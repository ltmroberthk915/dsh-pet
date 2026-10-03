# DSH Session Pet

An independently maintained fork published as `dsh-pet-copilot`. [中文说明](README.zh.md).

v1.3.2 adds quiet hover panels, 75% business-whale sizing, uncapped running FPS with an optional user limit, and a separate FPS setting for other actions. The same timing rules apply to every character. See [installation and package-name migration](docs/fresh-install-v1.3.2.md).

Based on [zhu1090093659/dsh-pet](https://github.com/zhu1090093659/dsh-pet), licensed under Apache-2.0 with upstream attribution preserved in LICENSE and NOTICE.

![Model palettes](docs/palettes.png)

Choose a refined whale-girl, upstream v0.4.4 MIKU with additional session animations, or an original modern business blue whale in Settings → Pet. All three support one companion per active top-level conversation, a full-size main companion and 52.7% background companions, model-based palettes, per-session footer tok/s playback with editable slope and intercept, shared affinity and feeding, and finished companions that wait until their results are viewed. Selecting a conversation promotes its pet without requiring a message. A viewed, completed companion retires when the user leaves that conversation. See the [new companions guide](docs/miku-business-pets.md).

Install the downloaded precompiled package using the official Desktop installation's dsh command (replace the local path):

```powershell
dsh plugin --profile desktop add 'dsh-pet-copilot@file:C:/Downloads/dsh-pet-copilot-1.3.2.tgz'
```

**Save your work, fully quit DSH and reopen it after installation or upgrade.** DSH 0.2.0-rc.2 attempts to hot-load first-time installs; replacing an installed version requires a restart. The pet's independent windows start automatically once its host loads. No Agent, host patch or additional runtime download is required. The private runtime lives under $DSH_HOME/cache/pet-desktop; the host archive and care data are preserved.

The market distribution identity is dsh-pet-copilot. Use add dsh-pet-copilot@1.3.2 only after that version resolves from npm. Preparing a tarball does not publish it. The market's official desktop bridge cannot update floating Git dependencies. Named registry and local-file targets let DSH recognize repeated installations. All JavaScript chunks are precompiled and included, without consumer build hooks or a packageManager field. Preserve the user's release-age and build policies. See the [fresh-install notes](docs/fresh-install-v1.3.2.md).

Use the web profile for a web host. Back up DSH and disable the upstream @linxin666/dsh-pet loading declaration before enabling this fork; both own the same pet service. Existing settings, names and shared care data remain compatible. Settings includes automatic connection recovery, a native-window Retry button and Reset Position. See the [Windows guide](docs/install-desktop-windows.md).

Build with pnpm install --frozen-lockfile --ignore-scripts, pnpm typecheck and pnpm build:local. Integration checks use an isolated DSH home and the real desktop market bridge; they do not replace verification on the user's separate new computer or the public npm registry.

Version 1.1.1 fixes `job_output` waiting so reading command output uses the review pose. The five whale palettes share planted legs and registered upright height; bows, hops and running retain their intentional movement. Historical validation: 155 relevant regression tests, TypeScript checks and 120 isolated Electron checks. Version 1.2.0 removes the need to update a separate host renderer.

Version 1.1.0 retains MIKU's original gameplay and adds nine session animation states, swinging arms, consistent run registration and clean sprite boundaries. The original business blue whale uses restrained ceramic-blue and silver artwork, concise status text and no random chatter. Both use the existing conversation, palette, FPS and shared-care policies.

Version 1.0.5 repairs all seven non-running action sets: duplicate arms/cuffs, disconnected shoulders and missing long sleeves. Uniform head-size calibration and fixed foot anchors replace bounding-box height matching; shortened-body and extra closed-eye frames are excluded. All 110 animation slots (550 across five palettes) pass geometry checks, with measurement reports included. The per-session footer tok/s policy, half-frequency blinks and sleeping frame scheduler are preserved; all run pixels remain unchanged.

Version 1.0.3 keeps pets above the Windows taskbar and restores their topmost state after external activation, including repeated attention requests on an already-topmost DSH main window. It does not steal keyboard focus or continuously raise idle windows. Native tool-window identity prevents computer-use helpers from confusing pets with the DSH main window. Pointer hit regions survive synthetic leave/blur events, and interrupted drags release cleanly.

Version 1.0.1 distinguishes model generation from tool execution: reasoning, answers and other tool arguments run right; file writing/editing/patch arguments run left. Version 1.0.4 extends the shared editable k and b to every left/right run. The whale voice pack keeps every upstream scene with three concise lines per category.
