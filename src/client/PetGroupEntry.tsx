import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react'
import { PetDockEntry, type PetDockEntryProps } from './PetDockEntry.tsx'
import { createPetStore } from './pet-store.ts'
import { SECONDARY_PET_SCALE } from '../session-colors.ts'
import type { PetCompanionView, PetStateView } from '../service.ts'

/** Embedded fallback uses the same conversation projections as desktop windows. */
export function PetGroupEntry(props: PetDockEntryProps) {
  const ui = useSyncExternalStore(props.store.subscribe, props.store.getSnapshot)
  // Gate the whole fallback tree. Remounting a session must not reset ownership
  // or restart an invisible second set of sprite animation timers.
  if (ui.desktopActive) return null
  const snapshot = ui.snapshot
  if (!snapshot?.display.multiPetEnabled || !snapshot.display.visible || !snapshot.companions?.length) return <PetDockEntry {...props} />
  return <>{snapshot.companions.map((companion, index) => <EmbeddedCompanion key={companion.sessionId}
    {...props} snapshot={snapshot} companion={companion} index={index} />)}</>
}

function EmbeddedCompanion(props: PetDockEntryProps & { snapshot: PetStateView; companion: PetCompanionView; index: number }) {
  const local = useMemo(() => createPetStore().create(), [])
  const ui = useSyncExternalStore(props.store.subscribe, props.store.getSnapshot)
  const position = useRef<{ right: number; bottom: number } | undefined>(undefined)
  const { snapshot, companion: c } = props
  useEffect(() => {
    const size = c.primary ? snapshot.display.size : Math.max(20, Math.round(snapshot.display.size * SECONDARY_PET_SCALE))
    local.actions.setPets(ui.pets)
    local.actions.setFeedback(c.primary ? ui.feedback : null)
    local.actions.setSnapshot({ ...snapshot, ...c, companions: undefined,
      sessions: c.bubble ? [{ ...c, bubble: c.bubble }] : [], announcement: c.primary ? snapshot.announcement : undefined,
      display: { ...snapshot.display, size, ...(position.current ?? {
        right: snapshot.display.right + (c.primary ? 0 : (props.index + 1) * (size + 20)), bottom: snapshot.display.bottom,
      }) } })
  }, [local, ui.pets, ui.feedback, snapshot, c, props.index])
  return <PetDockEntry {...props} store={local} dragEnd={(right, bottom) => {
    position.current = { right, bottom }
    if (c.primary) props.dragEnd(right, bottom)
  }} />
}
