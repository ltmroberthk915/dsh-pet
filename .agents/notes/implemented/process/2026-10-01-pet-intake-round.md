# Agent Note: The 2026-10-01 pet intake round

Status: implemented

## Problem

The 2026-10-01 maintenance round reviewed the three open pet submissions:
#3 (mei-chi-bao), #4 (long-niang), and #5 (jyn-foxtail, a frames2d pet). All
three carry green CI on their heads, and CI proves the manifests, the atlases,
and the registry assertions - but none of the three gate legs that decide an
intake (runtime evidence, source declaration, aesthetics) is something CI can
produce.

## Decision

**No pet was merged. All three hold on the same single blocker: runtime
evidence.**

The artwork was judged from the actual products. #3's and #4's 8x11 atlases and
previews are clean chibi work - no clipped limbs, no stray cells, coherent
palettes, transparent unused cells. #5's thirteen frames2d tracks were sampled
across idle, tease, work, and sleep previews; the papercut style is consistent
and the 25-frame tracks read cleanly. Aesthetics pass on all three.

The source declarations are in order too: #3 names both original authors with
Bilibili links and the CC BY-NC-SA chain with the non-commercial and
non-affiliation statement; #4 does the same for ZipZipPipe's character; #5 is
MIT with the author's own character, correctly needing no
THIRD_PARTY_NOTICES entry.

What none of the three provides is gate 1: real screenshots or a recording of
the pet appearing in the settings-page pet selector and animating through its
states after being selected. The in-repo previews prove the assets, not the
installation, and the intake rule is explicit that CI cannot substitute for
this. Each PR now carries a CHANGES_REQUESTED review naming exactly that item;
the previews-based aesthetics verdicts are on record so nothing is re-litigated
once the evidence lands.

## Alternatives considered

- Treating the committed previews as the required evidence: rejected - the gate
  exists because assets that validate can still fail to install, register, or
  play, and a selector screenshot is the only artifact that proves the whole
  chain.
- Merging #3 and #4 (whose declarations are complete) and holding only #5:
  rejected - the missing item is identical across the three, and uneven
  enforcement would just move the question to the next round.

## Consequences

Three submissions stay open with one named blocker each; the next round
re-checks only the runtime evidence. The registry-test bookkeeping in #5
(pinned pet-id list) is confirmed consistent, so its evidence can be attached
without a rebase.
