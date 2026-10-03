/**
 * Pet gameplay — the optional manifest 'gameplay' block and its host engine.
 * The block layers an opt-in mini-game over any frames2d pet: decaying stat
 * bars, currencies, a weighted idle director, touch zones, a work loop, a
 * sleep loop, passive income and a shop (issue: miku-pet generalization).
 *
 * Discipline split matches manifest-v2: STRUCTURE is fail-closed (types,
 * ranges, references into stats/tracks); the host engine is pure — every
 * verb takes an explicit clock and rng so tests stay deterministic. Decay,
 * passive income and sleep restore are lazy-settled on read (the treats.ts
 * discipline): the host runs no timers for gameplay.
 * @module dsh-pet-copilot/gameplay
 */
/** Every roam direction, in roll order (equal chance each unless restricted). */
export const PET_ROAM_DIRECTIONS = ['up', 'down', 'left', 'right'];
/* ------------------------------------------------------------------ *
 * Manifest parsing (fail-closed structure)
 * ------------------------------------------------------------------ */
const KEBAB = /^[a-z0-9][a-z0-9-]*$/;
const MAX_STATS = 16;
const MAX_ZONES = 8;
const MAX_BRANCHES = 8;
const MAX_ACTS = 16;
const MAX_SHOP_ITEMS = 32;
const MAX_LOTTERY_TIERS = 16;
const MAX_PHRASES = 64;
const PHRASE_MAX_LENGTH = 120;
const MAX_MODES = 8;
const MODE_LABEL_MAX_LENGTH = 40;
const STAT_VALUE_MAX = 1_000_000;
const CURRENCY_MAX = 9_999_999;
const KNOWN_GAMEPLAY = new Set(['idleDirector', 'stats', 'hitBox', 'touch', 'work', 'sleep', 'modes', 'roam', 'passiveIncome', 'shop', 'dragState', 'dragEndState']);
const KNOWN_STAT = new Set(['max', 'initial', 'decayPerMinute', 'workingDecayPerMinute', 'idleDecayPerMinute']);
const KNOWN_ZONE = new Set(['name', 'y0', 'y1', 'branches']);
const KNOWN_TOUCH = new Set(['zones', 'clickBoost']);
const KNOWN_BRANCH = new Set(['probability', 'effects', 'state', 'stateMs', 'phrases']);
const KNOWN_EFFECT = new Set(['stat', 'currency', 'amount']);
const KNOWN_WORK = new Set(['state', 'successState', 'failState', 'tickMs', 'resultMs', 'successProbability', 'success', 'fail']);
const KNOWN_SLEEP = new Set(['state', 'wakeState', 'restore']);
const KNOWN_MODE = new Set(['state', 'label', 'activeLabel', 'restore']);
const KNOWN_ROAM = new Set(['state', 'intervalMs', 'probability', 'distanceMin', 'distanceMax', 'speed', 'directions']);
const KNOWN_RESTORE = new Set(['stat', 'amount', 'intervalMs']);
const KNOWN_SHOP_ITEM = new Set(['id', 'label', 'image', 'price', 'currency', 'effects', 'lottery']);
const KNOWN_LOTTERY = new Set(['effects', 'currency', 'tiers']);
const KNOWN_IDLE_DIRECTOR = new Set(['intervalMs', 'maxMiss', 'idleWeight', 'acts']);
const KNOWN_ACT = new Set(['track', 'weight', 'phrases']);
function isRecord(value) {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function unknownKeys(source, known) {
    return Object.keys(source).filter(key => !known.has(key));
}
function validName(name, max = 32) {
    return typeof name === 'string' && name.length <= max && KEBAB.test(name);
}
function intIn(value, min, max) {
    return typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max;
}
function numIn(value, min, max) {
    return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}
function parseEffects(raw, field, stats, hooks) {
    if (raw === undefined)
        return undefined;
    if (!Array.isArray(raw) || raw.length === 0) {
        hooks.error(field + ' must be a non-empty array of effects');
        return undefined;
    }
    const effects = [];
    for (const entry of raw) {
        if (!isRecord(entry)) {
            hooks.error(field + ': every effect must be an object');
            continue;
        }
        const extra = unknownKeys(entry, KNOWN_EFFECT);
        if (extra.length > 0)
            hooks.error(field + ': unknown effect field(s) ' + extra.map(k => JSON.stringify(k)).join(', '));
        const hasStat = typeof entry.stat === 'string';
        const hasCurrency = typeof entry.currency === 'string';
        if (hasStat === hasCurrency) {
            hooks.error(field + ': an effect needs exactly one of stat or currency');
            continue;
        }
        if (!intIn(entry.amount, -STAT_VALUE_MAX, STAT_VALUE_MAX) || entry.amount === 0) {
            hooks.error(field + ': effect amount must be a non-zero integer within ±' + STAT_VALUE_MAX);
            continue;
        }
        if (hasStat && stats[entry.stat] === undefined) {
            hooks.error(field + ': effect references undeclared stat ' + JSON.stringify(entry.stat));
            continue;
        }
        if (hasCurrency && !validName(entry.currency, 24)) {
            hooks.error(field + ': effect currency must be a kebab id');
            continue;
        }
        effects.push({
            ...(hasStat ? { stat: entry.stat } : {}),
            ...(hasCurrency ? { currency: entry.currency } : {}),
            amount: entry.amount,
        });
    }
    return effects.length === 0 ? undefined : effects;
}
function parsePhrases(raw, field, hooks) {
    if (raw === undefined)
        return undefined;
    if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_PHRASES
        || raw.some(line => typeof line !== 'string' || line.trim() === '' || line.length > PHRASE_MAX_LENGTH)) {
        hooks.error(field + ' must be 1..' + MAX_PHRASES + ' non-empty lines of at most ' + PHRASE_MAX_LENGTH + ' chars');
        return undefined;
    }
    return raw;
}
function parseStateRef(raw, field, hooks) {
    if (raw === undefined)
        return undefined;
    if (typeof raw !== 'string' || !hooks.stateNames.has(raw)) {
        hooks.error(field + ' must name a declared frames2d track');
        return undefined;
    }
    return raw;
}
/** Parse one mode restore rule "{ stat (declared), amount, intervalMs }". */
function parseModeRestore(raw, field, stats, fail) {
    if (!isRecord(raw)) {
        fail(field + ' must be an object { stat, amount, intervalMs }');
        return undefined;
    }
    const extra = unknownKeys(raw, KNOWN_RESTORE);
    if (extra.length > 0)
        fail(field + ': unknown field(s) ' + extra.map(k => JSON.stringify(k)).join(', '));
    const stat = typeof raw.stat === 'string' && stats[raw.stat] !== undefined ? raw.stat : undefined;
    if (stat === undefined)
        fail(field + '.stat must reference a declared stat');
    if (!intIn(raw.amount, 1, 1000))
        fail(field + '.amount must be an integer in [1, 1000]');
    if (!intIn(raw.intervalMs, 1000, 600_000))
        fail(field + '.intervalMs must be an integer in [1000, 600000]');
    if (stat === undefined || !intIn(raw.amount, 1, 1000) || !intIn(raw.intervalMs, 1000, 600_000))
        return undefined;
    return { stat, amount: raw.amount, intervalMs: raw.intervalMs };
}
/**
 * Validate the manifest 'gameplay' block (fail-closed). Only frames2d pets
 * may declare gameplay today: every state reference checks against the
 * declared track names.
 */
export function parseGameplayManifest(raw, hooks) {
    const error = (message) => hooks.error(message);
    if (!isRecord(raw)) {
        error('gameplay must be an object');
        return undefined;
    }
    const extra = unknownKeys(raw, KNOWN_GAMEPLAY);
    if (extra.length > 0)
        error('gameplay: unknown field(s) ' + extra.map(k => JSON.stringify(k)).join(', '));
    let failed = false;
    const fail = (message) => { failed = true; error(message); };
    // --- stats (parsed first: effects reference them) ---
    const stats = {};
    if (raw.stats !== undefined) {
        if (!isRecord(raw.stats))
            fail('gameplay.stats must be an object keyed by stat id');
        else {
            const entries = Object.entries(raw.stats);
            if (entries.length > MAX_STATS)
                fail('gameplay.stats declares too many stats (max ' + MAX_STATS + ')');
            for (const [name, value] of entries) {
                if (!validName(name, 24)) {
                    fail('gameplay.stats: invalid stat id ' + JSON.stringify(name));
                    continue;
                }
                if (!isRecord(value)) {
                    fail('gameplay.stats.' + name + ' must be an object');
                    continue;
                }
                const statExtra = unknownKeys(value, KNOWN_STAT);
                if (statExtra.length > 0)
                    fail('gameplay.stats.' + name + ': unknown field(s) ' + statExtra.map(k => JSON.stringify(k)).join(', '));
                if (!intIn(value.max, 1, STAT_VALUE_MAX)) {
                    fail('gameplay.stats.' + name + '.max must be an integer in [1, ' + STAT_VALUE_MAX + ']');
                    continue;
                }
                const def = { max: value.max };
                if (value.initial !== undefined) {
                    if (!numIn(value.initial, 0, value.max))
                        fail('gameplay.stats.' + name + '.initial must be within [0, max]');
                    else
                        def.initial = value.initial;
                }
                for (const key of ['decayPerMinute', 'workingDecayPerMinute', 'idleDecayPerMinute']) {
                    if (value[key] !== undefined) {
                        if (!numIn(value[key], 0, 1000))
                            fail('gameplay.stats.' + name + '.' + key + ' must be a number in [0, 1000]');
                        else
                            def[key] = value[key];
                    }
                }
                stats[name] = def;
            }
        }
    }
    const block = {};
    if (Object.keys(stats).length > 0)
        block.stats = stats;
    // --- idle director ---
    if (raw.idleDirector !== undefined) {
        if (!isRecord(raw.idleDirector) || !Array.isArray(raw.idleDirector.acts)) {
            fail('gameplay.idleDirector must be an object with an acts array');
        }
        else {
            const d = raw.idleDirector;
            const dExtra = unknownKeys(d, KNOWN_IDLE_DIRECTOR);
            if (dExtra.length > 0)
                fail('gameplay.idleDirector: unknown field(s) ' + dExtra.map(k => JSON.stringify(k)).join(', '));
            if (d.intervalMs !== undefined && !intIn(d.intervalMs, 1000, 60_000))
                fail('gameplay.idleDirector.intervalMs must be an integer in [1000, 60000]');
            if (d.maxMiss !== undefined && !intIn(d.maxMiss, 0, 10))
                fail('gameplay.idleDirector.maxMiss must be an integer in [0, 10]');
            if (d.idleWeight !== undefined && !intIn(d.idleWeight, 0, 10_000))
                fail('gameplay.idleDirector.idleWeight must be an integer in [0, 10000]');
            if (d.acts.length === 0 || d.acts.length > MAX_ACTS)
                fail('gameplay.idleDirector.acts must declare 1..' + MAX_ACTS + ' acts');
            const acts = [];
            for (const act of d.acts) {
                if (!isRecord(act) || !intIn(act.weight, 1, 10_000)) {
                    fail('gameplay.idleDirector.acts entries need a weight integer in [1, 10000]');
                    continue;
                }
                const aExtra = unknownKeys(act, KNOWN_ACT);
                if (aExtra.length > 0)
                    fail('gameplay.idleDirector.acts: unknown field(s) ' + aExtra.map(k => JSON.stringify(k)).join(', '));
                const track = parseStateRef(act.track, 'gameplay.idleDirector.acts.track', hooks);
                if (track === undefined)
                    continue;
                const entry = { track, weight: act.weight };
                const phrases = parsePhrases(act.phrases, 'gameplay.idleDirector.acts.phrases', hooks);
                if (phrases !== undefined)
                    entry.phrases = phrases;
                acts.push(entry);
            }
            if (acts.length > 0) {
                block.idleDirector = {
                    intervalMs: intIn(d.intervalMs, 1000, 60_000) ? d.intervalMs : 5000,
                    maxMiss: intIn(d.maxMiss, 0, 10) ? d.maxMiss : 2,
                    idleWeight: intIn(d.idleWeight, 0, 10_000) ? d.idleWeight : 0,
                    acts,
                };
            }
        }
    }
    // --- hit box ---
    if (raw.hitBox !== undefined) {
        const b = raw.hitBox;
        if (!isRecord(b) || !numIn(b.x0, 0, 1) || !numIn(b.x1, 0, 1) || !numIn(b.y0, 0, 1) || !numIn(b.y1, 0, 1)
            || !(b.x0 < b.x1) || !(b.y0 < b.y1)) {
            fail('gameplay.hitBox must be { x0, y0, x1, y1 } fractions with x0 < x1 and y0 < y1');
        }
        else {
            block.hitBox = { x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 };
        }
    }
    // --- touch zones ---
    if (raw.touch !== undefined) {
        if (!isRecord(raw.touch) || !Array.isArray(raw.touch.zones)) {
            fail('gameplay.touch must be an object with a zones array');
        }
        else {
            const tExtra = unknownKeys(raw.touch, KNOWN_TOUCH);
            if (tExtra.length > 0)
                fail('gameplay.touch: unknown field(s) ' + tExtra.map(k => JSON.stringify(k)).join(', '));
            let clickBoost;
            if (raw.touch.clickBoost !== undefined) {
                const cb = raw.touch.clickBoost;
                if (!isRecord(cb) || typeof cb.stat !== 'string' || stats[cb.stat] === undefined
                    || !intIn(cb.min, 0, 1000) || !intIn(cb.max, 0, 1000) || cb.min > cb.max) {
                    fail('gameplay.touch.clickBoost must be { stat (declared), min, max } integers with 0 <= min <= max <= 1000');
                }
                else
                    clickBoost = { stat: cb.stat, min: cb.min, max: cb.max };
            }
            const zones = [];
            if (raw.touch.zones.length === 0 || raw.touch.zones.length > MAX_ZONES)
                fail('gameplay.touch.zones must declare 1..' + MAX_ZONES + ' zones');
            for (const zoneRaw of raw.touch.zones) {
                if (!isRecord(zoneRaw) || !validName(zoneRaw.name) || !numIn(zoneRaw.y0, 0, 1) || !numIn(zoneRaw.y1, 0, 1) || !(zoneRaw.y0 < zoneRaw.y1)) {
                    fail('gameplay.touch.zones entries need a kebab name and 0 <= y0 < y1 <= 1');
                    continue;
                }
                const zExtra = unknownKeys(zoneRaw, KNOWN_ZONE);
                if (zExtra.length > 0)
                    fail('gameplay.touch.' + zoneRaw.name + ': unknown field(s) ' + zExtra.map(k => JSON.stringify(k)).join(', '));
                if (!Array.isArray(zoneRaw.branches) || zoneRaw.branches.length === 0 || zoneRaw.branches.length > MAX_BRANCHES) {
                    fail('gameplay.touch.' + zoneRaw.name + '.branches must declare 1..' + MAX_BRANCHES + ' branches');
                    continue;
                }
                let probabilitySum = 0;
                const branches = [];
                for (const branchRaw of zoneRaw.branches) {
                    if (!isRecord(branchRaw) || !numIn(branchRaw.probability, 0, 1) || branchRaw.probability === 0) {
                        fail('gameplay.touch.' + zoneRaw.name + '.branches entries need a probability in (0, 1]');
                        continue;
                    }
                    const bExtra = unknownKeys(branchRaw, KNOWN_BRANCH);
                    if (bExtra.length > 0)
                        fail('gameplay.touch.' + zoneRaw.name + ': unknown branch field(s) ' + bExtra.map(k => JSON.stringify(k)).join(', '));
                    probabilitySum += branchRaw.probability;
                    const branch = { probability: branchRaw.probability };
                    const effects = parseEffects(branchRaw.effects, 'gameplay.touch.' + zoneRaw.name + '.effects', stats, hooks);
                    if (effects !== undefined)
                        branch.effects = effects;
                    const state = parseStateRef(branchRaw.state, 'gameplay.touch.' + zoneRaw.name + '.state', hooks);
                    if (state !== undefined)
                        branch.state = state;
                    if (branchRaw.stateMs !== undefined) {
                        if (!intIn(branchRaw.stateMs, 200, 10_000))
                            fail('gameplay.touch.' + zoneRaw.name + '.stateMs must be an integer in [200, 10000]');
                        else
                            branch.stateMs = branchRaw.stateMs;
                    }
                    const phrases = parsePhrases(branchRaw.phrases, 'gameplay.touch.' + zoneRaw.name + '.phrases', hooks);
                    if (phrases !== undefined)
                        branch.phrases = phrases;
                    branches.push(branch);
                }
                if (probabilitySum > 1 + 1e-9)
                    fail('gameplay.touch.' + zoneRaw.name + ': branch probabilities must sum to at most 1');
                if (branches.length > 0)
                    zones.push({ name: zoneRaw.name, y0: zoneRaw.y0, y1: zoneRaw.y1, branches });
            }
            if (zones.length > 0 || clickBoost !== undefined)
                block.touch = { zones, ...(clickBoost === undefined ? {} : { clickBoost }) };
        }
    }
    // --- work ---
    if (raw.work !== undefined) {
        const w = raw.work;
        if (!isRecord(w))
            fail('gameplay.work must be an object');
        else {
            const wExtra = unknownKeys(w, KNOWN_WORK);
            if (wExtra.length > 0)
                fail('gameplay.work: unknown field(s) ' + wExtra.map(k => JSON.stringify(k)).join(', '));
            const state = parseStateRef(w.state, 'gameplay.work.state', hooks);
            const successState = parseStateRef(w.successState, 'gameplay.work.successState', hooks);
            const failState = parseStateRef(w.failState, 'gameplay.work.failState', hooks);
            if (!intIn(w.tickMs, 1000, 60_000))
                fail('gameplay.work.tickMs must be an integer in [1000, 60000]');
            if (!numIn(w.successProbability, 0, 1))
                fail('gameplay.work.successProbability must be a number in [0, 1]');
            if (state !== undefined && successState !== undefined && failState !== undefined
                && intIn(w.tickMs, 1000, 60_000) && numIn(w.successProbability, 0, 1)) {
                const work = {
                    state, successState, failState,
                    tickMs: w.tickMs,
                    successProbability: w.successProbability,
                };
                if (w.resultMs !== undefined) {
                    if (!isRecord(w.resultMs) || !intIn(w.resultMs.success, 200, 10_000) || !intIn(w.resultMs.fail, 200, 10_000)) {
                        fail('gameplay.work.resultMs must be { success, fail } integers in [200, 10000]');
                    }
                    else
                        work.resultMs = { success: w.resultMs.success, fail: w.resultMs.fail };
                }
                for (const key of ['success', 'fail']) {
                    if (w[key] !== undefined) {
                        if (!isRecord(w[key]))
                            fail('gameplay.work.' + key + ' must be an object { effects }');
                        else {
                            const effects = parseEffects(w[key].effects, 'gameplay.work.' + key + '.effects', stats, hooks);
                            if (effects !== undefined)
                                work[key] = { effects };
                        }
                    }
                }
                block.work = work;
            }
        }
    }
    // --- sleep ---
    if (raw.sleep !== undefined) {
        const s = raw.sleep;
        if (!isRecord(s) || !isRecord(s.restore))
            fail('gameplay.sleep must be an object with a restore block');
        else {
            const sExtra = unknownKeys(s, KNOWN_SLEEP);
            if (sExtra.length > 0)
                fail('gameplay.sleep: unknown field(s) ' + sExtra.map(k => JSON.stringify(k)).join(', '));
            const state = parseStateRef(s.state, 'gameplay.sleep.state', hooks);
            const wakeState = parseStateRef(s.wakeState, 'gameplay.sleep.wakeState', hooks);
            const restore = parseModeRestore(s.restore, 'gameplay.sleep.restore', stats, fail);
            if (state !== undefined && restore !== undefined) {
                block.sleep = {
                    state,
                    ...(wakeState === undefined ? {} : { wakeState }),
                    restore,
                };
            }
        }
    }
    // --- extra modes (bath and friends) ---
    if (raw.modes !== undefined) {
        if (!isRecord(raw.modes))
            fail('gameplay.modes must be an object keyed by mode id');
        else {
            const entries = Object.entries(raw.modes);
            if (entries.length > MAX_MODES)
                fail('gameplay.modes declares too many modes (max ' + MAX_MODES + ')');
            const modes = {};
            for (const [name, value] of entries) {
                if (!validName(name, 24) || name === 'work' || name === 'sleep') {
                    fail('gameplay.modes: invalid mode id ' + JSON.stringify(name) + ' (kebab, and not the reserved work/sleep)');
                    continue;
                }
                if (!isRecord(value)) {
                    fail('gameplay.modes.' + name + ' must be an object');
                    continue;
                }
                const mExtra = unknownKeys(value, KNOWN_MODE);
                if (mExtra.length > 0)
                    fail('gameplay.modes.' + name + ': unknown field(s) ' + mExtra.map(k => JSON.stringify(k)).join(', '));
                const state = parseStateRef(value.state, 'gameplay.modes.' + name + '.state', hooks);
                let usable = state !== undefined;
                let label;
                if (value.label !== undefined) {
                    if (typeof value.label !== 'string' || value.label.trim() === '' || value.label.length > MODE_LABEL_MAX_LENGTH) {
                        fail('gameplay.modes.' + name + '.label must be a non-empty string of at most ' + MODE_LABEL_MAX_LENGTH + ' chars');
                        usable = false;
                    }
                    else
                        label = value.label.trim();
                }
                let activeLabel;
                if (value.activeLabel !== undefined) {
                    if (typeof value.activeLabel !== 'string' || value.activeLabel.trim() === '' || value.activeLabel.length > MODE_LABEL_MAX_LENGTH) {
                        fail('gameplay.modes.' + name + '.activeLabel must be a non-empty string of at most ' + MODE_LABEL_MAX_LENGTH + ' chars');
                        usable = false;
                    }
                    else
                        activeLabel = value.activeLabel.trim();
                }
                const restore = value.restore === undefined ? undefined : parseModeRestore(value.restore, 'gameplay.modes.' + name + '.restore', stats, fail);
                if (value.restore !== undefined && restore === undefined)
                    usable = false;
                if (usable && state !== undefined) {
                    modes[name] = {
                        state,
                        ...(label === undefined ? {} : { label }),
                        ...(activeLabel === undefined ? {} : { activeLabel }),
                        ...(restore === undefined ? {} : { restore }),
                    };
                }
            }
            if (Object.keys(modes).length > 0)
                block.modes = modes;
        }
    }
    // --- random roaming ---
    if (raw.roam !== undefined) {
        const rm = raw.roam;
        if (!isRecord(rm))
            fail('gameplay.roam must be an object');
        else {
            const rExtra = unknownKeys(rm, KNOWN_ROAM);
            if (rExtra.length > 0)
                fail('gameplay.roam: unknown field(s) ' + rExtra.map(k => JSON.stringify(k)).join(', '));
            const state = parseStateRef(rm.state, 'gameplay.roam.state', hooks);
            if (!intIn(rm.intervalMs, 1000, 3_600_000))
                fail('gameplay.roam.intervalMs must be an integer in [1000, 3600000]');
            if (!numIn(rm.probability, 0, 1) || rm.probability === 0)
                fail('gameplay.roam.probability must be a number in (0, 1]');
            if (!intIn(rm.distanceMin, 1, 2000))
                fail('gameplay.roam.distanceMin must be an integer in [1, 2000]');
            if (!intIn(rm.distanceMax, 1, 2000))
                fail('gameplay.roam.distanceMax must be an integer in [1, 2000]');
            if (intIn(rm.distanceMin, 1, 2000) && intIn(rm.distanceMax, 1, 2000) && rm.distanceMin > rm.distanceMax) {
                fail('gameplay.roam.distanceMin must not exceed distanceMax');
            }
            if (!intIn(rm.speed, 1, 2000))
                fail('gameplay.roam.speed must be an integer in [1, 2000] (px per second)');
            let directions;
            if (rm.directions !== undefined) {
                if (!Array.isArray(rm.directions) || rm.directions.length === 0) {
                    fail('gameplay.roam.directions must be a non-empty array of up, down, left, right');
                }
                else {
                    const picked = [];
                    for (const entry of rm.directions) {
                        if (typeof entry !== 'string' || !PET_ROAM_DIRECTIONS.includes(entry)) {
                            fail('gameplay.roam.directions entries must be up, down, left or right');
                            picked.length = 0;
                            break;
                        }
                        if (picked.includes(entry)) {
                            fail('gameplay.roam.directions must not repeat ' + entry);
                            picked.length = 0;
                            break;
                        }
                        picked.push(entry);
                    }
                    if (picked.length > 0)
                        directions = picked;
                }
            }
            // The guards are repeated inline: tsc only narrows the unknown fields
            // through a call in the condition itself.
            if (state !== undefined
                && intIn(rm.intervalMs, 1000, 3_600_000)
                && numIn(rm.probability, 0, 1) && rm.probability !== 0
                && intIn(rm.distanceMin, 1, 2000)
                && intIn(rm.distanceMax, 1, 2000)
                && rm.distanceMin <= rm.distanceMax
                && intIn(rm.speed, 1, 2000)) {
                block.roam = {
                    state,
                    intervalMs: rm.intervalMs,
                    probability: rm.probability,
                    distanceMin: rm.distanceMin,
                    distanceMax: rm.distanceMax,
                    speed: rm.speed,
                    ...(directions === undefined ? {} : { directions }),
                };
            }
        }
    }
    // --- passive income ---
    if (raw.passiveIncome !== undefined) {
        const p = raw.passiveIncome;
        if (!isRecord(p) || !validName(p.currency, 24) || !intIn(p.amount, 1, 10_000) || !intIn(p.intervalMs, 1000, 86_400_000)) {
            fail('gameplay.passiveIncome must be { currency (kebab), amount 1..10000, intervalMs 1000..86400000 }');
        }
        else {
            block.passiveIncome = { currency: p.currency, amount: p.amount, intervalMs: p.intervalMs };
        }
    }
    // --- shop ---
    if (raw.shop !== undefined) {
        const s = raw.shop;
        if (!isRecord(s) || !Array.isArray(s.items) || s.items.length === 0 || s.items.length > MAX_SHOP_ITEMS) {
            fail('gameplay.shop must be an object with 1..' + MAX_SHOP_ITEMS + ' items');
        }
        else {
            const shopState = parseStateRef(s.state, 'gameplay.shop.state', hooks);
            const items = [];
            const seen = new Set();
            for (const itemRaw of s.items) {
                if (!isRecord(itemRaw) || !validName(itemRaw.id, 24)) {
                    fail('gameplay.shop.items entries need a kebab id');
                    continue;
                }
                if (seen.has(itemRaw.id)) {
                    fail('gameplay.shop: duplicate item id ' + JSON.stringify(itemRaw.id));
                    continue;
                }
                seen.add(itemRaw.id);
                const iExtra = unknownKeys(itemRaw, KNOWN_SHOP_ITEM);
                if (iExtra.length > 0)
                    fail('gameplay.shop.' + itemRaw.id + ': unknown field(s) ' + iExtra.map(k => JSON.stringify(k)).join(', '));
                if (typeof itemRaw.label !== 'string' || itemRaw.label.trim() === '' || itemRaw.label.length > 80) {
                    fail('gameplay.shop.' + itemRaw.id + '.label must be a non-empty string of at most 80 chars');
                    continue;
                }
                if (!intIn(itemRaw.price, 1, 1_000_000)) {
                    fail('gameplay.shop.' + itemRaw.id + '.price must be an integer in [1, 1000000]');
                    continue;
                }
                if (!validName(itemRaw.currency, 24)) {
                    fail('gameplay.shop.' + itemRaw.id + '.currency must be a kebab id');
                    continue;
                }
                const item = {
                    id: itemRaw.id,
                    label: itemRaw.label.trim(),
                    price: itemRaw.price,
                    currency: itemRaw.currency,
                };
                if (itemRaw.image !== undefined) {
                    if (typeof itemRaw.image !== 'string' || itemRaw.image.includes('..') || itemRaw.image.includes('\\') || itemRaw.image.startsWith('/')) {
                        fail('gameplay.shop.' + itemRaw.id + '.image must be a safe manifest-relative frame path');
                    }
                    else
                        item.image = itemRaw.image;
                }
                const effects = parseEffects(itemRaw.effects, 'gameplay.shop.' + itemRaw.id + '.effects', stats, hooks);
                if (effects !== undefined)
                    item.effects = effects;
                if (itemRaw.lottery !== undefined) {
                    const l = itemRaw.lottery;
                    if (!isRecord(l) || !Array.isArray(l.tiers) || l.tiers.length === 0 || l.tiers.length > MAX_LOTTERY_TIERS) {
                        fail('gameplay.shop.' + itemRaw.id + '.lottery needs 1..' + MAX_LOTTERY_TIERS + ' tiers');
                    }
                    else {
                        const lExtra = unknownKeys(l, KNOWN_LOTTERY);
                        if (lExtra.length > 0)
                            fail('gameplay.shop.' + itemRaw.id + '.lottery: unknown field(s) ' + lExtra.map(k => JSON.stringify(k)).join(', '));
                        if (l.currency !== undefined && !validName(l.currency, 24))
                            fail('gameplay.shop.' + itemRaw.id + '.lottery.currency must be a kebab id');
                        let tierSum = 0;
                        const tiers = [];
                        for (const tierRaw of l.tiers) {
                            if (!isRecord(tierRaw) || !numIn(tierRaw.probability, 0, 1) || tierRaw.probability === 0
                                || !intIn(tierRaw.prize, 0, 1_000_000_000)) {
                                fail('gameplay.shop.' + itemRaw.id + '.lottery.tiers entries need probability (0,1] and prize 0..1e9');
                                continue;
                            }
                            tierSum += tierRaw.probability;
                            const tier = {
                                probability: tierRaw.probability,
                                prize: tierRaw.prize,
                            };
                            if (tierRaw.currency !== undefined) {
                                if (!validName(tierRaw.currency, 24))
                                    fail('gameplay.shop.' + itemRaw.id + '.lottery tier currency must be a kebab id');
                                else
                                    tier.currency = tierRaw.currency;
                            }
                            tiers.push(tier);
                        }
                        if (tierSum > 1 + 1e-9)
                            fail('gameplay.shop.' + itemRaw.id + '.lottery tier probabilities must sum to at most 1');
                        if (tiers.length > 0) {
                            const lotteryEffects = parseEffects(l.effects, 'gameplay.shop.' + itemRaw.id + '.lottery.effects', stats, hooks);
                            item.lottery = {
                                tiers,
                                ...(lotteryEffects === undefined ? {} : { effects: lotteryEffects }),
                                ...(validName(l.currency, 24) ? { currency: l.currency } : {}),
                            };
                        }
                    }
                }
                if (item.effects === undefined && item.lottery === undefined) {
                    fail('gameplay.shop.' + itemRaw.id + ' needs effects or a lottery');
                    continue;
                }
                items.push(item);
            }
            if (items.length > 0)
                block.shop = { ...(shopState === undefined ? {} : { state: shopState }), items };
        }
    }
    // --- drag state ---
    if (raw.dragState !== undefined) {
        const state = parseStateRef(raw.dragState, 'gameplay.dragState', hooks);
        if (state !== undefined)
            block.dragState = state;
    }
    if (raw.dragEndState !== undefined) {
        const state = parseStateRef(raw.dragEndState, 'gameplay.dragEndState', hooks);
        if (state !== undefined)
            block.dragEndState = state;
    }
    return failed ? undefined : block;
}
/**
 * One declared extra mode, by OWN key only. A plain `modes[id]` lookup also
 * answers for Object.prototype members ('constructor', 'toString', …), which
 * would let a crafted mode id pass the "is it declared?" test.
 */
function declaredModeOf(manifest, mode) {
    const modes = manifest.modes;
    if (modes === undefined || !Object.prototype.hasOwnProperty.call(modes, mode))
        return undefined;
    return modes[mode];
}
/** Every mode the menu offers, in manifest order (sleep first, then extras). */
export function declaredModes(manifest) {
    return [
        ...(manifest.sleep === undefined ? [] : ['sleep']),
        ...Object.keys(manifest.modes ?? {}),
    ];
}
/**
 * The frames2d track one active mode holds. 'work' is owned by the work loop
 * (its state, result and fallback are its own), so it resolves to undefined.
 */
export function modeStateOf(manifest, mode) {
    if (mode === 'sleep')
        return manifest.sleep?.state;
    if (mode === 'work')
        return manifest.work?.state;
    return declaredModeOf(manifest, mode)?.state;
}
/** The restore rule of one active mode, when it declares one. */
export function modeRestoreOf(manifest, mode) {
    if (mode === null)
        return undefined;
    if (mode === 'sleep')
        return manifest.sleep?.restore;
    if (mode === 'work')
        return undefined;
    return declaredModeOf(manifest, mode)?.restore;
}
/** Whether the manifest still declares this gameplay mode id. */
export function isDeclaredMode(manifest, mode) {
    if (mode === 'work')
        return manifest.work !== undefined;
    if (mode === 'sleep')
        return manifest.sleep !== undefined;
    return declaredModeOf(manifest, mode) !== undefined;
}
/** Fresh state for one pet: stats at their initial (default max), no currency. */
export function initialGameplayState(manifest, now) {
    const stats = {};
    for (const [name, def] of Object.entries(manifest.stats ?? {})) {
        stats[name] = def.initial ?? def.max;
    }
    return { stats, currencies: {}, mode: null, settledAt: now };
}
/** Clamp one stat value into [0, max]; currencies into [0, CURRENCY_MAX]. */
export function clampGameplay(state, manifest) {
    for (const [name, def] of Object.entries(manifest.stats ?? {})) {
        const value = state.stats[name];
        if (value === undefined)
            state.stats[name] = def.initial ?? def.max;
        else
            state.stats[name] = Math.min(def.max, Math.max(0, value));
    }
    for (const [name, value] of Object.entries(state.currencies)) {
        state.currencies[name] = Math.min(CURRENCY_MAX, Math.max(0, Math.floor(value)));
    }
}
/**
 * Lazy settle: apply stat decay, passive income and the active mode's restore
 * rule (sleep restores energy, a declared extra mode restores whatever it
 * declares) for the elapsed wall time since the last settle. Mirrors the
 * treats.ts discipline (no host timers; read paths settle). Returns whether
 * anything changed.
 */
export function settleGameplay(state, manifest, now, options) {
    const elapsedMs = now - state.settledAt;
    if (elapsedMs <= 0)
        return false;
    const minutes = elapsedMs / 60_000;
    let changed = false;
    for (const [name, def] of Object.entries(manifest.stats ?? {})) {
        const current = state.stats[name];
        if (current === undefined || current <= 0)
            continue;
        let rate = def.decayPerMinute ?? 0;
        if (state.mode === 'work' && def.workingDecayPerMinute !== undefined)
            rate = def.workingDecayPerMinute;
        if (!options.sessionActive)
            rate += def.idleDecayPerMinute ?? 0;
        if (rate <= 0)
            continue;
        const next = Math.max(0, current - rate * minutes);
        if (next !== current) {
            state.stats[name] = next;
            changed = true;
        }
    }
    if (manifest.passiveIncome !== undefined) {
        const incomeElapsed = elapsedMs + (state.incomeCarryMs ?? 0);
        const interval = manifest.passiveIncome.intervalMs;
        const ticks = Math.floor(incomeElapsed / interval);
        state.incomeCarryMs = incomeElapsed % interval;
        if (ticks > 0) {
            const currency = manifest.passiveIncome.currency;
            state.currencies[currency] = (state.currencies[currency] ?? 0) + ticks * manifest.passiveIncome.amount;
            changed = true;
        }
    }
    const restore = modeRestoreOf(manifest, state.mode);
    if (restore !== undefined) {
        const restoreElapsed = elapsedMs + (state.restoreCarryMs ?? 0);
        const interval = restore.intervalMs;
        const ticks = Math.floor(restoreElapsed / interval);
        state.restoreCarryMs = restoreElapsed % interval;
        if (ticks > 0) {
            state.stats[restore.stat] = (state.stats[restore.stat] ?? 0) + ticks * restore.amount;
            changed = true;
        }
    }
    else {
        state.restoreCarryMs = 0;
    }
    state.settledAt = now;
    clampGameplay(state, manifest);
    return changed;
}
/** Apply one effect vector (touch/work/shop), clamped. */
export function applyGameplayEffects(state, manifest, effects) {
    for (const effect of effects) {
        if (effect.stat !== undefined) {
            state.stats[effect.stat] = (state.stats[effect.stat] ?? 0) + effect.amount;
        }
        else if (effect.currency !== undefined) {
            state.currencies[effect.currency] = (state.currencies[effect.currency] ?? 0) + effect.amount;
        }
    }
    clampGameplay(state, manifest);
}
/** Roll one touch zone branch; undefined when the roll lands in no-op mass. */
export function rollTouchBranch(zone, rng) {
    const roll = rng();
    let acc = 0;
    for (const branch of zone.branches) {
        acc += branch.probability;
        if (roll < acc)
            return branch;
    }
    return undefined;
}
/** Roll one work tick outcome. */
export function rollWorkOutcome(work, rng) {
    return rng() < work.successProbability ? 'success' : 'fail';
}
/** Draw one lottery prize tier; uncovered mass falls through to the last tier. */
export function drawLotteryTier(lottery, rng) {
    const roll = rng();
    let acc = 0;
    for (const tier of lottery.tiers) {
        acc += tier.probability;
        if (roll < acc)
            return tier;
    }
    return lottery.tiers[lottery.tiers.length - 1];
}
/** The zone one normalized hit-box point lands in, if any. */
export function touchZoneAt(touch, yFraction) {
    return touch.zones.find(zone => yFraction >= zone.y0 && yFraction < zone.y1);
}
