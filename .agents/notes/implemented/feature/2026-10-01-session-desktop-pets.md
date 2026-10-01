# Session desktop pets

Version `0.4.4-local.20261001.4` adds optional per-session pets while retaining a single refined-whale character. The main conversation owns the full-size pet and bubble permissions; other active top-level sessions use 62% size. Every window reads its session's footer speed and preserves its first allocated model palette. Ending background sessions retire toward the main pet.

Affinity, feeding history, treat stock and cooldowns remain one shared ledger. Session identifiers only deduplicate completed-turn rewards; they never partition balances. Mode changes and restarts retain this ledger.

The native bridge caches one host snapshot, coalesces reads, rejects stale focus responses, and pushes changed window snapshots through sandboxed IPC. It keeps small transparent windows smaller and disposes them when sessions finish. The five basic palettes are offline pixel recolors of one atlas with identical cleaned alpha geometry; extra palettes use a fixed hue transform.

Validation: 558 source tests passed, 2 skipped; unavailable optional-asset suites and a Windows symlink-privilege test were excluded. SDK typecheck, 40 isolated Electron checks and 10 real Host settings checks passed. Install and rollback were verified against a sandbox copy of the previous patched Desktop 0.2.0-rc.2. This integration uses a hash-gated archive patch until a public native-window interface exists.
