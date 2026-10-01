import { createRoot } from 'react-dom/client'
import { useEffect } from 'react'
import { createPetStore } from './pet-store.ts'
import { PetDockEntry } from './PetDockEntry.tsx'
import { t } from './locales.ts'
import type { PetStateView } from '../service.ts'
import type { PetDefinition } from '../registry.ts'

const bridge = window.dshPetOverlay!
const store = createPetStore().create()
let loading = false
let knownPets: PetDefinition[] = []
let latest: PetStateView | undefined
function renderState() {
  if (!latest) return
  const pet = knownPets.find(p => p.id === latest!.pet.id)
  const width = latest.display.size * (pet?.cell.width ?? 192) / (pet?.cell.height ?? 208)
  store.actions.setSnapshot({ ...latest, display: { ...latest.display, right: (window.innerWidth - width) / 2, bottom: 135 } })
}
async function refresh() {
  if (loading) return
  loading = true
  try {
    if (knownPets.length === 0) { knownPets = await bridge.call('pets'); store.actions.setPets(knownPets) }
    latest = await bridge.call('state')
    renderState()
    document.body.dataset.connected = 'true'
  } catch { document.body.dataset.connected = 'false' }
  finally { loading = false }
}
async function action(name: string, body?: unknown) {
  const result = await bridge.call(name, body)
  await refresh()
  return result
}
function interact(kind: 'pet' | 'feed') {
  action(kind).then(result => store.actions.setFeedback({ text: result.reaction, kind, at: Date.now() })).catch(() => {})
}

function App() {
  useEffect(() => {
    const unsubscribe = bridge.subscribe(state => {
      latest = state
      renderState()
      document.body.dataset.connected = 'true'
    }, () => { document.body.dataset.connected = 'false' }, () => { document.body.dataset.retiring = 'true' })
    void refresh()
    let interactive: boolean | undefined
    const setInteractive = (on: boolean) => {
      if (interactive !== on) { interactive = on; bridge.interactive(on) }
    }
    const mouse = (e: MouseEvent) => {
      setInteractive(e.target instanceof Element && e.target.closest('[role="button"],button,input,select,textarea') !== null)
    }
    const leave = () => setInteractive(false)
    document.addEventListener('mousemove', mouse)
    document.addEventListener('mouseleave', leave)
    window.addEventListener('blur', leave)
    window.addEventListener('resize', renderState)
    return () => {
      unsubscribe()
      document.removeEventListener('mousemove', mouse)
      document.removeEventListener('mouseleave', leave)
      window.removeEventListener('blur', leave)
      window.removeEventListener('resize', renderState)
    }
  }, [])
  return <>
    <PetDockEntry store={store} ensure={() => void refresh()} pet={() => interact('pet')} feed={() => interact('feed')}
      hide={() => void action('hide').catch(() => {})} summon={() => void action('show').catch(() => {})}
      dragEnd={() => {}} rename={name => void action('rename', { name }).catch(() => {})}
      openSession={id => void bridge.openMain(id)} feedbackDone={() => store.actions.setFeedback(null)} t={t}
      gameplay={{ touch: zone => action('touch', { zone }), setSkin: skin => action('skin', { skin }),
        setMode: mode => action('mode', { mode }), workTick: () => action('work-tick'), buy: item => action('buy', { item }) }} />
    <div className="pet-disconnected">连接恢复中…</div>
  </>
}
createRoot(document.getElementById('root')!).render(<App />)
