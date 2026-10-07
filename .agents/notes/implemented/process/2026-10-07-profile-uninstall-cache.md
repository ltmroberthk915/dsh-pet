# Agent Note: Profile cache preference for uninstall

Status: implemented

## Problem

On DSH 0.2.0-rc.2 with pnpm 11.7.0, removing an installed dependency consulted registry metadata for other dependencies. Unreachable npm requests held the profile writer lock for about four minutes and forty-five seconds. A second removal then timed out acquiring the same lock. Both the official UI and dshmarket use the host's manager; one observed blocker was removal of dshmarket itself while a PET removal request waited.

The first diagnosis confirmed eventual package removal without preventing recurrence. A single-package offline CLI fixture was insufficient evidence for the user's full dependency graph.

## Decision

Validate the actual dependency graph in a separate DSH_HOME, then explicitly enable `preferOffline: true` only in the affected desktop profile after a complete home backup. Use the host's atomic writer under the package manifest lock to apply the setting. Remove the already unloaded PET with the bundled official CLI, and compare unrelated dependency specifications, settings and care data against the pre-change state.

Keep this as a documented maintenance choice. Plugin startup and installation do not silently rewrite package-manager settings. Add official-manager and market-bridge uninstall/reinstall coverage with a disconnected fixture registry, requiring no registry requests, released locks and records, an unmounted route, and preserved care data.

## Alternatives considered

- Wait for retries to finish: package removal can succeed eventually, but the next uninstall encounters the same delay.
- Delete the writer lock or stop the host: deleting an active lock permits concurrent profile writes; neither action fixes repeated registry waits.
- Permanently force offline mode: prevents installation of uncached packages.
- Replace the registry or persist a discovered local proxy port: changes the package source or depends on a port that may change.
- Modify PET's disposal logic or publish a new package solely for the delay: observed teardown completed; network waits occur in the host's package manager.

## Consequences

The tested full profile removes PET 1.3.3 in about one second with cache preference alone; the actual backed-up profile removal completes in about two seconds. Cache misses still need network access, and cached metadata may not describe a newly published version. Existing release-age and supply-chain policies remain active.

The disconnected-registry test uses aged loopback metadata and isolated home directories. It does not establish public npm installation eligibility or native window behavior. Complete the real profile's operation before copying its backup: a backup attempted during a concurrent removal can fail when pnpm replaces package directories.
