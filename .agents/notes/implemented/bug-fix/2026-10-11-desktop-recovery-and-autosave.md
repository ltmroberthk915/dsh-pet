# Agent Note: Desktop activation, automatic recovery and settings persistence

Status: implemented

## Problem

Desktop pets can intermittently stop activating DSH above a maximized Edge window. A failed independent process can require a manual retry. Both settings panels require a separate save action after editing.

## Decision

Launch the existing DSH executable directly from the companion receiving mouse input so activation originates in the process receiving the Windows input permission. Send the represented session through the authenticated private connection and coalesce concurrent activation launches. Keep the newest session when an asynchronous launch fails.

Recover failed startup, process exit and stale heartbeat automatically with capped exponential backoff. Wait for the old process to exit before restarting to avoid the single-instance lock. Cancel recovery when disabled or disposed. Rebuild crashed or persistently unresponsive renderer windows while preserving placement; retain both manual retry and window reset controls.

Save settings after edits using serialized immutable payloads. Do not write during initial hydration. Validate numeric inputs before queuing, preserve drafts and retry transport failures, and prevent a completed older request from overwriting newer edits. The host settings card hides its footer while retaining the shared form implementation.

## Alternatives considered

- Sending every activation through the background Host keeps activation distant from the process receiving the click.
- Immediately relaunching after termination can race the prior process and lose the recovery attempt to its single-instance lock.
- Unlimited immediate retries can consume resources when a failure persists.
- Disabling inputs throughout each save prevents continuous editing and does not address out-of-order results.

## Consequences

Unit coverage includes activation fallback, latest-session handling, recovery cancellation and serialized edits. Native checks inject missing forwarded mouse events and renderer crashes; isolated desktop integration checks recover a killed companion and retain manual retry. The maximized Edge symptom could not be reproduced on demand, so its exact intermittent trigger remains an observed limitation. Reloading the host is required after upgrading already loaded process code.
