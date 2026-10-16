# Agent Note: Native pet startup and idle process lifetime

Status: implemented

## Problem

Every native pet start hashed both the installed Electron runtime and its private cache. Hidden pets could leave an independent Electron process resident. Starting this work during plugin mounting also competed with the Host's initialization.

## Decision

Persist verified source and cache hashes with file identity, size, nanosecond modification time and change time. Reuse a hash only while all recorded metadata matches; retain realpath containment checks, checksum validation for changed files, and direct verification of the small bootstrap files. Write the verification record atomically. Missing or truncated records fall back to full verification.

Defer automatic startup briefly and allow a connected UI to release the defer. Cancel queued startup when disabled, retire in-flight generations, and start a fresh attempt when re-enabled. End the independent process when desktop mode is disabled; hidden pets get a short grace period before shutdown. Keep the existing failure recovery and manual repair controls.

## Validation

Runtime regressions cover unchanged files, restored modification times after same-size writes, changed cached executables, missing files, truncated records, redirected cache directories, cancelled startup and re-enabling during preparation. Controller tests retain crash recovery and cover hidden-process shutdown. Windows native checks retain all three pets, multiple conversations, private bridge restrictions, shutdown and automatic recovery.

## Limits

The metadata cache avoids repeated bulk reads; initial preparation and updates still require hashing. Displayed pets still use independent Electron processes. The recorded startup timings measure isolated pet readiness on one machine, not complete DSH cold startup. This change does not repair or clear the shared CLI dependency fallback directory.
