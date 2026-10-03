import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { createRoot } from 'react-dom/client';
import { useEffect } from 'react';
import { createPetStore } from "./pet-store.js";
import { PetDockEntry } from "./PetDockEntry.js";
import { t } from "./locales.js";
import { installDesktopHitTesting } from "./desktop-hit-test.js";
import { defaultPetRendererRegistry } from "./renderers/registry.js";
import { frames2dRenderer } from "./renderers/frames2d.js";
import { petRenderSize } from '../../desktop/pet-layout.js';
defaultPetRendererRegistry.register(frames2dRenderer);
const bridge = window.dshPetOverlay;
const store = createPetStore().create();
let loading = false;
let knownPets = [];
let latest;
function renderState() {
    if (!latest)
        return;
    const pet = knownPets.find(p => p.id === latest.pet.id);
    const width = Math.round(petRenderSize(latest.pet.id, latest.display.size) * (pet?.cell.width ?? 192) / (pet?.cell.height ?? 208));
    store.actions.setSnapshot({ ...latest, display: { ...latest.display, right: (window.innerWidth - width) / 2, bottom: 135 } });
}
async function refresh() {
    if (loading)
        return;
    loading = true;
    try {
        if (knownPets.length === 0) {
            knownPets = await bridge.call('pets');
            store.actions.setPets(knownPets);
        }
        latest = await bridge.call('state');
        renderState();
        document.body.dataset.connected = 'true';
    }
    catch {
        document.body.dataset.connected = 'false';
    }
    finally {
        loading = false;
    }
}
async function action(name, body) {
    const result = await bridge.call(name, body);
    await refresh();
    return result;
}
function interact(kind) {
    action(kind).then(result => store.actions.setFeedback({ text: result.reaction, kind: result.delta > 0 ? kind : 'none', at: Date.now() })).catch(() => { });
}
function App() {
    useEffect(() => {
        const unsubscribe = bridge.subscribe(state => {
            latest = state;
            renderState();
            document.body.dataset.connected = 'true';
        }, () => { document.body.dataset.connected = 'false'; }, () => { document.body.dataset.retiring = 'true'; });
        void refresh();
        const stopHitTesting = installDesktopHitTesting(bridge);
        window.addEventListener('resize', renderState);
        return () => {
            unsubscribe();
            stopHitTesting();
            window.removeEventListener('resize', renderState);
        };
    }, []);
    return _jsxs(_Fragment, { children: [_jsx(PetDockEntry, { store: store, ensure: () => void refresh(), pet: () => interact('pet'), feed: () => interact('feed'), hide: () => void action('hide').catch(() => { }), summon: () => void action('show').catch(() => { }), dragEnd: () => { }, rename: name => void action('rename', { name }).catch(() => { }), openSession: id => void bridge.openMain(id), feedbackDone: () => store.actions.setFeedback(null), t: t, gameplay: { touch: zone => action('touch', { zone }), setSkin: skin => action('skin', { skin }),
                    setMode: mode => action('mode', { mode }), workTick: () => action('work-tick'), buy: item => action('buy', { item }) } }), _jsx("div", { className: "pet-disconnected", children: "\u8FDE\u63A5\u6062\u590D\u4E2D\u2026" })] });
}
createRoot(document.getElementById('root')).render(_jsx(App, {}));
