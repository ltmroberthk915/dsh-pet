# Session pet placement and completion review

Version `0.4.4-local.20261002.1` separates overlapping desktop pets at creation, size changes, drag completion and display changes. Placement uses sprite bounds, anchors the main pet, preserves clear user edge positions, and checks nearby gaps across all displays. It adds no permanent collision timer. A full display uses a bounded least-overlap fallback. Secondary scale changes from 0.62 to 0.527.

GPT's base atlas is now soft bean-paste green; GLM's purple value multiplier changes from 0.86 to 0.74. Programmatic recoloring preserves the alpha channel, frame coordinates, original WebP and non-blue details. Other palettes remain byte-identical.

Finished secondary companions wait until their conversation is viewed. Main selection still follows the workspace main-view ownership marker, without requiring text input. Only a focused, visible client explicitly acknowledges the selected conversation's completion through the authenticated JSON route. State reads remain free of persistence writes. Completion revisions reject late acknowledgements from a previous turn. A viewed completion stays as the main pet until another conversation is selected, then retires instead of becoming another small pet. Pending companions reserve their colors and survive activity-cache pruning. This is transient lifecycle state; host session disposal and application exit release it.

Validation: SDK typecheck and local build; 571 source tests pass, 2 skipped with platform/optional-asset exclusions in the branch guide; 48 isolated Electron checks pass. New checks cover placement, main-size promotion without input, waiting after completion, focused-visible acknowledgements, stale responses, view-and-leave retirement, and pending-color retention.
