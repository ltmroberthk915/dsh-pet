# Agent Note: Persistent status bubbles and measured pet mouse input

Status: implemented

## Problem

Some desktop sessions need task feedback without an animated character. The rectangular image hit area also blocks unrelated controls behind transparent artwork. Users expect a single left click to bring DSH forward while retaining petting and the care panel on the right button.

## Decision

Persist an optional `bubbleOnly` display setting through the existing host settings and config routes. Hide all image renderers and image-specific UI in this mode, remove image layout space, and keep a draggable task bubble visible. Idle text is "随时就绪" in Chinese and "Ready when you are" in English; task phases keep their session-specific messages. Existing names, selected characters and care state survive toggling the mode.

Precompute alpha envelopes from shipped frames for each built-in character and animation pose. A stable union of the pose's played frames avoids changing hit geometry on every animation tick. Twenty-four row bands approximate the contour, including registered atlas offsets. DOM clipping and native window rectangles share the same measured geometry. Unrecognized or custom geometry retains its existing interaction area. Native hit updates also include cursor coordinates so a stale DOM result cannot preserve the wrong click-through state after an image or size change.

Left click and keyboard activation focus DSH and the represented session. Right click pets the character, triggers its existing touch interaction and toggles the care panel. Dragging captures the actual bubble or image target and suppresses the trailing click, so moving a companion cannot unexpectedly focus DSH.

## Alternatives considered

- Keeping an invisible sprite placeholder wastes desktop space in status-only mode.
- Tight rectangles per character retain transparent corners and do not cover pose changes.
- Scanning every frame's pixels at runtime adds work and can make the hit boundary flicker.
- Moving the care panel to another gesture would discard a requested existing interaction.

## Consequences

Built-in idle hit areas shrink by about 52%, 39% and 65% for the whale girl, MIKU and business whale respectively. Small alpha islands inside a row band may still be included; the envelope deliberately covers every visible frame of a pose. New built-in assets require regenerating the checked-in geometry with the Python tool. Browser regressions and isolated native Electron checks cover persistent bubbles, contours, click-through, both mouse buttons and drag release. The standalone native smoke script remains a developer tool and is excluded from consumer archives.
