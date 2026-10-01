# Agent Note: Refined desktop pet with bounded playback and reduced idle work

Status: implemented

## Problem

The installed plugin ran inside the main window, played right-running too slowly, and provided no editable relationship with the current conversation's footer speed. Generic save errors obscured invalid numeric input. Transparent-window padding restricted desktop placement and a monitor-rate animation loop wasted idle wakeups. This deployment requires only the refined whale character.

## Decision

Keep the registry reusable for development, but load only the refined whale in production and ship only its assets plus decorations. Preserve voice overrides and existing interactions. Put playback and desktop controls solely in Pet settings. Persist positive-slope `k * tok/s + b` parameters per character, clamp the output to 1–60 FPS, and retime only right-running. Read the exact footer statistic instead of estimating streamed text speed.

Use a parentless sandboxed Electron window with explicit owner/frame checks and a fixed IPC action list. Drag without clamping the transparent frame; recover only wholly unreachable artwork after startup or display changes. Repair the reviewed host root-Include lookup without accepting arbitrary config entries. Keep that integration hash-gated and output-only until an installer applies it after a full backup.

Schedule long animation frames with a timer and one paint-aligned callback, retain direct rAF at short frame intervals, stop completed tracks, merge in-flight polls and avoid unchanged configuration messages. Alternate closed-eye appearances with matching open-eye frames. Input validation is field-specific and prevents invalid submissions; transport/write failures retain drafts with separate copy.

## Alternatives considered

- A permanent overlay toolbar was rejected in favor of the existing Pet settings page.
- Slowing every animation or disabling interaction would reduce work at the cost of requested behavior.
- Bounding the entire transparent window to the work area retains excessive visual margins.
- Deleting all non-selected user content prevents straightforward recovery. The local installer instead copies the complete data directory, then moves unused bundled models into its backup.
- Exposing generic host requests to the renderer broadens privileges unnecessarily.

## Consequences

The local desktop extension currently targets reviewed 0.2.0-rc.2 archives; upgrades require revalidation. The five-second isolated idle sample drops from 300 to 20 callbacks, which quantifies wakeups rather than machine energy. Native isolation, placement and rollback probes remain separate from unit tests. Generic registry fixtures and upstream market assets remain useful development material even though production loads a single character. Future host event subscriptions could eliminate more polling without changing task feedback.
