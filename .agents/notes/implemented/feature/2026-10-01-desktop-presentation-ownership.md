# Desktop presentation ownership

Version `0.4.4-local.20261001.5` fixes a native desktop pet appearing together with an embedded copy. That embedded copy disappears with the owner window when minimized and returns when the owner is restored.

The configure acknowledgement used the state-poll sequence as its validity guard. A newer poll could discard a successful window-creation acknowledgement after its configure options were already cached, leaving the embedded root visible indefinitely. Separately, the transient native-active event was lost when multi-session children remounted, allowing hidden animation loops to restart.

The client store now retains desktop presentation ownership and gates the entire embedded group. Ownership is claimed before launching the window; configure requests use their own generation, independent of polling. The initial state read runs from the client lifecycle even when the fallback child is suppressed. Disabling desktop or an explicit creation failure restores the fallback; a successful retry removes it. Native overlay instances retain their own independent stores.

Two client regressions reproduce the old failure. The corrected suite covers delayed acknowledgements across newer polls, visibility recovery, multi-session remounts, disabling desktop, and retry after a creation failure. Validation: 561 source tests passed, 2 skipped with the optional asset/platform exclusions documented in the branch guide; SDK typecheck and 40 native Electron checks passed. Installer and rollback round-trip passed in an isolated fixture.
