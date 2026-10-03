# Agent Note: The pet's master switch and its own visibility intent are two answers

Status: implemented

## Problem

Issue #1762: on the desktop client, switching the pet off in the settings page
left it on screen, and restarting did not help. A second reporter confirmed it.

The pet carries two visibility values that were being conflated:

1. **`enabled`** - the plugin master switch, a settings field on the `pet`
   profile row (`Config` in `src/index.ts`), written by the settings card.
2. **`display.visible`** - what the sprite renders, persisted in the pet's own
   `pet.json`, written by the sprite's hide/summon control and by the aggregate
   shell's fallback card when no Host settings form is served.

`PetService.applySettingsSection` folded the two together on the way in:

```ts
next.visible = section.visible && (section.enabled ?? true)
```

That line turned the master switch into a one-way door. Switching the plugin
off did not merely hide the pet for the moment - it stored the derived `false`
into `pet.json` as though the user had personally hidden the pet. Every later
resolve read that stored `false` back through `displayField`'s "persisted"
step, so re-enabling the switch (or restarting the process) could not bring the
pet back. In the other direction, a user who hid the pet from the sprite and
then saved an unrelated settings edit had their hide silently rewritten by the
master switch's current value.

The two values also reach the browser through one snapshot: the 2 s poll
`/api/pet/state` renders the sprite straight from `display.visible`.

## Decision

**Keep the two answers separate, and combine them only where the view is
produced.**

`applySettingsSection` now stores the pet's own intent verbatim
(`next.visible = section.visible`), and the effective on-screen state is
computed in the single place that builds the state view:

```ts
display: { ...this.ledger.snapshot.display, visible: this.isEnabled() && this.ledger.snapshot.display.visible }
```

`petSettingsSection` correspondingly resolves `visible` as the pet's own
intent and `enabled` as the master switch, without conjoining them - it is the
resolver, not the view producer.

The conjunction therefore exists exactly once, at the output boundary, instead
of being written into durable state. That is what makes the master switch
reversible: disabling hides the pet without editing what the user chose, so
re-enabling (and restarting) restores it.

## Alternatives considered

- **Fold the conjunction into `petSettingsSection`.** Tried first and rejected.
  It fixes the "switch off leaves the pet visible" symptom but leaves
  `applySettingsSection` still writing the derived value into `pet.json`, so
  the switch stays one-way - the revert-and-rerun control shows two of the four
  cases still failing. A resolver is the wrong layer for an output rule.
- **Make `enabled` the single authority and drop `display.visible` entirely.**
  Rejected. `pet.json`'s `visible` is the pet's `hide`/`summon` control and is
  also what the aggregate shell's fallback card writes when the Host serves no
  pet settings form; removing it would break the sprite's own hide button and
  the shell's switch. Here the pet's own intent is a real, distinct question.
- **Mirror one store into the other on every write.** Rejected. The two are
  written by paths that do not share a transaction (settings bridge vs. the
  pet's REST API), so a mirror can only narrow the divergence window, never
  close it; and silently rewriting the user's stored intent is the defect being
  fixed.
- **Treat a missing `display` block as hidden.** Rejected. Hosts predating the
  visibility switch render the pet, so defaulting to hidden would hide pets on
  upgrade.

## Consequences

- Switching the pet off in the settings page hides it immediately, switching it
  back on restores it without a second step, and a restart keeps whichever
  state the master switch and the pet's own intent together describe.
- A pet hidden from the sprite stays hidden across unrelated settings saves.
- `pet.json` now records only what the user chose; a reader that predates this
  note still sees the same shape (`display.visible`), but that field no longer
  encodes the master switch, so it may read `true` while the pet is off screen
  because the plugin is disabled. The state view is the authority for "is it
  being rendered".
- Four cases were added in `tests/pet-visibility-authority.spec.ts`, driving the
  real resolve-then-apply loop (`petSettingsSection` -> `applySettingsSection`
  + `setEnabled`, exactly as `syncSettings` in `src/index.ts` does).
- Verification: revert-and-rerun control confirmed the new cases fail against
  the pre-fix `applySettingsSection` (2 of 4) and pass with it; the full pet
  suite is 567 passed / 46 files, with both `tsc -b` programs clean and the two
  `node --test` script suites green.
- Not covered: no live GUI screenshot of the desktop settings page toggling the
  switch. The evidence is the service-level loop the host runs, not a rendered
  browser session.

## Coverage gaps

- The aggregate shell's fallback card writes visibility through
  `/api/pet/set-visible` while the Host form writes `enabled`. With the two
  kept apart, a shell user who turns the pet off with that switch now hides it
  through `display.visible` rather than `enabled`; both hide the pet and both
  are reversible, but they are not the same stored field. Converging the shell
  card onto `enabled` is a separate change and is not attempted here.
