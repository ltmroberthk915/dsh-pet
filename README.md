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

The archive includes prebuilt JavaScript and assets, with no install-time scripts. Independent native windows use the included `desktop/Install-Desktop.ps1`: run `-Mode Check`, exit DSH, then run `-Mode Apply`. It prefers the host's bundled Node, verifies the exact supported archive and payload, backs up the program, supports upgrades and repeat installation, and provides `-Mode Rollback -ReceiptPath ...`. It never modifies conversation or account data. A small matching toolkit ZIP is also attached to the release. See the [Windows installation guide](docs/install-desktop-windows.md); supported hosts remain reviewed DSH Desktop 0.2.0-rc.2 archives.

Build with `pnpm install --frozen-lockfile --ignore-scripts`, `pnpm prepare`, `pnpm typecheck`, and `pnpm build:local`. Version 1.1.0 validation: 511 passing source tests, one platform test skipped, and 32 isolated Electron checks for the new companions. Completion-review state is transient and released when the host session or application is disposed.

Version 1.1.1 fixes `job_output` waiting so reading command output uses the review pose. The five whale palettes share planted legs and registered upright height; bows, hops and running retain their intentional movement. Validation: 151 relevant regression tests, TypeScript checks and 120 isolated Electron checks, including captured leg pixels and upright height in all five palettes. Native desktop users must also update the bundled desktop adapter to receive renderer changes; updating only the plugin does not replace the host's embedded renderer.

Version 1.1.0 retains MIKU's original gameplay and adds nine session animation states, swinging arms, consistent run registration and clean sprite boundaries. The original business blue whale uses restrained ceramic-blue and silver artwork, concise status text and no random chatter. Both use the existing conversation, palette, FPS and shared-care policies.

Version 1.0.5 repairs all seven non-running action sets: duplicate arms/cuffs, disconnected shoulders and missing long sleeves. Uniform head-size calibration and fixed foot anchors replace bounding-box height matching; shortened-body and extra closed-eye frames are excluded. All 110 animation slots (550 across five palettes) pass geometry checks, with measurement reports included. The per-session footer tok/s policy, half-frequency blinks and sleeping frame scheduler are preserved; all run pixels remain unchanged.

Version 1.0.3 keeps pets above the Windows taskbar and restores their topmost state after external activation, including repeated attention requests on an already-topmost DSH main window. It does not steal keyboard focus or continuously raise idle windows. Native tool-window identity prevents computer-use helpers from confusing pets with the DSH main window. Pointer hit regions survive synthetic leave/blur events, and interrupted drags release cleanly.

Version 1.0.1 distinguishes model generation from tool execution: reasoning, answers and other tool arguments run right; file writing/editing/patch arguments run left. Version 1.0.4 extends the shared editable k and b to every left/right run. The whale voice pack keeps every upstream scene with three concise lines per category.
