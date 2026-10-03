import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { PlaybackSettings } from "./PlaybackSettings.js";
import { PluginSettingsCard, ValueField, BooleanField, ChoiceField } from "./PluginSettingsCard.js";
import { CardForm, booleanField, choiceField } from "./settings-form.js";
import { petNumberField } from "./pet-setting-fields.js";
import sectionCss from './settings-section.module.css';
import { petJson, petServiceFailure } from "./pet-api.js";
/** Fetch the registry list (the same data the sprite renders from). */
async function fetchPetChoices() {
    const list = await petJson('/api/pet/pets');
    if (!Array.isArray(list) || !list.length || list.some(pet => typeof pet.id !== 'string' || typeof pet.displayName !== 'string')) {
        throw new Error('pet registry unavailable');
    }
    return list;
}
/** Read the selection and visibility from the same persisted state the pet renders. */
async function fetchPetState() {
    const body = await petJson('/api/pet/state');
    if (typeof body.pet?.id !== 'string')
        throw new Error('pet state has no selected pet');
    // A Host without the display block predates the visibility switch; the pet shows.
    return { petId: body.pet.id, visible: body.display?.visible !== false };
}
/** Bridges the 'pet' scope onto the card's staged form. */
export class PetSettingsCardController {
    form;
    store;
    // The choice list rides a mutable array shared with the choiceField spec,
    // so loading the registry re-validates and re-formats the petId field
    // without rebuilding the form.
    petChoices = [];
    petLabels = new Map();
    selectedPetId;
    selectedVisible;
    stagedPetId;
    stagedVisible;
    savingPet = false;
    petSaveFailed = false;
    loaded = false;
    serviceStatus = 'loading';
    disposed = false;
    /** Pending deferred-load or retry timer; cancelled by dispose(). */
    pendingTimer;
    /** @param scope - the bound configuration form for the 'pet' entry. */
    constructor(scope) {
        this.form = new CardForm(scope, [
            booleanField('enabled'),
            booleanField('decorationEnabled'),
            booleanField('visible'),
            petNumberField('size'),
            petNumberField('right'),
            petNumberField('bottom'),
            petNumberField('bubbleScale'),
            choiceField('petId', this.petChoices),
        ]);
        this.store = this.form.bind(() => this.projection());
        // Client plugins are applied synchronously during shell startup. Defer
        // the first registry request until that pass completes so transport
        // plugins (notably remote-web-ui on a paired non-loopback origin) can
        // install their fetch channel before /api/pet/pets is issued.
        this.pendingTimer = window.setTimeout(() => {
            this.pendingTimer = undefined;
            if (this.disposed)
                return;
            void this.refreshService();
        }, 0);
    }
    /** Retry throughout installation/reload; retain drafts until a verified save. */
    async refreshService() {
        const [state, choices] = await Promise.allSettled([
            fetchPetState(), this.loaded ? Promise.resolve(undefined) : fetchPetChoices(),
        ]);
        if (this.disposed)
            return;
        if (choices.status === 'fulfilled' && choices.value) {
            const list = choices.value;
            this.petChoices.splice(0, this.petChoices.length, ...list.map(choice => choice.id));
            for (const choice of list)
                this.petLabels.set(choice.id, choice.displayName);
            this.loaded = true;
        }
        if (state.status === 'fulfilled') {
            this.selectedPetId = state.value.petId;
            this.selectedVisible = state.value.visible;
            this.serviceStatus = choices.status === 'rejected' ? petServiceFailure(choices.reason) : 'ready';
        }
        else {
            this.serviceStatus = petServiceFailure(state.reason);
        }
        this.store.set(this.projection());
        this.pendingTimer = window.setTimeout(() => {
            this.pendingTimer = undefined;
            if (!this.disposed)
                void this.refreshService();
        }, 3000);
    }
    fallback() {
        const shell = this.form.shell();
        return shell.available && !shell.exposed && this.selectedPetId !== undefined;
    }
    /**
     * The visibility the fallback switch renders: the staged draft when the user
     * moved it, the persisted value otherwise. There is no user layer to override
     * here, so the field is never marked overridden.
     */
    fallbackVisible() {
        const value = this.stagedVisible ?? this.selectedVisible;
        return { text: value === undefined ? '' : String(value), overridden: false, invalid: false };
    }
    /**
     * Persist the staged selection and visibility through the pet API — the only
     * writer available when the aggregate shell serves this card, since there is
     * no Host settings form to mutate — then confirm the read-back before the
     * drafts are cleared.
     */
    async saveFallback() {
        const petId = this.stagedPetId;
        const visible = this.stagedVisible;
        if (this.savingPet || this.serviceStatus !== 'ready' || !this.loaded || this.disposed)
            return;
        if (petId === undefined && visible === undefined)
            return;
        if (petId !== undefined && !this.petChoices.includes(petId))
            return;
        this.savingPet = true;
        this.petSaveFailed = false;
        this.store.set(this.projection());
        try {
            if (petId !== undefined) {
                const response = await fetch('/api/pet/set-pet', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ petId }),
                });
                const result = (await response.json());
                if (!response.ok || result.ok !== true || result.petId !== petId) {
                    throw new Error('pet selection was not persisted');
                }
            }
            if (visible !== undefined) {
                const response = await fetch('/api/pet/set-visible', {
                    method: 'POST',
                    headers: { 'content-type': 'application/json' },
                    body: JSON.stringify({ visible }),
                });
                if (!response.ok)
                    throw new Error('pet visibility was not persisted');
            }
            const persisted = await fetchPetState();
            if (petId !== undefined && persisted.petId !== petId)
                throw new Error('pet selection was not persisted');
            if (visible !== undefined && persisted.visible !== visible)
                throw new Error('pet visibility was not persisted');
            this.selectedPetId = persisted.petId;
            this.selectedVisible = persisted.visible;
            if (this.stagedPetId === petId)
                this.stagedPetId = undefined;
            if (this.stagedVisible === visible)
                this.stagedVisible = undefined;
        }
        catch {
            this.petSaveFailed = true;
        }
        finally {
            this.savingPet = false;
            if (!this.disposed)
                this.store.set(this.projection());
        }
    }
    projection() {
        const fallback = this.fallback();
        const shell = this.form.shell();
        const configuredPet = this.form.field('petId');
        return {
            ...shell,
            ...(fallback ? {
                exposed: true,
                writable: this.serviceStatus === 'ready' && this.loaded,
                dirty: this.stagedPetId !== undefined && this.stagedPetId !== this.selectedPetId
                    || this.stagedVisible !== undefined && this.stagedVisible !== this.selectedVisible,
                invalid: this.serviceStatus !== 'ready' || !this.loaded || this.stagedPetId !== undefined && !this.petChoices.includes(this.stagedPetId),
                saving: this.savingPet,
                failed: this.petSaveFailed,
                failedReason: undefined,
            } : {}),
            petSelectionFallback: fallback,
            serviceStatus: this.serviceStatus,
            enabled: this.form.field('enabled'),
            decorationEnabled: this.form.field('decorationEnabled'),
            visible: fallback ? this.fallbackVisible() : this.form.field('visible'),
            size: this.form.field('size'),
            right: this.form.field('right'),
            bottom: this.form.field('bottom'),
            bubbleScale: this.form.field('bubbleScale'),
            petId: fallback
                ? { text: this.stagedPetId ?? this.selectedPetId ?? '', overridden: false, invalid: this.stagedPetId !== undefined && !this.petChoices.includes(this.stagedPetId) }
                : configuredPet.text === '' && this.selectedPetId !== undefined
                    ? { ...configuredPet, text: this.selectedPetId }
                    : configuredPet,
            petChoices: this.petChoices.map(id => ({ value: id, label: this.petLabels.get(id) ?? id })),
        };
    }
    /**
     * Build the face the card's slot registration injects.
     * @returns the card's snapshot and its form actions.
     */
    inject() {
        const actions = this.form.actions();
        return {
            hooks: { petSettingsCard: this.store },
            edit: (field, value) => {
                if (!this.fallback())
                    return actions.edit(field, value);
                if (field === 'petId')
                    this.stagedPetId = value === '' ? undefined : value;
                else if (field === 'visible')
                    this.stagedVisible = value === '' ? undefined : value === 'true';
                else
                    return;
                this.petSaveFailed = false;
                this.store.set(this.projection());
            },
            resetField: (field) => {
                if (!this.fallback())
                    return actions.resetField(field);
                if (field === 'petId')
                    this.stagedPetId = undefined;
                else if (field === 'visible')
                    this.stagedVisible = undefined;
                else
                    return;
                this.petSaveFailed = false;
                this.store.set(this.projection());
            },
            save: () => { if (this.fallback())
                void this.saveFallback();
            else
                actions.save(); },
            discard: () => {
                if (!this.fallback())
                    return actions.discard();
                this.stagedPetId = undefined;
                this.stagedVisible = undefined;
                this.petSaveFailed = false;
                this.store.set(this.projection());
            },
        };
    }
    /**
     * Release the card's scope subscription, bound stores and pending load
     * timers; the slot disposer calls this on teardown.
     */
    dispose() {
        if (this.disposed)
            return;
        this.disposed = true;
        if (this.pendingTimer !== undefined) {
            window.clearTimeout(this.pendingTimer);
            this.pendingTimer = undefined;
        }
        this.form.dispose();
    }
}
/**
 * Render the pet settings card.
 * @param props - locale copy, the card snapshot, and its form actions.
 * @returns the card.
 */
export function PetSettingsCard(props) {
    const { t } = props;
    const state = props.usePetSettingsCard(snapshot => snapshot);
    const disabled = !state.writable;
    const serviceNotice = t(state.serviceStatus === 'authorization' ? 'settings.serviceAuthorization'
        : state.serviceStatus === 'loading' ? 'settings.serviceLoading' : 'settings.serviceUnavailable');
    const fieldProps = {
        overriddenLabel: t('settings.overridden'),
        resetLabel: t('settings.reset'),
        invalidLabel: t('settings.invalidNumber'),
        disabled,
    };
    return (_jsxs(PluginSettingsCard, { t: (key, params) => key === 'settings.notExposed' || key === 'settings.readOnly' && state.petSelectionFallback && state.serviceStatus !== 'ready' ? serviceNotice : t(key, params), titleKey: "settings.title", descriptionKey: "settings.description", descriptionNode: state.petSelectionFallback ? t('settings.petHint') : undefined, state: state, onSave: props.save, onDiscard: props.discard, alwaysOpen: true, children: [state.invalid && (!state.petSelectionFallback || state.serviceStatus === 'ready') && _jsx("p", { role: "status", style: { color: '#c58b2a', lineHeight: 1.6 }, children: t('settings.invalidDraft') }), state.petSelectionFallback ? null : _jsx(BooleanField, { id: "settings-pet-enabled", label: t('settings.enabled'), hint: t('settings.enabledHint'), inheritLabel: t('settings.inherit'), onLabel: t('settings.on'), offLabel: t('settings.off'), ...fieldProps, ...state.enabled, onEdit: (text) => { props.edit('enabled', text); }, onReset: () => { props.resetField('enabled'); } }), state.petSelectionFallback ? null : _jsx(BooleanField, { id: "settings-pet-decoration", label: t('settings.decoration'), hint: t('settings.decorationHint'), inheritLabel: t('settings.inherit'), onLabel: t('settings.on'), offLabel: t('settings.off'), ...fieldProps, ...state.decorationEnabled, onEdit: (text) => { props.edit('decorationEnabled', text); }, onReset: () => { props.resetField('decorationEnabled'); } }), _jsx(ChoiceField, { id: "settings-pet-pet", label: t('settings.pet'), hint: t('settings.petHint'), inheritLabel: t('settings.inherit'), ...fieldProps, ...state.petId, choices: state.petChoices, disabled: disabled || state.petChoices.length === 1, onEdit: (text) => { props.edit('petId', text); }, onReset: () => { props.resetField('petId'); } }), _jsx(BooleanField, { id: "settings-pet-visible", label: t('settings.visible'), hint: t('settings.visibleHint'), inheritLabel: t('settings.inherit'), onLabel: t('settings.on'), offLabel: t('settings.off'), ...fieldProps, ...state.visible, onEdit: (text) => { props.edit('visible', text); }, onReset: () => { props.resetField('visible'); } }), state.petSelectionFallback ? null : _jsx(ValueField, { id: "settings-pet-size", label: t('settings.size'), hint: t('settings.sizeHint'), numeric: true, ...fieldProps, ...state.size, invalidLabel: t('settings.invalidSize'), onEdit: (text) => { props.edit('size', text); }, onReset: () => { props.resetField('size'); } }), state.petSelectionFallback ? null : _jsx(ValueField, { id: "settings-pet-right", label: t('settings.right'), hint: t('settings.rightHint'), numeric: true, ...fieldProps, ...state.right, invalidLabel: t('settings.invalidInset'), onEdit: (text) => { props.edit('right', text); }, onReset: () => { props.resetField('right'); } }), state.petSelectionFallback ? null : _jsx(ValueField, { id: "settings-pet-bottom", label: t('settings.bottom'), hint: t('settings.bottomHint'), numeric: true, ...fieldProps, ...state.bottom, invalidLabel: t('settings.invalidInset'), onEdit: (text) => { props.edit('bottom', text); }, onReset: () => { props.resetField('bottom'); } }), state.petSelectionFallback ? null : _jsx(ValueField, { id: "settings-pet-bubble-scale", label: t('settings.bubbleScale'), hint: t('settings.bubbleScaleHint'), numeric: true, ...fieldProps, ...state.bubbleScale, invalidLabel: t('settings.invalidBubbleScale'), onEdit: (text) => { props.edit('bubbleScale', text); }, onReset: () => { props.resetField('bubbleScale'); } })] }));
}
/** Render the pet settings card as a first-level settings page. */
export function PetSettingsSection(props) {
    const { t, usePetSettingsCard, save, discard, edit, resetField } = props;
    return (_jsxs("ul", { className: sectionCss.sectionList, children: [_jsx(PetSettingsCard, { t: t, usePetSettingsCard: usePetSettingsCard, save: save, discard: discard, edit: edit, resetField: resetField }), _jsx("li", { style: { listStyle: "none" }, children: _jsx(PlaybackSettings, {}) })] }));
}
