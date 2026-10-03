window.__ModuleLoader__.load({id:"dsh-pet-copilot",factory:function(require){var module={exports:{}};var exports=module.exports;
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client/index.ts
var index_exports = {};
__export(index_exports, {
  apply: () => apply,
  inject: () => inject
});
module.exports = __toCommonJS(index_exports);
var import_react10 = require("react");
var import_client = require("react-dom/client");

// src/client/pet-store.ts
var import_dsh_client_store = require("@deepseek-ai/dsh-client-store");
function createPetStore() {
  return (0, import_dsh_client_store.defineStore)({
    init: () => ({
      desktopActive: false,
      snapshot: null,
      pets: [],
      state: "loading",
      error: null,
      feedback: null
    }),
    actions: {
      setDesktopActive: (draft, active) => {
        draft.desktopActive = active;
      },
      setSnapshot: (draft, snapshot) => {
        if (draft.state === "ready" && draft.error === null && sameSnapshot(draft.snapshot, snapshot)) return;
        draft.snapshot = snapshot;
        draft.state = "ready";
        draft.error = null;
      },
      setPets: (draft, pets) => {
        draft.pets = pets;
      },
      setState: (draft, state, error) => {
        draft.state = state;
        draft.error = error;
      },
      setFeedback: (draft, feedback) => {
        draft.feedback = feedback;
      },
      setGameplayView: (draft, view) => {
        if (draft.snapshot !== null) draft.snapshot = { ...draft.snapshot, gameplay: view };
      }
    }
  });
}
function sameSnapshot(previous, next) {
  return previous !== null && JSON.stringify(previous) === JSON.stringify(next);
}

// src/client/work-tick-gate.ts
var DEFAULT_WORK_TICK_MS = 1e4;
var MIN_WORK_TICK_MS = 1e3;
var MAX_WORK_TICK_MS = 6e4;
function workTickWindowMs(tickMs) {
  if (typeof tickMs !== "number" || !Number.isFinite(tickMs)) return DEFAULT_WORK_TICK_MS;
  return Math.min(MAX_WORK_TICK_MS, Math.max(MIN_WORK_TICK_MS, tickMs));
}
function createWorkTickGate(now = Date.now) {
  let lastAdjudicatedAt = 0;
  return {
    allow: (tickMs) => {
      const at = now();
      if (at - lastAdjudicatedAt < workTickWindowMs(tickMs)) return false;
      lastAdjudicatedAt = at;
      return true;
    },
    reset: () => {
      lastAdjudicatedAt = 0;
    }
  };
}

// src/client/PetGroupEntry.tsx
var import_react7 = require("react");

// src/client/PetDockEntry.tsx
var import_react6 = require("react");

// src/animation.ts
var DEFAULT_ANIMATION_FPS = 12;
function optionalFps(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 1 ? value : 0;
}
var DEFAULT_TICK_SLOPE = 1 / 6;
var DEFAULT_TICK_INTERCEPT = 6;
var MIN_TICK_SLOPE = 1e-4;
var MAX_TICK_SLOPE = 60;
var MIN_TICK_INTERCEPT = -60;
var MAX_TICK_INTERCEPT = 60;
function tickSlope(value) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(MAX_TICK_SLOPE, Math.max(MIN_TICK_SLOPE, value)) : DEFAULT_TICK_SLOPE;
}
function tickIntercept(value) {
  return typeof value === "number" && Number.isFinite(value) ? Math.min(MAX_TICK_INTERCEPT, Math.max(MIN_TICK_INTERCEPT, value)) : DEFAULT_TICK_INTERCEPT;
}
function animationMode(value) {
  return value === "native" || value === "tick" ? value : "fixed";
}
function animationFps(value) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(1, value) : DEFAULT_ANIMATION_FPS;
}
function tickFps(tokensPerSecond, slope = DEFAULT_TICK_SLOPE, intercept = DEFAULT_TICK_INTERCEPT) {
  const rate = Number.isFinite(tokensPerSecond) ? Math.max(0, tokensPerSecond) : 0;
  return Math.min(Number.MAX_VALUE, Math.max(1, tickSlope(slope) * rate + tickIntercept(intercept)));
}
function effectiveFps(display, rate) {
  if (display.animationMode === "native") return void 0;
  const fps = display.animationMode === "tick" && rate !== void 0 ? tickFps(rate, display.animationTickSlope, display.animationTickIntercept) : animationFps(display.animationFps);
  const limit = optionalFps(display.animationRunFpsLimit);
  return limit > 0 ? Math.min(limit, fps) : fps;
}
function playbackFrameDuration(track, nativeMs, runFps, runLimit = 0, actionFps = 0) {
  if (track === "running-right" || track === "running-left") {
    const duration = runFps === void 0 ? nativeMs : 1e3 / animationFps(runFps);
    const limit = optionalFps(runLimit);
    return limit > 0 ? Math.max(duration, 1e3 / limit) : duration;
  }
  const fps = optionalFps(actionFps);
  return fps > 0 ? 1e3 / fps : nativeMs;
}
function retimeTracks(tracks, fps, runLimit = 0, actionFps = 0) {
  let changed = false;
  const result = Object.fromEntries(Object.entries(tracks).map(([key, track]) => {
    const durations = track.durations.map((ms) => playbackFrameDuration(key, ms, fps, runLimit, actionFps));
    if (durations.every((ms, i) => ms === track.durations[i])) return [key, track];
    changed = true;
    return [key, { ...track, durations }];
  }));
  return changed ? result : tracks;
}

// src/animation-bindings.ts
function sessionMotionPet(petId) {
  return ["whale-girl-refined", "miku", "blue-whale-business"].includes(petId);
}

// src/client/blink-frequency.ts
function createBlinkFilter(petId, columns = 8) {
  if (columns === 32) return (_animation, column) => column;
  const smooth = columns === 16;
  const openFrames = petId === "whale-girl-refined" ? smooth ? { idle: { 6: 5, 7: 5, 8: 10, 9: 10 }, running: { 4: 3, 5: 3, 6: 10, 7: 10, 8: 10, 9: 10 } } : { idle: { 1: 0, 3: 2 }, running: { 1: 0, 4: 3 }, review: { 3: 2 } } : {};
  let active;
  let count = 0;
  let keep = true;
  return (animation, column) => {
    const open = openFrames[animation]?.[column];
    if (open === void 0) {
      active = void 0;
      return column;
    }
    const key = animation + ":" + (smooth ? "blink" : column);
    if (active !== key) {
      active = key;
      keep = ++count % 2 === 1;
    }
    return keep ? column : open;
  };
}

// desktop/pet-layout.js
var SECONDARY_SCALE = 0.62 * 0.85;
function petRenderSize(petId, size) {
  return size * (petId === "blue-whale-business" ? 0.75 : 1);
}

// src/session-colors.ts
var PET_PALETTES = ["ds", "gpt", "claude", "kimi", "glm"];

// src/client/palette.ts
function paletteAtlas(atlas, petId, color) {
  if (!["whale-girl-refined", "blue-whale-business"].includes(petId) || !color || !PET_PALETTES.includes(color.palette)) return atlas;
  return atlas.slice(0, atlas.lastIndexOf("/") + 1) + "palettes/" + color.palette + ".png";
}
function paletteFrames2d(block, petId, color) {
  if (petId !== "miku" || block.tracks["running-right"] === void 0 || block.tracks["running-left"] === void 0 || !color || color.palette === "ds" || !PET_PALETTES.includes(color.palette)) return block;
  const recolor = (url) => {
    const marker = "/" + encodeURIComponent(petId) + "/";
    const index = url.indexOf(marker);
    if (index < 0) return url;
    const split = index + marker.length;
    return url.slice(0, split) + "palettes/" + color.palette + "/" + url.slice(split);
  };
  return { ...block, tracks: Object.fromEntries(Object.entries(block.tracks).map(([name, track]) => [name, {
    ...track,
    frames: track.frames.map(recolor)
  }])) };
}
function paletteFilter(color) {
  return color?.palette === "ds" && Number.isInteger(color.hue) && color.hue >= 0 && color.hue < 360 ? `hue-rotate(${color.hue}deg)` : void 0;
}

// src/client/companion-registration.ts
var companionRegistration = { "whale-girl-refined": { "idle": [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 1], [0, 0], [0, 1], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], "running-right": [[0, 0], [0, 0], [0, 0], [0, 3], [0, 0], [0, 3], [0, 0], [-1, 1], [0, 0], [0, 2], [0, 0], [-1, 0], [0, 0], [-2, 0], [0, 0], [-1, -1]], "running-left": [[0, 0], [0, 0], [0, 0], [-1, 3], [0, 0], [-1, 3], [0, 0], [-1, 1], [0, 0], [-1, 2], [0, 0], [-1, 0], [0, 0], [-2, 0], [0, 0], [-1, -1]], "waving": [[0, 0], [0, 0], [0, -1], [0, 0], [1, -1], [0, 0], [0, 0], [0, 0], [-1, -1], [0, 0], [0, -1], [0, 0], [0, -1], [0, 0], [0, -1], [0, 0], [-1, -3], [0, 0], [0, -2], [0, 0], [1, -1], [0, 0], [0, -1], [0, 0], [2, -1], [0, 0], [-1, -1], [0, 0]], "jumping": [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], "failed": [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], "waiting": [[0, 0], [0, 0], [-2, 2], [0, 0], [-1, 1], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], "running": [[0, 0], [0, 0], [0, 0], [0, 0], [-1, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], "review": [[0, 0], [0, 0], [0, 1], [0, 0], [1, 1], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]] }, "blue-whale-business": { "idle": [[0, 0], [0, 0], [0, 1], [0, 0], [0, -1], [0, 0], [-1, -1], [0, 0]], "running-right": [[0, 0], [1, -6], [4, -6], [-1, 0], [-1, -2], [0, -2], [2, -3], [-2, -2]], "running-left": [[0, 0], [-1, -6], [-3, -6], [1, 0], [1, -2], [0, -2], [-2, -3], [2, -2]], "waving": [[0, 0], [0, 0], [1, -1], [0, 0], [2, 0], [0, 0], [1, 0], [0, 0]], "jumping": [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], "failed": [[0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0], [0, 0]], "waiting": [[0, 0], [0, 0], [-1, -1], [0, 0], [-2, -2], [0, 0], [0, -2], [0, 0]], "running": [[0, 0], [0, 0], [2, 1], [0, 0], [4, -1], [0, 0], [-1, -1], [0, 0]], "review": [[0, 0], [0, 0], [-1, -2], [0, 0], [2, -2], [0, 0], [1, -1], [0, 0]] } };

// src/client/whale-stability.ts
var tops = {
  idle: [15, 15, 16, 15, 14, 19, 18, 16, 20, 18, 18, 18, 19, 20, 18, 20],
  "running-right": [6, 6, 6, 5, 6, 6, 6, 6],
  "running-left": [6, 6, 6, 5, 6, 6, 6, 6],
  waving: [10, 10, 11, 9, 14, 14, 12, 13, 16, 13, 13, 14, 13, 13],
  jumping: [32, 31, 34, 38, 39, 37, 32, 35, 41, 41, 38, 34, 32, 31, 32, 32],
  failed: [29, 30, 36, 38, 43, 48, 51, 57, 51, 48, 43, 38, 36, 30, 29, 29],
  waiting: [19, 14, 14, 13, 10, 10, 12, 10, 10, 20, 15, 14, 15, 20, 13, 19],
  running: [22, 20, 20, 20, 25, 24, 24, 24, 26, 26, 26, 26, 20, 20, 20, 22],
  review: [12, 10, 9, 11, 20, 18, 15, 18, 20, 11, 9, 10, 12, 10, 9, 10]
};
function whaleFramePose(animation, column, columns = 16) {
  if (columns === 32) return companionFramePose("whale-girl-refined", animation, column);
  const geometry = tops;
  const top = geometry[animation][column] ?? geometry[animation][0];
  const locomotion = animation === "running-left" || animation === "running-right";
  const planted = !locomotion && animation !== "jumping";
  const pivotY = planted ? 166 : 202;
  const scale = animation === "failed" || animation === "jumping" ? 1 : locomotion ? (202 - 15) / (201 - top) : (pivotY - 15) / (pivotY - top);
  return { planted, scale, pivotY, offsetX: 0, offsetY: locomotion ? scale : 0 };
}
function companionFramePose(petId, animation, column) {
  const [offsetX = 0, offsetY = 0] = companionRegistration[petId]?.[animation]?.[column] ?? [];
  return { planted: false, scale: 1, pivotY: 0, offsetX, offsetY };
}

// src/client/PetSprite.tsx
var import_react = require("react");
var import_react_dom = require("react-dom");

// ../github-publish/node_modules/.pnpm/clsx@2.1.1/node_modules/clsx/dist/clsx.mjs
function r(e) {
  var t2, f, n = "";
  if ("string" == typeof e || "number" == typeof e) n += e;
  else if ("object" == typeof e) if (Array.isArray(e)) {
    var o = e.length;
    for (t2 = 0; t2 < o; t2++) e[t2] && (f = r(e[t2])) && (n && (n += " "), n += f);
  } else for (f in e) e[f] && (n && (n += " "), n += f);
  return n;
}
function clsx() {
  for (var e, t2, f = 0, n = "", o = arguments.length; f < o; f++) (e = arguments[f]) && (t2 = r(e)) && (n && (n += " "), n += t2);
  return n;
}
var clsx_default = clsx;

// src/treats.ts
var defaultTreatConfig = {
  turnsPerTreat: 30,
  timeTreatMs: 300 * 6e4,
  maxTreats: 20
};

// src/persist.ts
var DISPLAY_SIZE_MIN = 32;
var DISPLAY_SIZE_MAX = 1024;
var DISPLAY_INSET_MAX = 1e4;
var BUBBLE_SCALE_MIN = 0.5;
var BUBBLE_SCALE_MAX = 2;
var BUBBLE_SCALE_STEP = 0.05;
var BUBBLE_BASE_FONT_PX = 12;
var BUBBLE_BASE_SIZE_PX = 160;
var BUBBLE_FONT_MIN_PX = 10;
var BUBBLE_FONT_MAX_PX = 24;
function bubbleScaleFor(display) {
  const size = Number.isFinite(display.size) ? display.size : BUBBLE_BASE_SIZE_PX;
  const multiplier = typeof display.bubbleScale === "number" && Number.isFinite(display.bubbleScale) ? display.bubbleScale : 1;
  const scaled = size / BUBBLE_BASE_SIZE_PX * multiplier;
  const min = BUBBLE_FONT_MIN_PX / BUBBLE_BASE_FONT_PX;
  const max = BUBBLE_FONT_MAX_PX / BUBBLE_BASE_FONT_PX;
  return Math.round(Math.min(max, Math.max(min, scaled)) * 100) / 100;
}

// src/announce.ts
function announcementFresh(announcement, now) {
  return now - announcement.at < announcement.ttlMs;
}

// src/state.ts
function animationForPhase(phase) {
  switch (phase) {
    case "thinking":
      return "running";
    case "tool":
      return "running-right";
    case "review":
      return "review";
    case "waiting":
      return "waiting";
    case "done":
      return "jumping";
    case "failed":
      return "failed";
    case "idle":
      return "idle";
  }
}
function rowOf(animation) {
  const rows = {
    "idle": 0,
    "running-right": 1,
    "running-left": 2,
    "waving": 3,
    "jumping": 4,
    "failed": 5,
    "waiting": 6,
    "running": 7,
    "review": 8
  };
  return rows[animation];
}

// src/client/spritesheet.ts
function rowOfTrack(animation) {
  return rowOf(animation);
}
function framePosition(cell, row, col, scale = 1) {
  return { x: -col * cell.width * scale, y: -row * cell.height * scale };
}
function trimTrack(track, frameCount) {
  const n = Math.max(1, Math.min(frameCount, track.frames.length, track.durations.length));
  return {
    frames: track.frames.slice(0, n),
    durations: track.durations.slice(0, n),
    loop: track.loop,
    ...track.fallback === void 0 ? {} : { fallback: track.fallback }
  };
}

// src/client/sequences.ts
function createSequenceTimeline(sequence, tracks) {
  const itemDurations = sequence.map((animation) => tracks[animation].durations.reduce((sum, value) => sum + value, 0));
  const sequenceDuration = itemDurations.reduce((sum, value) => sum + value, 0);
  function locate(elapsedMs) {
    let offset = Math.max(0, elapsedMs) % sequenceDuration;
    let itemIndex = 0;
    while (itemIndex < sequence.length - 1 && offset >= itemDurations[itemIndex]) {
      offset -= itemDurations[itemIndex];
      itemIndex += 1;
    }
    const animation = sequence[itemIndex];
    const track = tracks[animation];
    let frameIndex = 0;
    while (frameIndex < track.frames.length - 1 && offset >= track.durations[frameIndex]) {
      offset -= track.durations[frameIndex];
      frameIndex += 1;
    }
    return { animation, frameIndex, remaining: Math.max(1, track.durations[frameIndex] - offset) };
  }
  return {
    frameAt(elapsedMs) {
      const { animation, frameIndex } = locate(elapsedMs);
      return { animation, frameIndex };
    },
    nextFrameIn(elapsedMs) {
      return locate(elapsedMs).remaining;
    }
  };
}

// src/client/pet.module.css
var pet_default = {
  float: "pet_float",
  sprite: "pet_sprite",
  spriteWrap: "pet_spriteWrap",
  bubble: "pet_bubble",
  "pet-bubble-pop": "pet_pet-bubble-pop",
  bubblePet: "pet_bubblePet",
  bubbleFeed: "pet_bubbleFeed",
  bubbleStatus: "pet_bubbleStatus",
  "pet-bubble-in": "pet_pet-bubble-in",
  bubbleWhisper: "pet_bubbleWhisper",
  "pet-whisper-in": "pet_pet-whisper-in",
  bubbleStack: "pet_bubbleStack",
  bubbleAnchor: "pet_bubbleAnchor",
  bubbleMore: "pet_bubbleMore",
  bubbleClickable: "pet_bubbleClickable",
  "pet-panel-in": "pet_pet-panel-in",
  panel: "pet_panel",
  panelAbove: "pet_panelAbove",
  rankRow: "pet_rankRow",
  nameCell: "pet_nameCell",
  statRank: "pet_statRank",
  statTreats: "pet_statTreats",
  statPoints: "pet_statPoints",
  renameRow: "pet_renameRow",
  nameInput: "pet_nameInput",
  actions: "pet_actions",
  action: "pet_action",
  summon: "pet_summon",
  gameplayHud: "pet_gameplayHud",
  gameplayModeChip: "pet_gameplayModeChip",
  gameplayCard: "pet_gameplayCard",
  gameplayBars: "pet_gameplayBars",
  gameplayBarRow: "pet_gameplayBarRow",
  gameplayBarLabel: "pet_gameplayBarLabel",
  gameplayBarTrack: "pet_gameplayBarTrack",
  gameplayBarFill: "pet_gameplayBarFill",
  gameplayActions: "pet_gameplayActions",
  gameplayShopItems: "pet_gameplayShopItems",
  gameplayShopItem: "pet_gameplayShopItem",
  gameplayShopItemImage: "pet_gameplayShopItemImage",
  gameplayShopItemLabel: "pet_gameplayShopItemLabel",
  gameplayShopItemPrice: "pet_gameplayShopItemPrice",
  gameplaySkinItems: "pet_gameplaySkinItems",
  gameplaySkinItem: "pet_gameplaySkinItem",
  gameplaySkinItemActive: "pet_gameplaySkinItemActive",
  gameplayClose: "pet_gameplayClose",
  gameplayFloat: "pet_gameplayFloat",
  "pet-gameplay-float": "pet_pet-gameplay-float",
  bubbleUsage: "pet_bubbleUsage",
  "pet-usage-in": "pet_pet-usage-in",
  bubbleUsageHead: "pet_bubbleUsageHead",
  bubbleUsageTitle: "pet_bubbleUsageTitle",
  bubbleUsageValue: "pet_bubbleUsageValue",
  bubbleUsageNote: "pet_bubbleUsageNote",
  bubbleUsageMeter: "pet_bubbleUsageMeter",
  bubbleUsageMeterFill: "pet_bubbleUsageMeterFill",
  bubbleUsageOk: "pet_bubbleUsageOk",
  bubbleUsageWarn: "pet_bubbleUsageWarn",
  bubbleUsageLow: "pet_bubbleUsageLow"
};

// src/client/PetSprite.tsx
var import_jsx_runtime = require("react/jsx-runtime");
function clampOffset(value, max) {
  return Math.max(0, Math.min(max, value));
}
function StatusOrnament(props) {
  const { decoration, phase } = props;
  const segment = decoration.phases[phase];
  const shown = segment !== void 0 && segment !== "hide";
  const segmentKey = segment !== void 0 && segment !== "hide" ? segment.from + ":" + segment.to : "none";
  const spanRef = (0, import_react.useRef)(null);
  const scale = 18 / decoration.cell.height;
  const frameWidth = Math.round(decoration.cell.width * scale);
  const stripWidth = decoration.columns * frameWidth;
  const durationsKey = decoration.durations.join(",");
  (0, import_react.useEffect)(() => {
    if (segment === void 0 || segment === "hide") return;
    const el = spanRef.current;
    if (el === null) return;
    const position = (index2) => -index2 * frameWidth + "px 0px";
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
    el.style.backgroundPosition = position(segment.from);
    if (reduceMotion || segment.from === segment.to) return;
    let timer = 0;
    let index = segment.from;
    let elapsed = 0;
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const delta = now - last;
      last = now;
      elapsed += delta;
      let duration = decoration.durations[index] ?? 120;
      if (elapsed >= duration) {
        do {
          elapsed -= duration;
          if (index < segment.to) index += 1;
          else if (decoration.loop) index = segment.from;
          duration = decoration.durations[index] ?? 120;
        } while (elapsed >= duration);
        el.style.backgroundPosition = position(index);
      }
      if (!decoration.loop && index === segment.to) return;
      timer = window.setTimeout(tick, Math.max(1, duration - elapsed));
    };
    timer = window.setTimeout(tick, 0);
    return () => window.clearTimeout(timer);
  }, [shown, segmentKey, frameWidth, decoration.loop, durationsKey]);
  if (!shown) return null;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
    "span",
    {
      ref: spanRef,
      "aria-hidden": "true",
      "data-dsh-pet-decoration": decoration.id,
      style: {
        display: "inline-block",
        width: frameWidth,
        height: 18,
        marginRight: 6,
        verticalAlign: "middle",
        flexShrink: 0,
        backgroundImage: "url(" + decoration.entryUrl + ")",
        backgroundSize: stripWidth + "px 18px",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "0px 0px"
      }
    }
  );
}
function UsageAnnouncementBubble(props) {
  const { announcement } = props;
  const tone = announcement.tone === "low" ? pet_default.bubbleUsageLow : announcement.tone === "warn" ? pet_default.bubbleUsageWarn : pet_default.bubbleUsageOk;
  return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      className: clsx_default(pet_default.bubble, pet_default.bubbleUsage, tone),
      role: "status",
      "aria-live": "polite",
      "data-dsh-pet-announcement": announcement.source,
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: pet_default.bubbleUsageHead, children: [
          /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: pet_default.bubbleUsageTitle, children: announcement.title }),
          (announcement.kind === "balance" || announcement.kind === "cost") && announcement.amount !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: pet_default.bubbleUsageValue, children: announcement.amount }),
          announcement.kind === "plan" && announcement.percent !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: pet_default.bubbleUsageValue, children: Math.round(announcement.percent) + "%" })
        ] }),
        announcement.kind === "plan" && announcement.percent !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: pet_default.bubbleUsageMeter, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "span",
          {
            className: pet_default.bubbleUsageMeterFill,
            style: { width: Math.min(100, Math.max(0, announcement.percent)) + "%" }
          }
        ) }),
        announcement.note !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: pet_default.bubbleUsageNote, children: announcement.note })
      ]
    }
  );
}
function PetSprite(props) {
  const { snapshot, definition, display, feedback } = props;
  const spriteRef = (0, import_react.useRef)(null);
  const whaleUpperRef = (0, import_react.useRef)(null);
  const whaleFrameRef = (0, import_react.useRef)(null);
  const whaleLegsRef = (0, import_react.useRef)(null);
  const floatRef = (0, import_react.useRef)(null);
  const panelRef = (0, import_react.useRef)(null);
  const bubbleRef = (0, import_react.useRef)(null);
  const [imageReady, setImageReady] = (0, import_react.useState)(false);
  const [hovered, setHovered] = (0, import_react.useState)(false);
  const [manualPanel, setManualPanel] = (0, import_react.useState)(false);
  const panelOpen = manualPanel || display.hoverPanelEnabled === true && hovered;
  const [stackPeek, setStackPeek] = (0, import_react.useState)(false);
  const [stackPinned, setStackPinned] = (0, import_react.useState)(false);
  const [renaming, setRenaming] = (0, import_react.useState)(false);
  const [panelAbove, setPanelAbove] = (0, import_react.useState)(false);
  const [panelLift, setPanelLift] = (0, import_react.useState)(0);
  const [nameDraft, setNameDraft] = (0, import_react.useState)("");
  const composingRef = (0, import_react.useRef)(false);
  const [dragPos, setDragPos] = (0, import_react.useState)(null);
  const dragRef = (0, import_react.useRef)(null);
  const hideTimerRef = (0, import_react.useRef)(null);
  (0, import_react.useEffect)(() => {
    setHovered(false);
    setManualPanel(false);
    setRenaming(false);
  }, [display.hoverPanelEnabled]);
  const frameRef = (0, import_react.useRef)({
    track: null,
    index: 0,
    elapsed: 0
  });
  const cell = definition.cell;
  const atlasUrl = paletteAtlas(definition.atlasUrl, definition.id, snapshot?.color);
  const columns = definition.columns;
  const rows = definition.rows;
  const stabilizeWhale = props.visual === void 0 && cell.width === 192 && (definition.id === "whale-girl-refined" && (columns === 16 || columns === 32) && cell.height === 208 || definition.id === "blue-whale-business" && columns === 8 && cell.height === 128);
  const phase = snapshot?.phase ?? "idle";
  const baseAnimation = snapshot?.animation ?? "idle";
  const waveKey = !sessionMotionPet(definition.id) ? void 0 : feedback?.kind === "pet" ? "pet:" + feedback.at : snapshot?.waveKey;
  const [wave, setWave] = (0, import_react.useState)();
  const seenWaves = (0, import_react.useRef)(/* @__PURE__ */ new Set());
  const waveBlocked = snapshot?.generation !== void 0 || phase === "failed" || phase === "done";
  (0, import_react.useEffect)(() => {
    const seen = waveKey !== void 0 && seenWaves.current.has(waveKey);
    if (waveKey !== void 0) {
      seenWaves.current.add(waveKey);
      if (seenWaves.current.size > 32) seenWaves.current.delete(seenWaves.current.values().next().value);
    }
    if (waveKey === void 0 || waveBlocked || seen) {
      setWave(void 0);
      return;
    }
    setWave(waveKey);
    const duration = definition.tracks.waving.durations.reduce((a, b) => a + playbackFrameDuration("waving", b, void 0, 0, display.animationActionFps), 0);
    const timer = window.setTimeout(() => setWave(void 0), duration);
    return () => window.clearTimeout(timer);
  }, [waveKey, waveBlocked, definition.tracks.waving, display.animationActionFps]);
  const animation = wave !== void 0 && wave === waveKey && !waveBlocked ? "waving" : baseAnimation;
  const sequences = definition.sequences;
  const selectedSequence = animation === animationForPhase(phase) ? sequences?.[phase] : void 0;
  const fps = effectiveFps(display, snapshot?.performance?.tokensPerSecond);
  const tracks = (0, import_react.useMemo)(
    () => retimeTracks(definition.tracks, fps, display.animationRunFpsLimit, display.animationActionFps),
    [definition.tracks, fps, display.animationRunFpsLimit, display.animationActionFps]
  );
  const panel = definition.panel;
  const panelLabel = (slot, i18n) => panel?.labels?.[slot] ?? i18n;
  const panelStat = (slot, i18nKey, values) => {
    const format = panel?.stats?.[slot] ?? props.t(i18nKey, values);
    if (panel?.stats?.[slot] === void 0) return format;
    const all = {
      rank: snapshot?.affinity.rank ?? "?",
      n: snapshot?.treats.stocked ?? 0,
      points: snapshot?.affinity.points ?? 0
    };
    let text = format;
    for (const [name, value] of Object.entries(all)) text = text.replaceAll("{" + name + "}", String(value));
    return text;
  };
  const panelShows = (action) => panel?.actions === void 0 || panel.actions.includes(action);
  (0, import_react.useEffect)(() => {
    if (props.visual !== void 0) return;
    setImageReady(false);
    let cancelled = false;
    let retryTimer;
    let attempt = 0;
    const maxAttempts = 3;
    let activeImg = null;
    const loadAtlas = () => {
      const img = new Image();
      activeImg = img;
      img.onload = () => {
        if (!cancelled) setImageReady(true);
      };
      img.onerror = () => {
        if (cancelled) return;
        if (attempt < maxAttempts) {
          attempt += 1;
          const delay = Math.min(1e3 * Math.pow(2, attempt - 1), 8e3);
          retryTimer = setTimeout(loadAtlas, delay);
        }
      };
      img.src = atlasUrl;
    };
    loadAtlas();
    return () => {
      cancelled = true;
      if (retryTimer !== void 0) clearTimeout(retryTimer);
      if (activeImg !== null) {
        activeImg.onload = null;
        activeImg.onerror = null;
      }
    };
  }, [atlasUrl, props.visual]);
  const spriteScale = petRenderSize(definition.id, display.size) / cell.height;
  const scaleRef = (0, import_react.useRef)(spriteScale);
  scaleRef.current = spriteScale;
  const blinkFrame = (0, import_react.useMemo)(() => createBlinkFilter(definition.id, columns), [definition.id, columns]);
  (0, import_react.useEffect)(() => {
    if (props.visual !== void 0) return;
    const reduceMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
    const sequence = animation === animationForPhase(phase) ? sequences?.[phase] : void 0;
    const timeline = sequence === void 0 ? void 0 : createSequenceTimeline(sequence, tracks);
    const sequenceItems = sequence === void 0 ? void 0 : new Map(
      sequence.map((itemAnimation) => {
        const itemRow = rowOfTrack(itemAnimation);
        return [itemAnimation, {
          row: itemRow,
          track: trimTrack(tracks[itemAnimation], rows[itemRow] ?? tracks[itemAnimation].frames.length)
        }];
      })
    );
    const leadAnimation = sequence?.[0] ?? animation;
    const row = rowOfTrack(leadAnimation);
    const track = trimTrack(tracks[leadAnimation], rows[row] ?? tracks[leadAnimation].frames.length);
    if (frameRef.current.track !== leadAnimation) frameRef.current = { track: leadAnimation, index: 0, elapsed: 0 };
    frameRef.current.index = Math.min(frameRef.current.index, track.frames.length - 1);
    const leadCol = blinkFrame(leadAnimation, track.frames[frameRef.current.index]);
    const lead = framePosition(cell, row, leadCol, scaleRef.current);
    let lastPosStr = lead.x + "px " + lead.y + "px";
    const paint = (pos2, action, column) => {
      if (spriteRef.current !== null) spriteRef.current.style.backgroundPosition = pos2;
      const upper = whaleUpperRef.current, frame = whaleFrameRef.current, legs = whaleLegsRef.current;
      if (!stabilizeWhale || !upper || !frame || !legs) return;
      const pose = definition.id === "whale-girl-refined" ? whaleFramePose(action, column, columns) : companionFramePose(definition.id, action, column);
      frame.style.backgroundPosition = pos2;
      frame.style.transformOrigin = `${84 / 192 * 100}% ${pose.pivotY / 208 * 100}%`;
      frame.style.transform = `translate(${Math.round(pose.offsetX * scaleRef.current)}px, ${Math.round(pose.offsetY * scaleRef.current)}px) scale(${pose.scale})`;
      upper.style.clipPath = pose.planted ? `polygon(0 0,100% 0,100% 100%,${109 / 192 * 100}% 100%,${109 / 192 * 100}% ${170 / 208 * 100}%,${59 / 192 * 100}% ${170 / 208 * 100}%,${59 / 192 * 100}% 100%,0 100%)` : "none";
      legs.style.display = pose.planted ? "block" : "none";
      frame.dataset.track = action;
      frame.dataset.column = String(column);
    };
    paint(lastPosStr, leadAnimation, leadCol);
    if (reduceMotion) return;
    let raf = 0;
    let frameTimer;
    let last = performance.now();
    let sequenceElapsed = 0;
    const schedule = (remaining) => {
      if (frameTimer !== void 0) clearTimeout(frameTimer);
      if (remaining <= 32) {
        raf = requestAnimationFrame(tick);
        return;
      }
      frameTimer = setTimeout(() => {
        raf = requestAnimationFrame(tick);
      }, remaining);
    };
    const tick = (ts) => {
      const delta = Math.min(1e4, Math.max(0, ts - last));
      last = ts;
      if (timeline !== void 0 && sequenceItems !== void 0) {
        sequenceElapsed += delta;
        const current = timeline.frameAt(sequenceElapsed);
        const item = sequenceItems.get(current.animation);
        const col2 = blinkFrame(current.animation, item.track.frames[current.frameIndex]);
        const pos3 = framePosition(cell, item.row, col2, scaleRef.current);
        const posStr2 = pos3.x + "px " + pos3.y + "px";
        if (posStr2 !== lastPosStr) {
          lastPosStr = posStr2;
          paint(posStr2, current.animation, col2);
        }
        schedule(timeline.nextFrameIn(sequenceElapsed));
        return;
      }
      const st = frameRef.current;
      if (st.track !== animation) {
        st.track = animation;
        st.index = 0;
        st.elapsed = 0;
      }
      st.elapsed += delta;
      const maxIndex = track.frames.length - 1;
      if (track.loop) st.elapsed %= track.durations.reduce((sum, ms) => sum + ms, 0);
      while (st.elapsed >= (track.durations[st.index] ?? 100)) {
        st.elapsed -= track.durations[st.index] ?? 100;
        if (st.index < maxIndex) st.index += 1;
        else if (track.loop) st.index = 0;
        else {
          st.elapsed = 0;
          break;
        }
      }
      const col = blinkFrame(animation, track.frames[st.index]);
      const pos2 = framePosition(cell, row, col, scaleRef.current);
      const posStr = pos2.x + "px " + pos2.y + "px";
      if (posStr !== lastPosStr) {
        lastPosStr = posStr;
        paint(posStr, animation, col);
      }
      if (track.loop || st.index < maxIndex) schedule(Math.max(1, track.durations[st.index] - st.elapsed));
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      if (frameTimer !== void 0) clearTimeout(frameTimer);
    };
  }, [animation, phase, cell, columns, rows, tracks, sequences, props.visual, blinkFrame, stabilizeWhale, spriteScale, definition.id]);
  const feedbackDoneRef = (0, import_react.useRef)(props.onFeedbackDone);
  feedbackDoneRef.current = props.onFeedbackDone;
  (0, import_react.useEffect)(() => {
    if (feedback === null) return;
    const timer = window.setTimeout(() => feedbackDoneRef.current(), 2600);
    return () => window.clearTimeout(timer);
  }, [feedback]);
  const draggedRef = (0, import_react.useRef)(false);
  const clearHideTimer = () => {
    if (hideTimerRef.current !== null) {
      window.clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  };
  (0, import_react.useEffect)(() => () => clearHideTimer(), []);
  const onPointerDown = (e) => {
    if (props.dragDisabled === true || e.button !== 0 || dragRef.current !== null) return;
    window.dshPetOverlay?.drag("start");
    endWalk(false);
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    const current = dragPos ?? { right: display.right, bottom: display.bottom };
    dragRef.current = {
      pointerId: e.pointerId,
      startX: window.dshPetOverlay ? e.screenX : e.clientX,
      startY: window.dshPetOverlay ? e.screenY : e.clientY,
      ...current
    };
    draggedRef.current = false;
    props.onDraggingChange?.(true);
    setHovered(false);
  };
  const onPointerMove = (e) => {
    const drag = dragRef.current;
    if (drag === null || e.pointerId !== drag.pointerId) return;
    const dx = (window.dshPetOverlay ? e.screenX : e.clientX) - drag.startX;
    const dy = (window.dshPetOverlay ? e.screenY : e.clientY) - drag.startY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
      draggedRef.current = true;
    }
    if (window.dshPetOverlay) {
      window.dshPetOverlay.drag("move");
      return;
    }
    const right = clampOffset(drag.right - dx, window.innerWidth - 40);
    const bottom = clampOffset(drag.bottom - dy, window.innerHeight - 40);
    setDragPos({ right, bottom });
  };
  const onPointerUp = (e) => {
    if (dragRef.current === null) return;
    if (e !== void 0 && e.pointerId !== dragRef.current.pointerId) return;
    dragRef.current = null;
    window.dshPetOverlay?.drag("end");
    props.onDraggingChange?.(false);
    if (draggedRef.current && dragPos !== null) props.onDragEnd(dragPos.right, dragPos.bottom);
  };
  const endDragRef = (0, import_react.useRef)(onPointerUp);
  endDragRef.current = onPointerUp;
  (0, import_react.useEffect)(() => {
    const cancel = () => endDragRef.current();
    window.addEventListener("blur", cancel);
    return () => {
      window.removeEventListener("blur", cancel);
      cancel();
    };
  }, []);
  const pos = dragPos ?? { right: display.right, bottom: display.bottom };
  const spriteWidth = Math.round(cell.width * spriteScale);
  const spriteHeight = Math.round(cell.height * spriteScale);
  const [facingRight, setFacingRight] = (0, import_react.useState)(false);
  const walkRafRef = (0, import_react.useRef)(0);
  const walkTargetRef = (0, import_react.useRef)(null);
  const dragPosRef = (0, import_react.useRef)(dragPos);
  dragPosRef.current = dragPos;
  const endWalk = (persist) => {
    if (walkRafRef.current === 0) return;
    window.cancelAnimationFrame(walkRafRef.current);
    walkRafRef.current = 0;
    setFacingRight(false);
    const settled = walkTargetRef.current;
    walkTargetRef.current = null;
    if (persist && settled !== null) props.onDragEnd(settled.right, settled.bottom);
  };
  (0, import_react.useEffect)(() => {
    const bus = props.bus;
    if (bus === void 0) return void 0;
    bus.walk = (direction, distance, speed) => {
      if (dragRef.current !== null || walkRafRef.current !== 0) return 0;
      const current = dragPosRef.current ?? { right: display.right, bottom: display.bottom };
      const margin = 8;
      const maxRight = Math.max(margin, window.innerWidth - spriteWidth - margin);
      const maxBottom = Math.max(margin, window.innerHeight - spriteHeight - margin);
      const wanted = { ...current };
      if (direction === "left") wanted.right = current.right + distance;
      else if (direction === "right") wanted.right = current.right - distance;
      else if (direction === "up") wanted.bottom = current.bottom + distance;
      else wanted.bottom = current.bottom - distance;
      const target = {
        right: Math.max(margin, clampOffset(wanted.right, maxRight)),
        bottom: Math.max(margin, clampOffset(wanted.bottom, maxBottom))
      };
      const travelled = direction === "left" ? target.right - current.right : direction === "right" ? current.right - target.right : direction === "up" ? target.bottom - current.bottom : current.bottom - target.bottom;
      if (travelled < 1) return 0;
      const duration = Math.max(150, travelled / Math.max(1, speed) * 1e3);
      const startedAt = performance.now();
      setFacingRight(direction === "right");
      walkTargetRef.current = current;
      const step = (now) => {
        const t2 = Math.min(1, (now - startedAt) / duration);
        const next = {
          right: current.right + (target.right - current.right) * t2,
          bottom: current.bottom + (target.bottom - current.bottom) * t2
        };
        walkTargetRef.current = next;
        setDragPos(next);
        if (t2 < 1) {
          walkRafRef.current = window.requestAnimationFrame(step);
          return;
        }
        walkRafRef.current = 0;
        walkTargetRef.current = null;
        setFacingRight(false);
        props.onDragEnd(next.right, next.bottom);
      };
      walkRafRef.current = window.requestAnimationFrame(step);
      return travelled;
    };
    return () => {
      bus.walk = void 0;
      if (walkRafRef.current !== 0) {
        window.cancelAnimationFrame(walkRafRef.current);
        walkRafRef.current = 0;
      }
      setFacingRight(false);
      walkTargetRef.current = null;
    };
  }, [props.bus, definition.id, display.right, display.bottom, spriteWidth]);
  const bubbleScale = bubbleScaleFor(display);
  const allowBubbles = snapshot?.primary !== false;
  const sessionBubbles = allowBubbles ? snapshot?.sessions ?? [] : [];
  const stackOpen = stackPeek || stackPinned;
  const collapsed = !stackOpen && sessionBubbles.length > 1;
  const visibleSessions = collapsed ? sessionBubbles.slice(0, 1) : sessionBubbles;
  const statusBubble = allowBubbles && feedback === null && sessionBubbles.length === 0 ? snapshot?.bubble : void 0;
  const announcement = snapshot?.announcement;
  const usageAnnouncement = allowBubbles && feedback === null && announcement !== void 0 && announcementFresh(announcement, Date.now()) ? announcement : void 0;
  const bubblePresent = allowBubbles && (feedback !== null || sessionBubbles.length > 0 || statusBubble !== void 0 || usageAnnouncement !== void 0);
  const displayName = snapshot?.name ?? definition.displayName;
  const decoration = snapshot?.decoration;
  (0, import_react.useEffect)(() => {
    if (sessionBubbles.length <= 1) setStackPinned(false);
  }, [sessionBubbles.length]);
  (0, import_react.useLayoutEffect)(() => {
    if (!panelOpen) {
      setPanelAbove(false);
      setPanelLift(0);
      return;
    }
    const updatePanelPlacement = () => {
      const sprite = spriteRef.current;
      const panel2 = panelRef.current;
      if (sprite === null || panel2 === null) return;
      const availableBelow = window.innerHeight - sprite.getBoundingClientRect().bottom;
      const above = availableBelow < panel2.getBoundingClientRect().height + 8;
      setPanelAbove(above);
      const bubbleHeight = above ? bubbleRef.current?.getBoundingClientRect().height ?? 0 : 0;
      setPanelLift(bubbleHeight > 0 ? Math.ceil(bubbleHeight) + 14 : 0);
    };
    updatePanelPlacement();
    window.addEventListener("resize", updatePanelPlacement);
    return () => window.removeEventListener("resize", updatePanelPlacement);
  }, [panelOpen, renaming, pos.right, pos.bottom, display.size, bubblePresent, sessionBubbles.length, stackOpen, feedback]);
  const float = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
    "div",
    {
      ref: floatRef,
      className: pet_default.float,
      style: {
        right: pos.right,
        bottom: pos.bottom,
        zIndex: 2147483e3,
        // Read by .bubble / .bubbleStatus in pet.module.css.
        ...{ "--pet-bubble-scale": String(bubbleScale) }
      },
      onPointerEnter: () => {
        clearHideTimer();
        if (display.hoverPanelEnabled === true) setHovered(true);
      },
      onPointerLeave: (e) => {
        const next = e.relatedTarget;
        if (next instanceof Node && floatRef.current?.contains(next)) return;
        if (renaming) return;
        clearHideTimer();
        hideTimerRef.current = window.setTimeout(() => {
          setHovered(false);
          setManualPanel(false);
        }, 300);
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "div",
          {
            className: pet_default.spriteWrap,
            style: { width: spriteWidth, height: spriteHeight },
            children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
              "div",
              {
                ref: spriteRef,
                className: pet_default.sprite,
                "data-dsh-pet-animation": animation,
                style: {
                  width: spriteWidth,
                  height: spriteHeight,
                  position: "relative",
                  ...props.visual === void 0 ? {
                    backgroundImage: imageReady && !stabilizeWhale ? "url(" + atlasUrl + ")" : void 0,
                    backgroundSize: cell.width * columns * spriteScale + "px " + cell.height * (definition.atlasRows ?? rows.length) * spriteScale + "px",
                    backgroundRepeat: "no-repeat",
                    backgroundPosition: "0 0"
                  } : {},
                  cursor: dragRef.current === null ? "grab" : "grabbing",
                  filter: paletteFilter(snapshot?.color),
                  ...facingRight ? { transform: "scaleX(-1)" } : {}
                },
                onPointerDown,
                onPointerMove,
                onPointerUp,
                onPointerCancel: onPointerUp,
                onLostPointerCapture: onPointerUp,
                onContextMenu: (e) => {
                  e.preventDefault();
                  clearHideTimer();
                  setManualPanel((open) => !open);
                },
                onKeyDown: (e) => {
                  if (e.key === "Escape") {
                    setHovered(false);
                    setManualPanel(false);
                  }
                },
                onDoubleClick: () => {
                  if (snapshot?.primary === false && snapshot.sessionId) props.onOpenSession(snapshot.sessionId);
                },
                onClick: (e) => {
                  if (draggedRef.current) return;
                  if (props.onGameplayTap !== void 0 && spriteRef.current !== null) {
                    const rect = spriteRef.current.getBoundingClientRect();
                    if (rect.width > 0 && rect.height > 0) {
                      props.onGameplayTap((e.clientX - rect.left) / rect.width, (e.clientY - rect.top) / rect.height);
                    }
                  }
                  props.onPet();
                },
                role: "button",
                tabIndex: 0,
                "aria-label": definition.displayName,
                children: [
                  stabilizeWhale && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { ref: whaleUpperRef, "aria-hidden": "true", style: { position: "absolute", inset: 0, pointerEvents: "none" }, children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { ref: whaleFrameRef, "data-dsh-pet-registered-frame": "true", style: {
                      position: "absolute",
                      inset: 0,
                      backgroundImage: imageReady ? "url(" + atlasUrl + ")" : void 0,
                      backgroundSize: `${cell.width * columns * spriteScale}px ${cell.height * (definition.atlasRows ?? rows.length) * spriteScale}px`,
                      backgroundRepeat: "no-repeat"
                    } }) }),
                    /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { ref: whaleLegsRef, "data-dsh-pet-planted": "true", "aria-hidden": "true", style: {
                      position: "absolute",
                      inset: 0,
                      pointerEvents: "none",
                      clipPath: `inset(${170 / 208 * 100}% ${83 / 192 * 100}% 0 ${59 / 192 * 100}%)`,
                      backgroundImage: imageReady ? "url(" + atlasUrl + ")" : void 0,
                      backgroundSize: `${cell.width * columns * spriteScale}px ${cell.height * (definition.atlasRows ?? rows.length) * spriteScale}px`,
                      backgroundRepeat: "no-repeat",
                      backgroundPosition: "0 0"
                    } })
                  ] }),
                  props.visual
                ]
              }
            )
          }
        ),
        props.hud,
        allowBubbles && feedback !== null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { ref: bubbleRef, className: clsx_default(pet_default.bubble, feedback.kind === "feed" ? pet_default.bubbleFeed : pet_default.bubblePet), children: feedback.text }, feedback.at),
        feedback === null && (sessionBubbles.length > 0 || statusBubble !== void 0 || usageAnnouncement !== void 0) && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
          "div",
          {
            ref: bubbleRef,
            className: pet_default.bubbleStack,
            onPointerEnter: () => setStackPeek(true),
            onPointerLeave: () => setStackPeek(false),
            children: [
              visibleSessions.map((session, index) => {
                const speaksWhisper = session.whisper !== void 0;
                const bubble = /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                  "button",
                  {
                    type: "button",
                    className: clsx_default(
                      pet_default.bubble,
                      pet_default.bubbleStatus,
                      pet_default.bubbleClickable,
                      speaksWhisper && pet_default.bubbleWhisper
                    ),
                    title: props.t("pet.openSessionHint"),
                    onClick: () => {
                      props.onOpenSession(session.sessionId);
                    },
                    children: [
                      index === 0 && !speaksWhisper && decoration !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusOrnament, { decoration, phase }),
                      session.whisper ?? session.bubble
                    ]
                  },
                  speaksWhisper ? "whisper:" + session.whisper : session.sessionId
                );
                if (index !== 0 || sessionBubbles.length <= 1) return bubble;
                return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", { className: pet_default.bubbleAnchor, children: [
                  bubble,
                  /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                    "button",
                    {
                      type: "button",
                      className: pet_default.bubbleMore,
                      title: stackOpen ? props.t("pet.collapseSessions") : props.t("pet.moreSessions", { n: sessionBubbles.length - 1 }),
                      "aria-label": stackOpen ? props.t("pet.collapseSessions") : props.t("pet.moreSessions", { n: sessionBubbles.length - 1 }),
                      "aria-expanded": stackOpen,
                      onClick: (e) => {
                        e.stopPropagation();
                        setStackPinned((open) => !open);
                      },
                      children: stackOpen ? "\xD7" : "+" + String(sessionBubbles.length - 1)
                    }
                  )
                ] }, "primary");
              }),
              sessionBubbles.length === 0 && statusBubble !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(
                "div",
                {
                  className: clsx_default(pet_default.bubble, pet_default.bubbleStatus),
                  role: "status",
                  "aria-live": "polite",
                  children: [
                    decoration !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(StatusOrnament, { decoration, phase }),
                    statusBubble
                  ]
                },
                "status"
              ),
              usageAnnouncement !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(UsageAnnouncementBubble, { announcement: usageAnnouncement })
            ]
          }
        ),
        panelOpen && dragRef.current === null && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
          "div",
          {
            ref: panelRef,
            "data-pet-care-panel": "true",
            className: clsx_default(pet_default.panel, panelAbove && pet_default.panelAbove),
            "data-placement": panelAbove ? "above" : "below",
            style: panelAbove && panelLift > 0 ? { marginBottom: panelLift } : void 0,
            onPointerEnter: () => {
              clearHideTimer();
            },
            children: renaming ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: pet_default.renameRow, children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "input",
                {
                  className: pet_default.nameInput,
                  value: nameDraft,
                  maxLength: 20,
                  placeholder: props.t("pet.namePlaceholder"),
                  autoFocus: true,
                  onChange: (e) => setNameDraft(e.target.value),
                  onCompositionStart: () => {
                    composingRef.current = true;
                  },
                  onCompositionEnd: () => {
                    composingRef.current = false;
                  },
                  onKeyDown: (e) => {
                    if (composingRef.current || e.nativeEvent.isComposing || e.key === "Process") return;
                    if (e.key === "Enter") {
                      const trimmed = nameDraft.trim();
                      if (trimmed !== "") {
                        props.onRename(trimmed);
                        setRenaming(false);
                      }
                    } else if (e.key === "Escape") {
                      setRenaming(false);
                    }
                  }
                }
              ),
              /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                "button",
                {
                  type: "button",
                  className: pet_default.action,
                  onClick: () => {
                    const trimmed = nameDraft.trim();
                    if (trimmed !== "") {
                      props.onRename(trimmed);
                      setRenaming(false);
                    }
                  },
                  children: panelLabel("confirm", props.t("pet.confirm"))
                }
              )
            ] }) : /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_jsx_runtime.Fragment, { children: [
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: pet_default.rankRow, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: pet_default.nameCell, children: displayName }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: pet_default.statRank, children: (() => {
                  const rawRank = snapshot?.affinity.rank ?? "?";
                  const rankKey = `pet.rank.name.${rawRank}`;
                  const localized = props.t(rankKey);
                  const rankName = localized !== rankKey ? localized : rawRank;
                  return panelStat("rank", "pet.rank", { rank: rankName });
                })() })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: pet_default.rankRow, children: [
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: pet_default.statTreats, children: panelStat("treats", "pet.treats", { n: snapshot?.treats.stocked ?? 0 }) }),
                /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: pet_default.statPoints, children: panelStat("points", "pet.points", { points: snapshot?.affinity.points ?? 0 }) })
              ] }),
              /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { className: pet_default.actions, children: [
                panelShows("feed") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: pet_default.action, onClick: props.onFeed, children: panelLabel("feed", props.t("pet.feed")) }),
                panelShows("rename") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)(
                  "button",
                  {
                    type: "button",
                    className: pet_default.action,
                    onClick: () => {
                      clearHideTimer();
                      setNameDraft(displayName);
                      setRenaming(true);
                    },
                    children: panelLabel("rename", props.t("pet.rename"))
                  }
                ),
                panelShows("hide") && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: pet_default.action, onClick: props.onHide, children: panelLabel("hide", props.t("pet.hide")) }),
                props.onGameplayMenu !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", { type: "button", className: pet_default.action, onClick: props.onGameplayMenu, children: props.t("pet.gameplay.menu") })
              ] })
            ] })
          }
        )
      ]
    }
  );
  return (0, import_react_dom.createPortal)(float, props.portalTarget ?? document.body);
}

// src/client/renderers/PetRendererSwitch.tsx
var import_react4 = require("react");

// src/client/drag-stream.ts
function createDragStream() {
  let current = false;
  const listeners = /* @__PURE__ */ new Set();
  return {
    get: () => current,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    push(dragging) {
      if (dragging === current) return;
      current = dragging;
      for (const listener of [...listeners]) listener(dragging);
    }
  };
}

// src/client/renderers/registry.ts
var RendererRegistry = class {
  renderers = /* @__PURE__ */ new Map();
  /** Register one renderer implementation (id wins on re-register). */
  register(renderer) {
    this.renderers.set(renderer.id, renderer);
  }
  /** Whether a renderer kind is available in this build. */
  has(id) {
    return this.renderers.has(id);
  }
  /** The registered renderer kinds (for diagnostics). */
  kinds() {
    return [...this.renderers.keys()].sort();
  }
  /** Remove every registration (tests; the client index registers once). */
  clear() {
    this.renderers.clear();
  }
  /**
   * Mount a renderer for one activation. An unknown kind renders a clear
   * diagnostic card into the container instead of failing silently.
   */
  mount(kind, ctx, config) {
    const renderer = this.renderers.get(kind);
    if (renderer === void 0) {
      const note = document.createElement("div");
      note.dataset.dshPetRendererFallback = kind;
      note.textContent = 'Pet renderer "' + kind + '" is not available in this build (supported: ' + this.kinds().join(", ") + ").";
      ctx.container.appendChild(note);
      ctx.onCleanup(() => note.remove());
      return { dispose: () => note.remove() };
    }
    return renderer.mount(ctx, renderer.validateConfig(config));
  }
};
var defaultPetRendererRegistry = new RendererRegistry();

// src/client/renderers/live2d/Live2dVisualMount.tsx
var import_react2 = require("react");

// src/client/phase-stream.ts
function createPhaseStream(initial = "idle") {
  let current = initial;
  const listeners = /* @__PURE__ */ new Set();
  return {
    get: () => current,
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    push(phase) {
      if (phase === current) return;
      current = phase;
      for (const listener of [...listeners]) listener(phase);
    }
  };
}

// src/client/renderers/live2d/Live2dVisualMount.tsx
var import_jsx_runtime2 = require("react/jsx-runtime");
function Live2dVisualMount(props) {
  const containerRef = (0, import_react2.useRef)(null);
  const streamRef = (0, import_react2.useRef)(null);
  const handleRef = (0, import_react2.useRef)(null);
  const downRef = (0, import_react2.useRef)(null);
  const [error, setError] = (0, import_react2.useState)(null);
  (0, import_react2.useEffect)(() => {
    setError(null);
    const container = containerRef.current;
    const live2d = props.definition.live2d;
    if (container === null || live2d === void 0) return void 0;
    streamRef.current ??= createPhaseStream(props.phase);
    const cleanups = [];
    const ctx = {
      petId: props.definition.id,
      assetBase: "/pet/" + encodeURIComponent(props.definition.id),
      container,
      phase: streamRef.current,
      interact: props.onPet,
      onCleanup: (fn) => {
        cleanups.push(fn);
      }
    };
    let handle;
    try {
      handle = defaultPetRendererRegistry.mount("live2d", ctx, live2d);
    } catch {
      setError("load-failed");
      return () => {
        for (const fn of cleanups.splice(0)) fn();
      };
    }
    handleRef.current = handle;
    handle.onError?.(setError);
    return () => {
      handleRef.current = null;
      for (const fn of cleanups.splice(0)) fn();
      handle.dispose();
    };
  }, [props.definition]);
  (0, import_react2.useEffect)(() => {
    streamRef.current?.push(props.phase);
  }, [props.phase]);
  return /* @__PURE__ */ (0, import_jsx_runtime2.jsx)(
    "div",
    {
      ref: containerRef,
      "data-dsh-pet-live2d": props.definition.id,
      style: { width: "100%", height: "100%" },
      onPointerDown: (e) => {
        downRef.current = { x: e.clientX, y: e.clientY };
      },
      onPointerUp: (e) => {
        const down = downRef.current;
        downRef.current = null;
        if (down === null) return;
        if (Math.abs(e.clientX - down.x) > 4 || Math.abs(e.clientY - down.y) > 4) return;
        const rect = e.currentTarget.getBoundingClientRect();
        handleRef.current?.tap(e.clientX - rect.left, e.clientY - rect.top);
      },
      children: error !== null && /* @__PURE__ */ (0, import_jsx_runtime2.jsx)("span", { "data-dsh-pet-live2d-error": error, children: error === "core-missing" ? props.t("pet.live2d.core-missing") : error === "vendor-missing" ? props.t("pet.live2d.vendor-missing") : props.t("pet.live2d.load-failed") })
    }
  );
}

// src/client/renderers/Frames2dVisualMount.tsx
var import_react3 = require("react");
var import_jsx_runtime3 = require("react/jsx-runtime");
function Frames2dVisualMount(props) {
  const containerRef = (0, import_react3.useRef)(null);
  const streamRef = (0, import_react3.useRef)(null);
  const handleRef = (0, import_react3.useRef)(null);
  const [invalid, setInvalid] = (0, import_react3.useState)(false);
  const palette = props.snapshot?.color?.palette;
  const frames2d = (0, import_react3.useMemo)(
    () => props.definition.frames2d === void 0 ? void 0 : { ...paletteFrames2d(props.definition.frames2d, props.definition.id, props.snapshot?.color), frameDensity: props.definition.frameDensity },
    [props.definition, palette]
  );
  const hasSessionMotion = sessionMotionPet(props.definition.id) && frames2d?.tracks["running-right"] !== void 0 && frames2d.tracks["running-left"] !== void 0;
  (0, import_react3.useEffect)(() => {
    setInvalid(false);
    const container = containerRef.current;
    if (container === null || frames2d === void 0) return void 0;
    streamRef.current ??= createPhaseStream(props.phase);
    const cleanups = [];
    const ctx = {
      petId: props.definition.id,
      assetBase: "/pet/" + encodeURIComponent(props.definition.id),
      container,
      phase: streamRef.current,
      interact: props.onPet,
      onCleanup: (fn) => {
        cleanups.push(fn);
      }
    };
    let handle;
    try {
      handle = defaultPetRendererRegistry.mount("frames2d", ctx, frames2d);
    } catch {
      setInvalid(true);
      return () => {
        for (const fn of cleanups.splice(0)) fn();
      };
    }
    handleRef.current = handle;
    handle.setPlaybackFps?.(props.fps, props.runLimit, props.actionFps);
    if (props.bus !== void 0) {
      const gameplayBus = props.bus;
      gameplayBus.setTrack = (track) => {
        if (!props.drag.get()) handleRef.current?.setState(track);
      };
      gameplayBus.setIdleTrack = (track) => {
        handleRef.current?.setIdleTrack(track);
      };
      if (gameplayBus.idleTrack !== void 0) handle.setIdleTrack(gameplayBus.idleTrack);
      cleanups.push(() => {
        gameplayBus.setTrack = void 0;
        gameplayBus.setIdleTrack = void 0;
      });
    }
    const dragTrack = props.definition.gameplay?.dragState ?? (frames2d.tracks.drag === void 0 ? void 0 : "drag");
    const offDrag = props.drag.subscribe((dragging) => {
      if (dragTrack === void 0) return;
      if (dragging) {
        handle.setState(dragTrack);
        return;
      }
      handle.setState(props.definition.gameplay?.dragEndState);
    });
    cleanups.push(offDrag);
    if (props.drag.get() && dragTrack !== void 0) handle.setState(dragTrack);
    return () => {
      handleRef.current = null;
      for (const fn of cleanups.splice(0)) fn();
      handle.dispose();
    };
  }, [props.definition, frames2d]);
  (0, import_react3.useEffect)(() => {
    handleRef.current?.setPlaybackFps?.(props.fps, props.runLimit, props.actionFps);
  }, [props.fps, props.runLimit, props.actionFps, frames2d]);
  (0, import_react3.useEffect)(() => {
    const animation = hasSessionMotion ? props.snapshot?.animation : void 0;
    handleRef.current?.setActivityTrack?.(animation !== void 0 && frames2d?.tracks[animation] !== void 0 ? animation : void 0);
  }, [props.snapshot?.animation, hasSessionMotion, frames2d]);
  const seenWaves = (0, import_react3.useRef)(/* @__PURE__ */ new Set());
  const waveKey = props.feedback?.kind === "pet" ? "pet:" + props.feedback.at : props.snapshot?.waveKey;
  const waveBlocked = props.snapshot?.generation !== void 0 || props.phase === "done" || props.phase === "failed" || props.snapshot?.gameplay?.mode != null;
  (0, import_react3.useEffect)(() => {
    if (!hasSessionMotion) return;
    const handle = handleRef.current;
    if (waveBlocked && handle?.currentTrack() === "waving") handle.setState(void 0);
    if (waveKey === void 0 || seenWaves.current.has(waveKey)) return;
    seenWaves.current.add(waveKey);
    if (seenWaves.current.size > 32) seenWaves.current.delete(seenWaves.current.values().next().value);
    if (!waveBlocked && handle !== null && ["idle", "waiting", "review", "running", "running-right", "running-left"].includes(handle.currentTrack())) {
      handle.setState("waving");
    }
  }, [waveKey, waveBlocked, hasSessionMotion, frames2d]);
  (0, import_react3.useEffect)(() => {
    if (hasSessionMotion && !props.drag.get() && props.feedback?.kind === "feed" && props.snapshot?.gameplay?.mode == null) {
      handleRef.current?.setState("eat");
    }
  }, [props.feedback?.at, props.feedback?.kind, hasSessionMotion, frames2d]);
  (0, import_react3.useEffect)(() => {
    streamRef.current?.push(props.phase);
  }, [props.phase]);
  return /* @__PURE__ */ (0, import_jsx_runtime3.jsx)(
    "div",
    {
      ref: containerRef,
      "data-dsh-pet-frames2d": props.definition.id,
      style: { width: "100%", height: "100%", pointerEvents: "none" },
      children: invalid && /* @__PURE__ */ (0, import_jsx_runtime3.jsx)("span", { "data-dsh-pet-frames2d-error": "invalid-config", children: props.t("pet.renderer.unavailable", { renderer: "frames2d" }) })
    }
  );
}

// src/client/renderers/PetRendererSwitch.tsx
var import_jsx_runtime4 = require("react/jsx-runtime");
function PetRendererSwitch(props) {
  const renderer = props.definition.renderer ?? "sprite2d";
  const dragRef = (0, import_react4.useRef)(null);
  if (dragRef.current === null || dragRef.current.id !== props.definition.id) {
    dragRef.current = { id: props.definition.id, stream: createDragStream() };
  }
  const drag = props.drag ?? dragRef.current.stream;
  if (renderer === "sprite2d") return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(import_jsx_runtime4.Fragment, { children: props.children });
  if (renderer === "frames2d" && defaultPetRendererRegistry.has("frames2d") && (0, import_react4.isValidElement)(props.children)) {
    const visual = /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      Frames2dVisualMount,
      {
        definition: props.definition,
        fps: effectiveFps(props.children.props.display, props.children.props.snapshot?.performance?.tokensPerSecond),
        runLimit: props.children.props.display.animationRunFpsLimit,
        actionFps: props.children.props.display.animationActionFps,
        phase: props.phase,
        snapshot: props.children.props.snapshot,
        feedback: props.children.props.feedback,
        onPet: props.onPet,
        drag,
        ...props.bus === void 0 ? {} : { bus: props.bus },
        t: props.t
      }
    );
    return (0, import_react4.cloneElement)(props.children, { visual, onDraggingChange: (dragging) => drag.push(dragging) });
  }
  if (renderer === "live2d" && defaultPetRendererRegistry.has("live2d") && (0, import_react4.isValidElement)(props.children)) {
    const visual = /* @__PURE__ */ (0, import_jsx_runtime4.jsx)(
      Live2dVisualMount,
      {
        definition: props.definition,
        phase: props.phase,
        onPet: props.onPet,
        t: props.t
      }
    );
    return (0, import_react4.cloneElement)(props.children, { visual });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime4.jsx)("span", { "data-dsh-pet-renderer-fallback": renderer, children: props.t("pet.renderer.unavailable", { renderer }) });
}

// src/client/gameplay-hud.tsx
var import_react5 = require("react");

// src/gameplay.ts
var PET_ROAM_DIRECTIONS = ["up", "down", "left", "right"];
function declaredModeOf(manifest, mode) {
  const modes = manifest.modes;
  if (modes === void 0 || !Object.prototype.hasOwnProperty.call(modes, mode)) return void 0;
  return modes[mode];
}
function declaredModes(manifest) {
  return [
    ...manifest.sleep === void 0 ? [] : ["sleep"],
    ...Object.keys(manifest.modes ?? {})
  ];
}
function modeStateOf(manifest, mode) {
  if (mode === "sleep") return manifest.sleep?.state;
  if (mode === "work") return manifest.work?.state;
  return declaredModeOf(manifest, mode)?.state;
}
function touchZoneAt(touch, yFraction) {
  return touch.zones.find((zone) => yFraction >= zone.y0 && yFraction < zone.y1);
}

// src/client/gameplay-hud.tsx
var import_jsx_runtime5 = require("react/jsx-runtime");
var floatSeq = 0;
function GameplayHud(props) {
  const { definition, store, api, bus } = props;
  const ui = (0, import_react5.useSyncExternalStore)(store.subscribe, store.getSnapshot);
  const def = definition.gameplay;
  const hasSessionMotion = sessionMotionPet(definition.id) && definition.frames2d?.tracks["running-right"] !== void 0 && definition.frames2d.tracks["running-left"] !== void 0;
  const view = ui.snapshot?.gameplay;
  const persistedSkin = ui.snapshot?.skin;
  const [open, setOpen] = (0, import_react5.useState)(false);
  const [page, setPage] = (0, import_react5.useState)("root");
  const [skinId, setSkinId] = (0, import_react5.useState)(void 0);
  const skinIdRef = (0, import_react5.useRef)(void 0);
  skinIdRef.current = skinId;
  const hudRef = (0, import_react5.useRef)(null);
  const cardRef = (0, import_react5.useRef)(null);
  const [floats, setFloats] = (0, import_react5.useState)([]);
  const modeRef = (0, import_react5.useRef)(view?.mode ?? null);
  modeRef.current = view?.mode ?? null;
  const viewRef = (0, import_react5.useRef)(view);
  viewRef.current = view;
  const activityRef = (0, import_react5.useRef)(ui.snapshot?.phase ?? "idle");
  activityRef.current = ui.snapshot?.phase ?? "idle";
  const draggingRef = (0, import_react5.useRef)(false);
  const touchLockUntilRef = (0, import_react5.useRef)(0);
  const missRef = (0, import_react5.useRef)(0);
  const busyRef = (0, import_react5.useRef)(false);
  const roamHeldRef = (0, import_react5.useRef)(false);
  const actHeldRef = (0, import_react5.useRef)(false);
  const roamTimerRef = (0, import_react5.useRef)(0);
  const tr = props.t;
  const statLabel = (name) => tr("pet.gameplay.stat." + name);
  const currencyLabel = (name) => tr("pet.gameplay.currency." + name);
  const pushFloat = (text) => {
    const id = ++floatSeq;
    setFloats((list) => [...list.slice(-3), { id, text }]);
    window.setTimeout(() => {
      setFloats((list) => list.filter((entry) => entry.id !== id));
    }, 1100);
  };
  const applyResult = (result) => {
    if (result.view !== void 0) store.actions.setGameplayView(result.view);
  };
  const yieldRoam = () => {
    if (roamTimerRef.current !== 0) {
      window.clearTimeout(roamTimerRef.current);
      roamTimerRef.current = 0;
    }
    roamHeldRef.current = false;
  };
  (0, import_react5.useEffect)(() => {
    if (def === void 0) return void 0;
    const holdTrack = (track, holdMs) => {
      yieldRoam();
      bus.setTrack?.(track);
      touchLockUntilRef.current = Date.now() + holdMs;
      window.setTimeout(() => {
        if (Date.now() >= touchLockUntilRef.current) bus.setTrack?.(void 0);
      }, holdMs);
    };
    const speak = (phrases) => {
      if (phrases !== void 0 && phrases.length > 0) {
        const phrase = phrases[Math.floor(Math.random() * phrases.length)];
        store.actions.setFeedback({ text: phrase, kind: "none", at: Date.now() });
      }
    };
    const trackDuration = (track) => definition.frames2d?.tracks[track]?.durations.reduce((sum, ms) => sum + ms, 0) ?? 0;
    bus.tap = (fx, fy) => {
      if (modeRef.current !== null && modeRef.current !== "work") {
        void api.setMode(null).then(applyResult, () => void 0);
        return;
      }
      if (modeRef.current === "work") return;
      const box = def.hitBox ?? { x0: 0, y0: 0, x1: 1, y1: 1 };
      const hx = (fx - box.x0) / (box.x1 - box.x0);
      const hy = (fy - box.y0) / (box.y1 - box.y0);
      if (hx < 0 || hx > 1 || hy < 0 || hy > 1) return;
      if (Date.now() < touchLockUntilRef.current) {
        void api.touch().then(applyResult, () => void 0);
        return;
      }
      const activeSkin = definition.frames2d?.skins?.find((skin) => skin.id === skinIdRef.current);
      if (activeSkin !== void 0) {
        const actions = activeSkin.clickActions ?? [];
        if (actions.length > 0) {
          let roll = Math.random();
          const fired = actions.find((action) => {
            if (roll < action.probability) return true;
            roll -= action.probability;
            return false;
          });
          if (fired !== void 0) {
            holdTrack(fired.track, trackDuration(fired.track) || 3e3);
            speak(fired.phrases);
            return;
          }
        }
        void api.touch().then(applyResult, () => void 0);
        return;
      }
      const zone = def.touch === void 0 ? void 0 : touchZoneAt(def.touch, hy);
      if (zone === void 0) return;
      void api.touch(zone.name).then((result) => {
        applyResult(result);
        if (result.hit !== true) return;
        if (result.state !== void 0) holdTrack(result.state, result.stateMs ?? 3e3);
        if (result.phrase !== void 0) {
          store.actions.setFeedback({ text: result.phrase, kind: "none", at: Date.now() });
        }
      }, () => void 0);
    };
    return () => {
      bus.tap = void 0;
    };
  }, [definition.id, def]);
  (0, import_react5.useEffect)(() => {
    bus.openCard = (next) => {
      setOpen((prev) => next ?? !prev);
      setPage("root");
    };
    return () => {
      bus.openCard = void 0;
    };
  }, [bus]);
  (0, import_react5.useLayoutEffect)(() => {
    if (!open) return void 0;
    const hud = hudRef.current;
    const card = cardRef.current;
    if (hud === null || card === null) return void 0;
    const place = () => {
      const box = hud.parentElement?.getBoundingClientRect();
      if (box === void 0) return;
      const gap = 8;
      const width = card.getBoundingClientRect().width;
      const toRight = window.innerWidth - box.right;
      const x = toRight >= width + gap ? box.width + gap : -(width + gap);
      card.style.transform = "translate(" + Math.round(x) + "px, " + Math.round(-box.height / 2) + "px) translateY(50%)";
      card.style.maxHeight = Math.round(box.height) + "px";
    };
    place();
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("resize", place);
    };
  }, [open, page]);
  (0, import_react5.useEffect)(() => {
    return props.drag.subscribe((dragging) => {
      draggingRef.current = dragging;
      if (dragging) yieldRoam();
      if (dragging && modeRef.current !== null && modeRef.current !== "work") {
        void api.setMode(null).then(applyResult, () => void 0);
      }
    });
  }, [props.drag]);
  (0, import_react5.useEffect)(() => {
    const director = def?.idleDirector;
    if (def === void 0 || director === void 0) return void 0;
    const total = director.idleWeight + director.acts.reduce((sum, act) => sum + act.weight, 0);
    if (total <= 0) return void 0;
    let actTimer = 0;
    const timer = window.setInterval(() => {
      if (hasSessionMotion && activityRef.current !== "idle") return;
      if (modeRef.current !== null || draggingRef.current) return;
      if (Date.now() < touchLockUntilRef.current) return;
      if (roamHeldRef.current) return;
      if (actHeldRef.current) return;
      let pickedAct;
      if (missRef.current >= director.maxMiss) {
        const actTotal = director.acts.reduce((sum, act) => sum + act.weight, 0);
        let actRoll = Math.random() * actTotal;
        for (const act of director.acts) {
          actRoll -= act.weight;
          if (actRoll < 0) {
            pickedAct = act;
            break;
          }
        }
      } else {
        let roll = Math.random() * total;
        for (const act of director.acts) {
          roll -= act.weight;
          if (roll < 0) {
            pickedAct = act;
            break;
          }
        }
      }
      if (pickedAct === void 0) {
        missRef.current += 1;
        return;
      }
      missRef.current = 0;
      actHeldRef.current = true;
      bus.setTrack?.(pickedAct.track);
      const holdMs = definition.frames2d?.tracks[pickedAct.track]?.durations.reduce((sum, ms) => sum + ms, 0) ?? 0;
      window.clearTimeout(actTimer);
      actTimer = window.setTimeout(() => {
        actHeldRef.current = false;
      }, holdMs > 0 ? holdMs : 3e3);
      if (pickedAct.phrases !== void 0 && pickedAct.phrases.length > 0) {
        const phrase = pickedAct.phrases[Math.floor(Math.random() * pickedAct.phrases.length)];
        store.actions.setFeedback({ text: phrase, kind: "none", at: Date.now() });
      }
    }, director.intervalMs);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(actTimer);
      actHeldRef.current = false;
    };
  }, [definition.id, def, hasSessionMotion]);
  (0, import_react5.useEffect)(() => {
    if (hasSessionMotion && ui.snapshot?.phase !== "idle" && actHeldRef.current) {
      actHeldRef.current = false;
      bus.setTrack?.(void 0);
    }
  }, [ui.snapshot?.phase, hasSessionMotion, bus]);
  (0, import_react5.useEffect)(() => {
    const work = def?.work;
    if (def === void 0 || work === void 0 || view?.mode !== "work") return void 0;
    const skinGameplay = definition.frames2d?.skins?.find((skin) => skin.id === skinIdRef.current)?.gameplayTracks;
    const trackOf = (state) => skinGameplay?.[state] ?? state;
    bus.setTrack?.(trackOf(work.state));
    let resultTimer = 0;
    const timer = window.setInterval(() => {
      if (busyRef.current) return;
      busyRef.current = true;
      void api.workTick().then((result) => {
        busyRef.current = false;
        if (modeRef.current !== "work") return;
        applyResult(result);
        if (result.ok !== true || result.outcome === void 0) return;
        const resultTrack = trackOf(result.outcome === "success" ? work.successState : work.failState);
        const hold = result.outcome === "success" ? work.resultMs?.success ?? 1300 : work.resultMs?.fail ?? 1900;
        bus.setTrack?.(resultTrack);
        resultTimer = window.setTimeout(() => {
          if (modeRef.current === "work") bus.setTrack?.(trackOf(work.state));
        }, hold);
      }, () => {
        busyRef.current = false;
      });
    }, work.tickMs);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(resultTimer);
      bus.setTrack?.(void 0);
    };
  }, [definition.id, def, view?.mode, skinId]);
  (0, import_react5.useEffect)(() => {
    const active = view?.mode;
    if (def === void 0 || active === void 0 || active === null || active === "work") return void 0;
    const hold = modeStateOf(def, active);
    if (hold === void 0) return void 0;
    const skinGameplay = definition.frames2d?.skins?.find((skin) => skin.id === skinIdRef.current)?.gameplayTracks;
    yieldRoam();
    bus.setTrack?.(skinGameplay?.[active] ?? hold);
    return () => bus.setTrack?.(void 0);
  }, [definition.id, def, view?.mode, skinId]);
  (0, import_react5.useEffect)(() => {
    const roam = def?.roam;
    if (def === void 0 || roam === void 0) return void 0;
    const roll = () => {
      if (modeRef.current !== null || draggingRef.current) return;
      if (Date.now() < touchLockUntilRef.current) return;
      if (roamHeldRef.current || actHeldRef.current) return;
      if (Math.random() >= roam.probability) return;
      const span = roam.distanceMax - roam.distanceMin;
      const distance = roam.distanceMin + Math.random() * span;
      const directions = roam.directions ?? PET_ROAM_DIRECTIONS;
      const direction = directions[Math.floor(Math.random() * directions.length)] ?? "left";
      const travelled = bus.walk?.(direction, distance, roam.speed) ?? 0;
      if (travelled === 0) return;
      roamHeldRef.current = true;
      bus.setTrack?.(roam.state);
      roamTimerRef.current = window.setTimeout(() => {
        roamTimerRef.current = 0;
        if (!roamHeldRef.current) return;
        roamHeldRef.current = false;
        bus.setTrack?.(void 0);
      }, Math.max(150, Math.abs(travelled) / roam.speed * 1e3));
    };
    let timer = 0;
    const lead = window.setTimeout(() => {
      roll();
      timer = window.setInterval(roll, roam.intervalMs);
    }, Math.round(roam.intervalMs / 2));
    return () => {
      window.clearTimeout(lead);
      window.clearInterval(timer);
      yieldRoam();
    };
  }, [definition.id, def]);
  if (def === void 0 || view === void 0) return null;
  const mode = view.mode;
  const stats = def.stats ?? {};
  const shop = def.shop;
  const menuModes = declaredModes(def);
  const modeLabel = (name, active) => {
    if (name === "sleep") return tr(active ? "pet.gameplay.wake" : "pet.gameplay.sleep");
    const declared = def.modes?.[name];
    return (active ? declared?.activeLabel ?? declared?.label : declared?.label) ?? tr("pet.gameplay." + name);
  };
  const modeChip = (name) => {
    if (name === "work") return tr("pet.gameplay.working");
    if (name === "sleep") return tr("pet.gameplay.sleeping");
    const declared = def.modes?.[name];
    return declared?.activeLabel ?? declared?.label ?? tr("pet.gameplay." + name);
  };
  const buy = (itemId) => {
    void api.buy(itemId).then((result) => {
      applyResult(result);
      if (result.ok !== true) {
        if (result.error === "insufficient-funds") {
          const item = shop?.items.find((entry) => entry.id === itemId);
          pushFloat(tr("pet.gameplay.insufficient", { currency: currencyLabel(item?.currency ?? "treats") }));
        }
        return;
      }
      if (result.prize !== void 0) {
        pushFloat(tr("pet.gameplay.prize", { amount: result.prize.amount, currency: currencyLabel(result.prize.currency) }));
      }
    }, () => void 0);
  };
  const setMode = (next) => {
    void api.setMode(next).then(applyResult, () => void 0);
  };
  (0, import_react5.useEffect)(() => {
    setSkinId(persistedSkin);
  }, [definition.id, persistedSkin]);
  (0, import_react5.useEffect)(() => {
    const skin = definition.frames2d?.skins?.find((candidate) => candidate.id === skinId);
    bus.idleTrack = skin?.idleTrack;
    bus.setIdleTrack?.(skin?.idleTrack);
  }, [definition.id, skinId, persistedSkin]);
  const skins = definition.frames2d?.skins;
  const skinTrackOf = (id) => id === void 0 ? void 0 : definition.frames2d?.skins?.find((candidate) => candidate.id === id)?.idleTrack;
  const selectSkin = (skin) => {
    setSkinId(skin?.id);
    bus.setIdleTrack?.(skin?.idleTrack);
    const restore = () => {
      setSkinId(persistedSkin);
      bus.setIdleTrack?.(skinTrackOf(persistedSkin));
    };
    void api.setSkin(skin?.id).then((result) => {
      if (result.ok) return;
      restore();
    }, restore);
  };
  return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { ref: hudRef, className: pet_default.gameplayHud, "data-dsh-pet-gameplay": definition.id, children: [
    floats.map((entry) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: pet_default.gameplayFloat, children: entry.text }, entry.id)),
    mode !== null && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: pet_default.gameplayModeChip, children: modeChip(mode) }),
    open && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { ref: cardRef, className: pet_default.gameplayCard, "data-page": page, children: [
      page === "root" && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: pet_default.gameplayBars, children: Object.entries(stats).map(([name, stat]) => {
          const value = view.stats[name] ?? 0;
          return /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: pet_default.gameplayBarRow, title: statLabel(name) + " " + String(value) + "/" + String(stat.max), children: [
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: pet_default.gameplayBarLabel, children: statLabel(name) }),
            /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: pet_default.gameplayBarTrack, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
              "span",
              {
                className: pet_default.gameplayBarFill,
                style: { width: Math.round(value / stat.max * 100) + "%" }
              }
            ) })
          ] }, name);
        }) }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: pet_default.gameplayActions, children: [
          menuModes.map((name) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
            "button",
            {
              type: "button",
              className: pet_default.action,
              onClick: () => setMode(mode === name ? null : name),
              children: modeLabel(name, mode === name)
            },
            name
          )),
          shop !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { type: "button", className: pet_default.action, onClick: () => setPage("shop"), children: tr("pet.gameplay.shop") }),
          skins !== void 0 && skins.length > 0 && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { type: "button", className: pet_default.action, onClick: () => setPage("skins"), children: tr("pet.gameplay.skin") }),
          def.work !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
            "button",
            {
              type: "button",
              className: pet_default.action,
              onClick: () => setMode(mode === "work" ? null : "work"),
              children: tr(mode === "work" ? "pet.gameplay.stopWork" : "pet.gameplay.work")
            }
          )
        ] })
      ] }),
      page === "shop" && shop !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: pet_default.gameplayShopItems, children: shop.items.map((item) => /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(
          "button",
          {
            type: "button",
            className: pet_default.gameplayShopItem,
            onClick: () => buy(item.id),
            title: item.label + " \u2014 " + String(item.price) + " " + currencyLabel(item.currency),
            children: [
              item.image !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("img", { className: pet_default.gameplayShopItemImage, src: item.image, alt: "", draggable: false }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("span", { className: pet_default.gameplayShopItemLabel, children: item.label }),
              /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("span", { className: pet_default.gameplayShopItemPrice, children: [
                item.price,
                " ",
                currencyLabel(item.currency)
              ] })
            ]
          },
          item.id
        )) }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: pet_default.gameplayActions, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { type: "button", className: pet_default.action, onClick: () => setPage("root"), children: tr("pet.gameplay.back") }) })
      ] }),
      page === "skins" && skins !== void 0 && /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)(import_jsx_runtime5.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime5.jsxs)("div", { className: pet_default.gameplaySkinItems, children: [
          /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
            "button",
            {
              type: "button",
              className: skinId === void 0 ? pet_default.gameplaySkinItem + " " + pet_default.gameplaySkinItemActive : pet_default.gameplaySkinItem,
              onClick: () => selectSkin(void 0),
              children: tr("pet.gameplay.skinDefault")
            }
          ),
          skins.map((skin) => /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
            "button",
            {
              type: "button",
              className: skinId === skin.id ? pet_default.gameplaySkinItem + " " + pet_default.gameplaySkinItemActive : pet_default.gameplaySkinItem,
              onClick: () => selectSkin(skin),
              children: skin.label
            },
            skin.id
          ))
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("div", { className: pet_default.gameplayActions, children: /* @__PURE__ */ (0, import_jsx_runtime5.jsx)("button", { type: "button", className: pet_default.action, onClick: () => setPage("root"), children: tr("pet.gameplay.back") }) })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime5.jsx)(
        "button",
        {
          type: "button",
          className: pet_default.gameplayClose,
          "aria-label": tr("pet.gameplay.back"),
          onClick: () => setOpen(false),
          children: "\xD7"
        }
      )
    ] })
  ] });
}

// src/client/PetDockEntry.tsx
var import_jsx_runtime6 = require("react/jsx-runtime");
var DEFAULT_DISPLAY = { visible: true, size: 160, right: 24, bottom: 20, bubbleScale: 1 };
function PetDockEntry(props) {
  const { store, ensure } = props;
  const ui = (0, import_react6.useSyncExternalStore)(store.subscribe, store.getSnapshot);
  const snapshot = ui.snapshot;
  const feedback = ui.feedback;
  const definition = ui.pets.find((entry) => entry.id === snapshot?.pet.id) ?? null;
  const visible = snapshot?.display.visible ?? true;
  (0, import_react6.useEffect)(() => {
    ensure();
  }, [ensure]);
  const auxRef = (0, import_react6.useRef)(null);
  if (definition !== null && (auxRef.current === null || auxRef.current.id !== definition.id)) {
    auxRef.current = { id: definition.id, bus: {}, drag: createDragStream() };
  }
  const aux = auxRef.current;
  const gameplay = definition?.gameplay;
  if (visible) {
    return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)("span", { "data-pet-dock": true, "data-testid": "pet-dock", children: snapshot === null || definition === null ? null : /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
      PetRendererSwitch,
      {
        definition,
        phase: snapshot?.phase ?? "idle",
        onPet: props.pet,
        ...aux === null ? {} : { drag: aux.drag, bus: aux.bus },
        t: props.t,
        children: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
          PetSprite,
          {
            snapshot,
            definition,
            display: snapshot.display,
            feedback,
            onPet: props.pet,
            onFeed: props.feed,
            onHide: props.hide,
            onDragEnd: props.dragEnd,
            onRename: props.rename,
            onOpenSession: props.openSession,
            onFeedbackDone: props.feedbackDone,
            portalTarget: props.portalTarget,
            dragDisabled: snapshot.gameplay?.mode === "work",
            ...aux === null ? {} : { bus: aux.bus },
            ...gameplay === void 0 || aux === null ? {} : {
              onGameplayTap: (fx, fy) => aux.bus.tap?.(fx, fy),
              onGameplayMenu: () => aux.bus.openCard?.(),
              hud: /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
                GameplayHud,
                {
                  definition,
                  store,
                  api: props.gameplay,
                  bus: aux.bus,
                  drag: aux.drag,
                  t: props.t
                }
              )
            },
            t: props.t
          }
        )
      }
    ) });
  }
  const display = snapshot?.display ?? DEFAULT_DISPLAY;
  return /* @__PURE__ */ (0, import_jsx_runtime6.jsx)(
    "button",
    {
      type: "button",
      className: pet_default.summon,
      style: {
        position: "fixed",
        right: display.right,
        bottom: display.bottom,
        zIndex: 2147483e3
      },
      onClick: props.summon,
      "data-testid": "pet-summon",
      "data-dsh-part": "summon-button",
      children: props.t("pet.summon", { name: snapshot?.name ?? "" })
    }
  );
}

// src/client/PetGroupEntry.tsx
var import_jsx_runtime7 = require("react/jsx-runtime");
function PetGroupEntry(props) {
  const ui = (0, import_react7.useSyncExternalStore)(props.store.subscribe, props.store.getSnapshot);
  if (ui.desktopActive) return null;
  const snapshot = ui.snapshot;
  if (!snapshot?.display.multiPetEnabled || !snapshot.display.visible || !snapshot.companions?.length) return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(PetDockEntry, { ...props });
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(import_jsx_runtime7.Fragment, { children: snapshot.companions.map((companion, index) => /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(
    EmbeddedCompanion,
    {
      ...props,
      snapshot,
      companion,
      index
    },
    companion.sessionId
  )) });
}
function EmbeddedCompanion(props) {
  const local = (0, import_react7.useMemo)(() => createPetStore().create(), []);
  const ui = (0, import_react7.useSyncExternalStore)(props.store.subscribe, props.store.getSnapshot);
  const position = (0, import_react7.useRef)(void 0);
  const { snapshot, companion: c } = props;
  (0, import_react7.useEffect)(() => {
    const size = c.primary ? snapshot.display.size : Math.max(20, Math.round(snapshot.display.size * SECONDARY_SCALE));
    local.actions.setPets(ui.pets);
    local.actions.setFeedback(c.primary ? ui.feedback : null);
    local.actions.setSnapshot({
      ...snapshot,
      ...c,
      companions: void 0,
      sessions: c.bubble ? [{ ...c, bubble: c.bubble }] : [],
      announcement: c.primary ? snapshot.announcement : void 0,
      display: { ...snapshot.display, size, ...position.current ?? {
        right: snapshot.display.right + (c.primary ? 0 : (props.index + 1) * (petRenderSize(snapshot.pet.id, size) + 20)),
        bottom: snapshot.display.bottom
      } }
    });
  }, [local, ui.pets, ui.feedback, snapshot, c, props.index]);
  return /* @__PURE__ */ (0, import_jsx_runtime7.jsx)(PetDockEntry, { ...props, store: local, dragEnd: (right, bottom) => {
    position.current = { right, bottom };
    if (c.primary) props.dragEnd(right, bottom);
  } });
}

// src/client/ui-teardown.ts
var SLOT = Symbol.for("dsh-pet.client-ui-teardown");
function registerPetUiTeardown(teardown) {
  const slot = globalThis;
  slot[SLOT] = teardown;
  return () => {
    if (slot[SLOT] === teardown) slot[SLOT] = void 0;
  };
}
function takeoverPetUiTeardown() {
  const slot = globalThis;
  const teardown = slot[SLOT];
  slot[SLOT] = void 0;
  teardown?.();
}

// src/client/PlaybackSettings.tsx
var import_react8 = require("react");

// src/client/desktop-connection.ts
async function desktopRequest(action, body = {}) {
  const response = await fetch("/api/pet/desktop/" + action, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error("Desktop request failed: " + response.status);
  return response.json();
}
var legacyStop;
function desktopConnection(status) {
  if (!status?.supported) return window.dshPetDesktop;
  return {
    async configure(options) {
      legacyStop ??= window.dshPetDesktop?.configure({ enabled: false }) ?? Promise.resolve();
      try {
        await legacyStop;
      } catch {
        legacyStop = void 0;
      }
      return desktopRequest("configure", options);
    },
    resetPosition: () => desktopRequest("reset")
  };
}

// src/client/pet-api.ts
var PetApiError = class extends Error {
  constructor(status) {
    super("Pet service HTTP " + status);
    this.status = status;
  }
};
async function petJson(path, init) {
  const response = await fetch(path, { signal: AbortSignal.timeout(1e4), ...init });
  if (!response.ok) throw new PetApiError(response.status);
  return await response.json();
}
function petServiceFailure(error) {
  return error instanceof PetApiError && (error.status === 401 || error.status === 403) ? "authorization" : "unavailable";
}

// src/client/locales.ts
var NS = "pet";
var zh = {
  "pet.feed": "\u5582\u98DF",
  "pet.hide": "\u9690\u85CF",
  "pet.rename": "\u6539\u540D",
  "pet.confirm": "\u786E\u5B9A",
  "pet.namePlaceholder": "\u8F93\u5165\u65B0\u540D\u5B57",
  "pet.summon": "\u53EC\u5524{name}",
  "pet.rank": "\u4EB2\u5BC6\u5EA6 {rank}",
  "pet.rank.name.\u5E7C\u9CB8": "\u5E7C\u9CB8",
  "pet.rank.name.\u4F19\u4F34": "\u4F19\u4F34",
  "pet.rank.name.\u631A\u53CB": "\u631A\u53CB",
  "pet.rank.name.\u6DF1\u6D77\u7F81\u7ECA": "\u6DF1\u6D77\u7F81\u7ECA",
  "pet.rank.name.\u5FC3\u6709\u7075\u7280": "\u5FC3\u6709\u7075\u7280",
  "pet.rank.name.\u4F20\u8BF4\u7F81\u7ECA": "\u4F20\u8BF4\u7F81\u7ECA",
  "pet.rank.name.\u795E\u8BDD\u7F81\u7ECA": "\u795E\u8BDD\u7F81\u7ECA",
  "pet.rank.name.\u6C38\u6052\u4E4B\u5951": "\u6C38\u6052\u4E4B\u5951",
  "pet.rank.name.\u9CB8\u751F\u5171\u6E21": "\u9CB8\u751F\u5171\u6E21",
  "pet.points": "{points} \u70B9",
  "pet.treats": "\u5C0F\u9C7C\u5E72 \xD7{n}",
  "pet.state.loading": "\u5BA0\u7269\u6B63\u5728\u8D76\u6765\u2026",
  "pet.state.error": "\u5BA0\u7269\u8FF7\u8DEF\u4E86\uFF08\u8FDE\u63A5\u5931\u8D25\uFF09",
  "pet.renderer.unavailable": "\u8FD9\u53EA\u5BA0\u7269\u9700\u8981\u7684\u6E32\u67D3\u5668\uFF08{renderer}\uFF09\u5728\u5F53\u524D\u7248\u672C\u4E0D\u53EF\u7528\u3002",
  "pet.live2d.core-missing": "Live2D \u6838\u5FC3\u672A\u5B89\u88C5\uFF1A\u8BF7\u628A\u5B98\u65B9 live2dcubismcore.min.js \u653E\u5165 $DSH_HOME/pets/.runtime/ \u540E\u5237\u65B0\uFF08\u6B65\u9AA4\u89C1\u5BA0\u7269\u63D2\u4EF6 README\uFF09\u3002",
  "pet.live2d.vendor-missing": "Live2D \u7EC4\u4EF6\u7F3A\u5931\uFF0C\u8BF7\u5347\u7EA7\u5BA0\u7269\u63D2\u4EF6\u3002",
  "pet.live2d.load-failed": "Live2D \u6A21\u578B\u52A0\u8F7D\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u8BE5\u5BA0\u7269\u76EE\u5F55\u7684\u5B8C\u6574\u6027\u3002",
  "pet.openSessionHint": "\u70B9\u51FB\u8DF3\u8F6C\u5230\u5BF9\u5E94\u4F1A\u8BDD",
  // 玩法 HUD（miku-pet 泛化：属性条 / 打工 / 睡觉 / 商店；统一小鱼干经济）。
  "pet.gameplay.menu": "\u73A9\u6CD5",
  "pet.gameplay.work": "\u6253\u5DE5",
  "pet.gameplay.stopWork": "\u6536\u5DE5",
  "pet.gameplay.sleep": "\u4F11\u606F",
  "pet.gameplay.wake": "\u8D77\u5E8A",
  "pet.gameplay.shop": "\u5546\u5E97",
  "pet.gameplay.skin": "\u76AE\u80A4",
  "pet.gameplay.skinDefault": "\u9ED8\u8BA4",
  "pet.gameplay.back": "\u8FD4\u56DE",
  "pet.gameplay.buy": "\u8D2D\u4E70",
  "pet.gameplay.insufficient": "{currency}\u4E0D\u8DB3",
  "pet.gameplay.prize": "\u4E2D\u5956 +{amount} {currency}",
  "pet.gameplay.working": "\u6253\u5DE5\u4E2D",
  "pet.gameplay.sleeping": "\u7761\u89C9\u4E2D",
  "pet.gameplay.stat.hunger": "\u9971\u98DF",
  "pet.gameplay.stat.mood": "\u5FC3\u60C5",
  "pet.gameplay.stat.energy": "\u7CBE\u529B",
  "pet.gameplay.stat.affection": "\u597D\u611F",
  "pet.gameplay.currency.treats": "\u5C0F\u9C7C\u5E72",
  "pet.moreSessions": "\u5C55\u5F00\u5176\u4F59 {n} \u4E2A\u4F1A\u8BDD\u7684\u6C14\u6CE1",
  "pet.collapseSessions": "\u6536\u8D77\u4F1A\u8BDD\u6C14\u6CE1",
  // 一级设置页（settings.section 席位）。
  "settings.title": "\u5BA0\u7269",
  "settings.description": "\u9009\u62E9\u5BA0\u7269\u5E76\u8C03\u6574\u5B83\u7684\u663E\u793A\u5E03\u5C40\u3002",
  "settings.pet": "\u5BA0\u7269",
  "settings.petHint": "\u9009\u62E9\u663E\u793A\u54EA\u53EA\u5BA0\u7269\uFF1B\u6BCF\u53EA\u5BA0\u7269\u72EC\u7ACB\u547D\u540D\uFF0C\u53EF\u5728\u5BA0\u7269\u60AC\u6D6E\u9762\u677F\u6539\u540D\u3002",
  "settings.enabled": "\u542F\u7528\u5BA0\u7269",
  "settings.enabledHint": "\u5173\u95ED\u540E\u9690\u85CF\u5BA0\u7269\u5E76\u505C\u6B62\u8F6E\u8BE2\uFF0C\u53EF\u5728\u8BBE\u7F6E\u91CC\u91CD\u65B0\u542F\u7528\u3002",
  "settings.decoration": "\u72B6\u6001\u88C5\u9970",
  "settings.decorationHint": "\u5728\u5BA0\u7269\u72B6\u6001\u6C14\u6CE1\u91CC\u663E\u793A\u55B7\u6C34\u9CB8\u9C7C\u7B49\u72B6\u6001\u88C5\u9970\uFF1B\u5173\u95ED\u540E\u6C14\u6CE1\u53EA\u5269\u6587\u5B57\u3002",
  "settings.visible": "\u663E\u793A\u5BA0\u7269",
  "settings.visibleHint": "\u5173\u95ED\u540E\u5BA0\u7269\u9690\u85CF\uFF0C\u53EF\u4ECE\u804A\u5929\u8F93\u5165\u533A\u91CD\u65B0\u53EC\u5524\u3002",
  "settings.size": "\u5927\u5C0F\uFF08px\uFF09",
  "settings.sizeHint": "\u7CBE\u7075\u5355\u5143\u9AD8\u5EA6\uFF0C\u8303\u56F4 32\u20131024\u3002",
  "settings.bubbleScale": "\u6C14\u6CE1\u5B57\u53F7\u500D\u7387",
  "settings.bubbleScaleHint": "\u72B6\u6001\u3001\u788E\u788E\u5FF5\u4E0E\u7528\u91CF\u6C14\u6CE1\u7684\u5B57\u53F7\u4F1A\u968F\u5BA0\u7269\u5927\u5C0F\u81EA\u52A8\u7F29\u653E\uFF1B\u8FD9\u4E00\u9879\u662F\u5728\u6B64\u57FA\u7840\u4E0A\u518D\u4E58\u4E00\u4E2A\u500D\u7387\uFF080.5\u20132\uFF0C\u9ED8\u8BA4 1\uFF09\u3002\u5B57\u53F7\u672C\u8EAB\u4E0D\u5C0F\u4E8E 10px\u3001\u4E0D\u5927\u4E8E 24px\u3002",
  "settings.right": "\u8DDD\u53F3\u4FA7\uFF08px\uFF09",
  "settings.rightHint": "\u5E94\u7528\u5185\u8DDD\u53F3\u8FB9\u7F18\u7684\u8DDD\u79BB\uFF0C\u8303\u56F4 0\u201310000px\u3002\u72EC\u7ACB\u684C\u9762\u4F4D\u7F6E\u8BF7\u76F4\u63A5\u62D6\u52A8\u5BA0\u7269\u3002",
  "settings.bottom": "\u8DDD\u5E95\u90E8\uFF08px\uFF09",
  "settings.bottomHint": "\u5E94\u7528\u5185\u8DDD\u5E95\u8FB9\u7684\u8DDD\u79BB\uFF0C\u8303\u56F4 0\u201310000px\u3002\u72EC\u7ACB\u684C\u9762\u4F4D\u7F6E\u8BF7\u76F4\u63A5\u62D6\u52A8\u5BA0\u7269\u3002",
  "settings.inherit": "\u7EE7\u627F",
  "settings.on": "\u5F00",
  "settings.off": "\u5173",
  "settings.overridden": "\u5DF2\u8986\u76D6",
  "settings.reset": "\u6062\u590D\u9ED8\u8BA4",
  "settings.notExposed": "\u5BA0\u7269\u8BBE\u7F6E\u5C1A\u672A\u5C31\u7EEA\uFF0C\u6B63\u5728\u91CD\u65B0\u8FDE\u63A5\u3002",
  "settings.serviceLoading": "\u6B63\u5728\u8FDE\u63A5\u5BA0\u7269\u5BBF\u4E3B\u2026",
  "settings.serviceUnavailable": "\u6682\u65F6\u65E0\u6CD5\u8FDE\u63A5\u5BA0\u7269\u5BBF\u4E3B\u3002\u82E5\u521A\u5B89\u88C5\u6216\u66F4\u65B0\uFF0C\u8BF7\u5B8C\u6574\u9000\u51FA DSH \u540E\u91CD\u65B0\u6253\u5F00\uFF1B\u9875\u9762\u4F1A\u81EA\u52A8\u91CD\u8FDE\uFF0C\u65E0\u9700\u624B\u6539\u914D\u7F6E\u6587\u4EF6\u3002",
  "settings.serviceAuthorization": "\u5BA0\u7269\u8FDE\u63A5\u672A\u83B7\u6388\u6743\uFF08HTTP 401/403\uFF09\u3002\u8BF7\u5B8C\u6574\u9000\u51FA DSH \u540E\u91CD\u65B0\u6253\u5F00\uFF1B\u7F51\u9875\u7AEF\u8BF7\u4ECE DSH \u63D0\u4F9B\u7684\u5165\u53E3\u91CD\u65B0\u8FDB\u5165\u3002\u9875\u9762\u4F1A\u81EA\u52A8\u91CD\u8FDE\u3002",
  "settings.readOnly": "\u5F53\u524D\u90E8\u7F72\u7684\u8BBE\u7F6E\u53EA\u8BFB\u3002",
  "settings.expand": "\u5C55\u5F00\u8BBE\u7F6E",
  "settings.collapse": "\u6536\u8D77\u8BBE\u7F6E",
  "settings.save": "\u4FDD\u5B58",
  "settings.saving": "\u4FDD\u5B58\u4E2D\u2026",
  "settings.discard": "\u653E\u5F03",
  "settings.unsaved": "\u672A\u4FDD\u5B58",
  "settings.saveFailed": "\u4FDD\u5B58\u5931\u8D25\uFF1ADSH \u672A\u80FD\u5B8C\u6210\u5199\u5165\u3002\u8F93\u5165\u5DF2\u4FDD\u7559\uFF0C\u8BF7\u91CD\u8BD5\u3002",
  "settings.invalidDraft": "\u8F93\u5165\u9700\u8981\u8C03\u6574\uFF1A\u8BF7\u68C0\u67E5\u6807\u6CE8\u7684\u5B57\u6BB5\uFF0C\u5F53\u524D\u5C1A\u672A\u63D0\u4EA4\u4FDD\u5B58\u3002",
  "settings.invalidSize": "\u5927\u5C0F\u9700\u4E3A 32\u20131024 \u7684\u6574\u6570\uFF1B\u7559\u7A7A\u5219\u6062\u590D\u9ED8\u8BA4\u503C\u3002",
  "settings.invalidInset": "\u8DDD\u79BB\u9700\u4E3A 0\u201310000 \u7684\u6574\u6570\uFF1B\u7559\u7A7A\u5219\u6062\u590D\u9ED8\u8BA4\u503C\u3002",
  "settings.invalidBubbleScale": "\u6C14\u6CE1\u5B57\u53F7\u500D\u7387\u9700\u4E3A 0.5\u20132\uFF0C\u6309 0.05 \u9012\u589E\uFF08\u5982 0.5\u30010.75\u30011\uFF09\uFF1B\u7559\u7A7A\u5219\u6062\u590D\u9ED8\u8BA4\u503C\u3002",
  "settings.invalidNumber": "\u8BF7\u8F93\u5165\u6570\u5B57\uFF0C\u7559\u7A7A\u5219\u4F7F\u7528\u9ED8\u8BA4\u503C\u3002"
};
var en = {
  "pet.feed": "Feed",
  "pet.hide": "Hide",
  "pet.rename": "Rename",
  "pet.confirm": "OK",
  "pet.namePlaceholder": "Enter a new name",
  "pet.summon": "Summon {name}",
  "pet.rank": "Affinity {rank}",
  "pet.rank.name.\u5E7C\u9CB8": "Baby Whale",
  "pet.rank.name.\u4F19\u4F34": "Companion",
  "pet.rank.name.\u631A\u53CB": "Close Friend",
  "pet.rank.name.\u6DF1\u6D77\u7F81\u7ECA": "Deep Sea Bond",
  "pet.rank.name.\u5FC3\u6709\u7075\u7280": "Kindred Spirit",
  "pet.rank.name.\u4F20\u8BF4\u7F81\u7ECA": "Legendary Bond",
  "pet.rank.name.\u795E\u8BDD\u7F81\u7ECA": "Mythic Bond",
  "pet.rank.name.\u6C38\u6052\u4E4B\u5951": "Eternal Covenant",
  "pet.rank.name.\u9CB8\u751F\u5171\u6E21": "Lifelong Companion",
  "pet.points": "{points} pts",
  "pet.treats": "Treats \xD7{n}",
  "pet.state.loading": "The pet is on its way\u2026",
  "pet.state.error": "The pet is lost (connection failed)",
  "pet.renderer.unavailable": "This pet needs a renderer ({renderer}) that is not available in this build.",
  "pet.live2d.core-missing": "Live2D Cubism Core is not installed: place the official live2dcubismcore.min.js under $DSH_HOME/pets/.runtime/ and refresh (see the pet plugin README).",
  "pet.live2d.vendor-missing": "The Live2D component is missing; please update the pet plugin.",
  "pet.live2d.load-failed": "The Live2D model failed to load; check the pet directory is complete.",
  "pet.openSessionHint": "Click to jump to this session",
  // Gameplay HUD (miku-pet generalization: stat bars / work / sleep / shop; unified treats economy).
  "pet.gameplay.menu": "Play",
  "pet.gameplay.work": "Work",
  "pet.gameplay.stopWork": "Stop work",
  "pet.gameplay.sleep": "Sleep",
  "pet.gameplay.wake": "Wake up",
  "pet.gameplay.shop": "Shop",
  "pet.gameplay.skin": "Skin",
  "pet.gameplay.skinDefault": "Default",
  "pet.gameplay.back": "Back",
  "pet.gameplay.buy": "Buy",
  "pet.gameplay.insufficient": "Not enough {currency}",
  "pet.gameplay.prize": "Prize +{amount} {currency}",
  "pet.gameplay.working": "Working",
  "pet.gameplay.sleeping": "Sleeping",
  "pet.gameplay.stat.hunger": "Hunger",
  "pet.gameplay.stat.mood": "Mood",
  "pet.gameplay.stat.energy": "Energy",
  "pet.gameplay.stat.affection": "Affection",
  "pet.gameplay.currency.treats": "Treats",
  "pet.moreSessions": "Expand {n} more session bubbles",
  "pet.collapseSessions": "Collapse session bubbles",
  // First-level settings section (the `settings.section` seat).
  "settings.title": "Pet",
  "settings.description": "Pick a pet and tune its display layout.",
  "settings.pet": "Pet",
  "settings.petHint": "Choose which pet shows. Names are stored per pet; rename from the pet hover panel.",
  "settings.enabled": "Enable the pet",
  "settings.enabledHint": "When off, the pet hides and polling stops; re-enable it here.",
  "settings.decoration": "Status decoration",
  "settings.decorationHint": "Show ornaments like the spouting whale inside the pet status bubbles; when off, bubbles stay text-only.",
  "settings.visible": "Show the pet",
  "settings.visibleHint": "When off, the pet hides; summon it again from the input row.",
  "settings.size": "Size (px)",
  "settings.sizeHint": "Sprite cell height, 32\u20131024.",
  "settings.bubbleScale": "Bubble text multiplier",
  "settings.bubbleScaleHint": "Status, whisper, and usage bubbles scale with the pet automatically; this multiplies that result (0.5\u20132, default 1). The rendered text stays between 10px and 24px.",
  "settings.right": "Right inset (px)",
  "settings.rightHint": "In-app right inset, 0\u201310000px. Drag the independent desktop pet to position it.",
  "settings.bottom": "Bottom inset (px)",
  "settings.bottomHint": "In-app bottom inset, 0\u201310000px. Drag the independent desktop pet to position it.",
  "settings.inherit": "Inherit",
  "settings.on": "On",
  "settings.off": "Off",
  "settings.overridden": "Overridden",
  "settings.reset": "Reset to default",
  "settings.notExposed": "Pet settings are not ready. Reconnecting automatically.",
  "settings.serviceLoading": "Connecting to the pet service\u2026",
  "settings.serviceUnavailable": "The pet service cannot be reached. If you just installed or updated it, fully quit and reopen DSH. This page reconnects automatically; no configuration file edits are needed.",
  "settings.serviceAuthorization": "The pet connection was not authorized (HTTP 401/403). Fully quit and reopen DSH; for the web client, reopen the entry provided by DSH. This page reconnects automatically.",
  "settings.readOnly": "This deployment stores settings read-only.",
  "settings.expand": "Show settings",
  "settings.collapse": "Hide settings",
  "settings.save": "Save",
  "settings.saving": "Saving\u2026",
  "settings.discard": "Discard",
  "settings.unsaved": "Unsaved",
  "settings.saveFailed": "Save failed: DSH could not complete the write. Your input is retained; please retry.",
  "settings.invalidDraft": "Input needs correction: check the marked fields. Nothing has been submitted yet.",
  "settings.invalidSize": "Size must be an integer from 32 to 1024. Leave blank to restore the default.",
  "settings.invalidInset": "Inset must be an integer from 0 to 10000. Leave blank to restore the default.",
  "settings.invalidBubbleScale": "Use 0.5\u20132 in steps of 0.05 (e.g. 0.5, 0.75, 1). Leave blank to restore the default.",
  "settings.invalidNumber": "Enter a number, or leave blank to use the default."
};
function dictionary() {
  const lang = typeof document !== "undefined" ? document.documentElement.lang : "zh";
  return lang.toLowerCase().startsWith("en") ? en : zh;
}
function t(key, params) {
  let text = dictionary()[key] ?? key;
  if (params !== void 0) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
  }
  return text;
}

// src/client/PlaybackSettings.tsx
var import_jsx_runtime8 = require("react/jsx-runtime");
async function request(action, body) {
  return petJson("/api/pet/" + (action === "config" ? "set-config" : "state"), body === void 0 ? {} : {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
}
function PlaybackSettings() {
  const [snapshot, setSnapshot] = (0, import_react8.useState)(null);
  const [mode, setMode] = (0, import_react8.useState)("fixed");
  const [fps, setFps] = (0, import_react8.useState)("12");
  const [limitRunning, setLimitRunning] = (0, import_react8.useState)(false);
  const [runLimit, setRunLimit] = (0, import_react8.useState)("60");
  const [customActions, setCustomActions] = (0, import_react8.useState)(false);
  const [actionFps, setActionFps] = (0, import_react8.useState)("12");
  const [slope, setSlope] = (0, import_react8.useState)(String(DEFAULT_TICK_SLOPE));
  const [intercept, setIntercept] = (0, import_react8.useState)(String(DEFAULT_TICK_INTERCEPT));
  const [desktop, setDesktop] = (0, import_react8.useState)(true);
  const [multi, setMulti] = (0, import_react8.useState)(false);
  const [hoverPanel, setHoverPanel] = (0, import_react8.useState)(false);
  const [message, setMessage] = (0, import_react8.useState)("");
  const [busy, setBusy] = (0, import_react8.useState)(false);
  const [serviceStatus, setServiceStatus] = (0, import_react8.useState)("loading");
  (0, import_react8.useEffect)(() => {
    let alive = true;
    let timer;
    let selected;
    const refresh = () => request("state").then((state) => {
      if (!alive) return;
      if (typeof state.pet?.id !== "string" || !state.display) throw new Error("Invalid pet service state");
      setSnapshot(state);
      setServiceStatus("ready");
      if (selected !== state.pet.id) {
        selected = state.pet.id;
        setMode(animationMode(state.display.animationMode));
        setFps(String(animationFps(state.display.animationFps)));
        const limit = optionalFps(state.display.animationRunFpsLimit), actions = optionalFps(state.display.animationActionFps);
        setLimitRunning(limit > 0);
        setRunLimit(String(limit || 60));
        setCustomActions(actions > 0);
        setActionFps(String(actions || 12));
        setSlope(String(tickSlope(state.display.animationTickSlope)));
        setIntercept(String(tickIntercept(state.display.animationTickIntercept)));
        setDesktop(state.display.desktopEnabled !== false);
        setMulti(state.display.multiPetEnabled === true);
        setHoverPanel(state.display.hoverPanelEnabled === true);
      }
    }).catch((error) => {
      if (alive) {
        setServiceStatus(petServiceFailure(error));
        setMessage("");
      }
    }).finally(() => {
      if (alive) timer = window.setTimeout(() => void refresh(), 2e3);
    });
    void refresh();
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, []);
  const connected = serviceStatus === "ready" && snapshot !== null;
  const validLinear = slope.trim() !== "" && Number.isFinite(Number(slope)) && Number(slope) >= MIN_TICK_SLOPE && Number(slope) <= MAX_TICK_SLOPE && intercept.trim() !== "" && Number.isFinite(Number(intercept)) && Number(intercept) >= MIN_TICK_INTERCEPT && Number(intercept) <= MAX_TICK_INTERCEPT;
  const positiveFps = (value) => value.trim() !== "" && Number.isFinite(Number(value)) && Number(value) >= 1;
  const validFps = positiveFps(fps);
  const validLimit = !limitRunning || positiveFps(runLimit);
  const validActions = !customActions || positiveFps(actionFps);
  const savedLimit = limitRunning ? Number(runLimit) : 0;
  const savedActions = customActions ? Number(actionFps) : 0;
  const valid = validFps && validLimit && validActions && (mode !== "tick" || validLinear);
  async function save() {
    if (!valid || busy || !connected) return;
    setBusy(true);
    setMessage("");
    try {
      const linear = validLinear ? { animationTickSlope: Number(slope), animationTickIntercept: Number(intercept) } : {};
      const result = await request("config", { petId: snapshot?.pet.id, animationMode: mode, animationFps: Number(fps), animationRunFpsLimit: savedLimit, animationActionFps: savedActions, desktopEnabled: desktop, multiPetEnabled: multi, hoverPanelEnabled: hoverPanel, ...linear });
      if (result.ok !== true || result.display?.animationMode !== mode || result.display?.animationFps !== Number(fps) || result.display?.desktopEnabled !== desktop || result.display?.multiPetEnabled !== multi || result.display?.hoverPanelEnabled !== hoverPanel || result.display?.animationRunFpsLimit !== savedLimit || result.display?.animationActionFps !== savedActions || validLinear && (result.display?.animationTickSlope !== Number(slope) || result.display?.animationTickIntercept !== Number(intercept))) throw new Error("\u8BBE\u7F6E\u672A\u4FDD\u5B58");
      setSlope(String(tickSlope(result.display.animationTickSlope)));
      setIntercept(String(tickIntercept(result.display.animationTickIntercept)));
      setMessage("\u5DF2\u4FDD\u5B58");
    } catch {
      setMessage("\u4FDD\u5B58\u5931\u8D25\uFF0C\u8BBE\u7F6E\u4FDD\u7559\uFF0C\u8BF7\u91CD\u8BD5\u3002");
    } finally {
      setBusy(false);
    }
  }
  async function resetPosition() {
    const bridge = desktopConnection(snapshot?.desktop);
    if (!bridge || busy || !connected) return;
    setBusy(true);
    try {
      const result = await bridge.resetPosition();
      setMessage(result.active ? "\u5BA0\u7269\u7A97\u53E3\u5DF2\u5F52\u4F4D" : "\u8BF7\u5148\u4FDD\u5B58\u5E76\u542F\u7528\u72EC\u7ACB\u684C\u9762\u5BA0\u7269\u3002");
    } catch {
      setMessage("\u5F52\u4F4D\u5931\u8D25\uFF0C\u8BF7\u91CD\u8BD5\u3002");
    } finally {
      setBusy(false);
    }
  }
  const rate = snapshot?.performance?.tokensPerSecond;
  const desktopStatus = snapshot?.desktop;
  async function retryDesktop() {
    if (busy || !connected) return;
    setBusy(true);
    try {
      await desktopRequest("retry");
      setMessage("\u6B63\u5728\u91CD\u65B0\u51C6\u5907\u72EC\u7ACB\u7A97\u53E3\u2026");
    } catch {
      setMessage("\u91CD\u8BD5\u5931\u8D25\uFF0C\u8BF7\u7A0D\u540E\u518D\u8BD5\u3002");
    } finally {
      setBusy(false);
    }
  }
  return /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("section", { "data-pet-controls": true, style: { padding: 16, border: "1px solid #7775", borderRadius: 12, display: "grid", gap: 10, color: "inherit", fontSize: 13 }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("strong", { children: [
      snapshot?.pet.displayName ?? "\u5F53\u524D\u5F62\u8C61",
      " \xB7 \u751F\u6210\u901F\u5EA6\u52A8\u753B"
    ] }),
    serviceStatus !== "ready" && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("p", { role: "status", children: t(serviceStatus === "authorization" ? "settings.serviceAuthorization" : serviceStatus === "loading" ? "settings.serviceLoading" : "settings.serviceUnavailable") }),
    /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("fieldset", { disabled: !connected || busy, style: { display: "grid", gap: 10, border: 0, padding: 0, margin: 0, minWidth: 0 }, children: [
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("label", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("input", { "aria-label": "\u60AC\u505C\u5C55\u5F00\u770B\u677F", type: "checkbox", checked: hoverPanel, onChange: (e) => setHoverPanel(e.target.checked) }),
        " \u60AC\u505C\u5C55\u5F00\u770B\u677F"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { opacity: 0.8 }, children: "\u9ED8\u8BA4\u5173\u95ED\uFF0C\u9F20\u6807\u7ECF\u8FC7\u5BA0\u7269\u65F6\u4E0D\u5C55\u5F00\u8865\u5145\u80FD\u91CF\u3001\u547D\u540D\u548C\u9690\u85CF\u9762\u677F\u3002\u9700\u8981\u65F6\u4ECD\u53EF\u53F3\u952E\u5BA0\u7269\u6253\u5F00\uFF1B\u5F00\u542F\u540E\u6062\u590D\u60AC\u505C\u5C55\u5F00\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("label", { children: [
        "\u5DE6\u53F3\u8DD1\u52A8\u6A21\u5F0F ",
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("select", { "aria-label": "\u64AD\u653E\u6A21\u5F0F", value: mode, onChange: (e) => setMode(e.target.value), children: [
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("option", { value: "fixed", children: "\u56FA\u5B9A FPS" }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("option", { value: "native", children: "\u7D20\u6750\u539F\u901F" }),
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("option", { value: "tick", children: "Tick \xB7 \u8DDF\u968F\u5E95\u90E8 tok/s" })
        ] })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("label", { children: [
        mode === "tick" ? "\u65E0\u7EDF\u8BA1\u6570\u636E\u65F6\u7684 FPS" : "\u5DE6\u53F3\u8DD1\u52A8 FPS",
        " ",
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("input", { "aria-label": "\u52A8\u753B FPS", type: "number", min: "1", step: "any", value: fps, disabled: mode === "native", onChange: (e) => setFps(e.target.value), style: { width: 88 } })
      ] }),
      !validFps && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { role: "alert", children: "\u5E27\u7387\u9700\u4E3A\u4E0D\u5C0F\u4E8E 1 \u7684\u6709\u6548\u6570\u5B57\uFF1B\u5F53\u524D\u8F93\u5165\u5C1A\u672A\u63D0\u4EA4\u4FDD\u5B58\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { opacity: 0.8, lineHeight: 1.6 }, children: "\u601D\u8003\u3001\u56DE\u7B54\u53CA\u5176\u4ED6\u5DE5\u5177\u53C2\u6570\u751F\u6210\u5411\u53F3\u8DD1\uFF1B\u5199\u6587\u4EF6\u3001\u7F16\u8F91\u548C\u8865\u4E01\u5185\u5BB9\u751F\u6210\u5411\u5DE6\u8DD1\u3002\u5DE6\u53F3\u8DD1\u52A8\u9ED8\u8BA4\u4E0D\u8BBE\u4E0A\u9650\uFF0C\u6240\u6709\u5F62\u8C61\u4F7F\u7528\u540C\u4E00\u89C4\u5219\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("label", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("input", { "aria-label": "\u9650\u5236\u5DE6\u53F3\u8DD1\u52A8\u5E27\u7387", type: "checkbox", checked: limitRunning, onChange: (e) => setLimitRunning(e.target.checked) }),
        " \u9650\u5236\u5DE6\u53F3\u8DD1\u52A8\u5E27\u7387"
      ] }),
      limitRunning && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("label", { children: [
        "\u5DE6\u53F3\u8DD1\u52A8\u6700\u9AD8 FPS ",
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("input", { "aria-label": "\u5DE6\u53F3\u8DD1\u52A8\u6700\u9AD8 FPS", type: "number", min: "1", step: "any", value: runLimit, onChange: (e) => setRunLimit(e.target.value), style: { width: 88 } })
      ] }),
      !validLimit && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { role: "alert", children: "\u5DE6\u53F3\u8DD1\u52A8\u4E0A\u9650\u9700\u4E3A\u4E0D\u5C0F\u4E8E 1 \u7684\u6709\u6548\u6570\u5B57\u3002" }),
      snapshot?.pet.id === "blue-whale-business" && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { opacity: 0.8 }, children: "\u5546\u52A1\u5C0F\u84DD\u9CB8\u7684\u5F62\u8C61\u548C\u5360\u4F4D\u5E95\u677F\u7EDF\u4E00\u4E3A\u8BBE\u5B9A\u5927\u5C0F\u7684 75%\uFF0C\u4E3B\u5BA0\u7269\u4E0E\u540E\u53F0\u5C0F\u5BA0\u7269\u5747\u751F\u6548\u3002" }),
      mode === "tick" && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)(import_jsx_runtime8.Fragment, { children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { children: [
          "FPS = k \xD7 \u5E95\u90E8 tok/s + b\uFF1B",
          limitRunning ? `\u4E0A\u9650\u7531\u4F60\u8BBE\u4E3A ${runLimit} FPS\u3002` : "\u672A\u8BBE\u7F6E\u4E0A\u9650\u3002"
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("label", { children: [
          "\u659C\u7387 k ",
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("input", { "aria-label": "\u659C\u7387 k", type: "number", min: MIN_TICK_SLOPE, max: MAX_TICK_SLOPE, step: "any", value: slope, onChange: (e) => setSlope(e.target.value), style: { width: 180 } })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("label", { children: [
          "\u622A\u8DDD b\uFF08FPS\uFF09 ",
          /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("input", { "aria-label": "\u622A\u8DDD b", type: "number", min: MIN_TICK_INTERCEPT, max: MAX_TICK_INTERCEPT, step: "any", value: intercept, onChange: (e) => setIntercept(e.target.value), style: { width: 96 } })
        ] }),
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { opacity: 0.8, lineHeight: 1.6 }, children: "k \u63A7\u5236\u901F\u5EA6\u6BCF\u589E\u52A0 1 tok/s \u65F6\u589E\u52A0\u591A\u5C11 FPS\uFF1Bb \u63A7\u5236\u8D77\u59CB\u5E27\u7387\u3002\u8DDF\u968F\u5F53\u524D\u4F1A\u8BDD\u5E95\u680F\u7EDF\u8BA1\uFF0C\u6B65\u9AA4\u5B8C\u6210\u540E\u66F4\u65B0\u3002" }),
        !validLinear && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { role: "alert", children: [
          "k \u9700\u5728 ",
          MIN_TICK_SLOPE,
          "\u2013",
          MAX_TICK_SLOPE,
          " \u4E4B\u95F4\uFF0Cb \u9700\u5728 ",
          MIN_TICK_INTERCEPT,
          "\u2013",
          MAX_TICK_INTERCEPT,
          " \u4E4B\u95F4\u3002"
        ] }),
        validLinear && validLimit && validFps && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { children: rate === void 0 ? `\u5E95\u680F\u6682\u65E0\u901F\u5EA6\uFF0C\u4F7F\u7528\u5907\u7528 ${effectiveFps({ animationFps: Number(fps), animationRunFpsLimit: savedLimit })} FPS` : `\u9884\u89C8\uFF1A${rate} tok/s \u2192 ${effectiveFps({ animationMode: "tick", animationTickSlope: Number(slope), animationTickIntercept: Number(intercept), animationRunFpsLimit: savedLimit }, rate)?.toFixed(1)} FPS` })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("label", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("input", { "aria-label": "\u81EA\u8BBE\u5176\u4ED6\u52A8\u4F5C\u901F\u7387", type: "checkbox", checked: customActions, onChange: (e) => setCustomActions(e.target.checked) }),
        " \u81EA\u8BBE\u5176\u4ED6\u52A8\u4F5C\u901F\u7387"
      ] }),
      customActions && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("label", { children: [
        "\u5176\u4ED6\u52A8\u4F5C FPS ",
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("input", { "aria-label": "\u5176\u4ED6\u52A8\u4F5C FPS", type: "number", min: "1", step: "any", value: actionFps, onChange: (e) => setActionFps(e.target.value), style: { width: 88 } })
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { opacity: 0.8 }, children: "\u7528\u4E8E\u5F85\u673A\u3001\u6325\u624B\u3001\u5582\u98DF\u7B49\u975E\u5DE6\u53F3\u8DD1\u52A8\u52A8\u4F5C\uFF0C\u4E0E tok/s \u65E0\u5173\u3002\u53EF\u4EE5\u81EA\u884C\u586B\u5199 FPS\uFF0C\u4E0D\u8BBE 12 \u6216 60 FPS \u4E0A\u9650\uFF1B\u5173\u95ED\u65F6\u4FDD\u7559\u7D20\u6750\u539F\u901F\u3002" }),
      !validActions && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { role: "alert", children: "\u5176\u4ED6\u52A8\u4F5C\u5E27\u7387\u9700\u4E3A\u4E0D\u5C0F\u4E8E 1 \u7684\u6709\u6548\u6570\u5B57\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("label", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("input", { "aria-label": "\u591A\u5BA0\u7269\u6A21\u5F0F", type: "checkbox", checked: multi, onChange: (e) => setMulti(e.target.checked) }),
        " \u591A\u5BA0\u7269\u6A21\u5F0F"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { opacity: 0.8, lineHeight: 1.6 }, children: multi ? "\u6D3B\u8DC3\u5BF9\u8BDD\u5404\u4E00\u53EA\uFF0C\u5206\u522B\u8DDF\u968F\u81EA\u5DF1\u7684 tok/s\uFF1B\u4E3B\u5BF9\u8BDD\u4FDD\u6301\u539F\u5927\u5C0F\uFF0C\u5176\u4F59\u4E3A 52.7% \u4E14\u4E0D\u5F39\u6C14\u6CE1\u3002\u65B0\u5EFA\u3001\u5C3A\u5BF8\u5207\u6362\u6216\u62D6\u52A8\u7ED3\u675F\u65F6\u81EA\u52A8\u907F\u8BA9\u3002\u540E\u53F0\u5BF9\u8BDD\u7ED3\u675F\u540E\uFF0C\u5C0F\u5BA0\u7269\u4FDD\u7559\u7B49\u5F85\u67E5\u770B\uFF1B\u70B9\u5F00\u5BF9\u8BDD\u6216\u53CC\u51FB\u5C0F\u5BA0\u7269\u5373\u53EF\u67E5\u770B\u5E76\u53D8\u4E3A\u4E3B\u5BA0\u7269\uFF0C\u4E0D\u9700\u8981\u8F93\u5165\u6587\u5B57\u3002\u67E5\u770B\u540E\u5207\u5230\u5176\u4ED6\u5BF9\u8BDD\u65F6\u56DE\u6536\u3002" : "\u4EC5\u4E00\u53EA\u9ED8\u8BA4 DS \u84DD\u8272\u5BA0\u7269\uFF0C\u52A8\u4F5C\u3001\u6C14\u6CE1\u548C tok/s \u968F\u4E3B\u7A97\u53E3\u5F53\u524D\u5BF9\u8BDD\u5207\u6362\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { display: "flex", flexWrap: "wrap", gap: 12 }, children: [["#c7edcc", "GPT \xB7 \u8C46\u6C99\u7EFF"], ["#d97941", "Claude \xB7 \u6A59"], ["#24262d", "Kimi \xB7 \u9ED1"], ["#570763", "GLM \xB7 \u6697\u6E05\u534E\u7D2B"], ["#6c9cda", "DS \xB7 \u539F\u8272"]].map(([color, label]) => /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("span", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("i", { style: { display: "inline-block", width: 12, height: 12, borderRadius: "50%", background: color, border: "1px solid #888", marginRight: 4 } }),
        label
      ] }, label)) }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { opacity: 0.8 }, children: "\u4F18\u5148\u4F7F\u7528\u6A21\u578B\u5BF9\u5E94\u8272\uFF1B\u5DF2\u5360\u7528\u65F6\u5148\u5206\u914D\u7A7A\u95F2\u8272\uFF0C\u7B2C\u516D\u53EA\u8D77\u968F\u673A\u5206\u914D\u5E76\u5C3D\u91CF\u62C9\u5F00\u8272\u5DEE\u3002\u5173\u95ED\u591A\u5BA0\u7269\u6A21\u5F0F\u4E0D\u4F1A\u6E05\u9664\u5DF2\u5206\u914D\u989C\u8272\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { opacity: 0.8, lineHeight: 1.6 }, children: "\u6240\u6709\u5BA0\u7269\u5171\u4EAB\u7D2F\u8BA1\uFF1A\u5582\u98DF\u6B21\u6570\u3001\u4EB2\u5BC6\u5EA6\u548C\u5C0F\u9C7C\u5E72\u7EDF\u4E00\u8BB0\u5F55\u3002\u5404\u5BF9\u8BDD\u7684\u5B8C\u6210\u5956\u52B1\u6C47\u5165\u540C\u4E00\u4EFD\u8BB0\u5F55\uFF0C\u5207\u6362\u5BF9\u8BDD\u3001\u5F00\u5173\u591A\u5BA0\u7269\u6216\u91CD\u542F\u90FD\u4E0D\u4F1A\u62C6\u5206\u6216\u91CD\u7F6E\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("label", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("input", { type: "checkbox", checked: desktop, onChange: (e) => setDesktop(e.target.checked) }),
        " \u72EC\u7ACB\u684C\u9762\u5BA0\u7269"
      ] }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { style: { opacity: 0.8 }, children: "\u4E3B\u7A97\u53E3\u9690\u85CF\u6216\u6700\u5C0F\u5316\u540E\u7EE7\u7EED\u663E\u793A\uFF1B\u9000\u51FA DSH \u540E\u5173\u95ED\u3002" }),
      desktopStatus?.supported && /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { "data-pet-desktop-status": desktopStatus.state, children: [
        desktopStatus.state === "starting" ? "\u6B63\u5728\u9996\u6B21\u51C6\u5907\u72EC\u7ACB\u7A97\u53E3\uFF0C\u8BF7\u7A0D\u5019\u2026" : desktopStatus.state === "error" ? desktopStatus.message ?? "\u72EC\u7ACB\u7A97\u53E3\u6682\u4E0D\u53EF\u7528\uFF0C\u8BF7\u91CD\u8BD5\u3002" : desktopStatus.active ? `\u72EC\u7ACB\u7A97\u53E3\u5DF2\u8FD0\u884C \xB7 ${desktopStatus.version}` : "\u72EC\u7ACB\u7A97\u53E3\u5DF2\u968F\u63D2\u4EF6\u96C6\u6210\uFF0C\u4FDD\u5B58\u5E76\u542F\u7528\u540E\u81EA\u52A8\u663E\u793A\u3002",
        desktopStatus.state === "error" && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { type: "button", disabled: busy, onClick: () => void retryDesktop(), children: "\u91CD\u8BD5\u72EC\u7ACB\u7A97\u53E3" })
      ] }),
      (desktopStatus?.supported || window.dshPetDesktop) && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { children: /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { type: "button", onClick: () => void resetPosition(), disabled: busy, children: "\u5BA0\u7269\u7A97\u53E3\u5F52\u4F4D" }) }),
      desktopStatus && !desktopStatus.supported && !window.dshPetDesktop && /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("div", { children: "\u72EC\u7ACB\u7A97\u53E3\u652F\u6301 Windows \u539F\u751F DSH\uFF1B\u5F53\u524D\u73AF\u5883\u4F7F\u7528\u5E94\u7528\u5185\u5BA0\u7269\u3002" }),
      /* @__PURE__ */ (0, import_jsx_runtime8.jsxs)("div", { children: [
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("button", { type: "button", onClick: () => void save(), disabled: busy || !valid || !connected, children: busy ? "\u4FDD\u5B58\u4E2D\u2026" : "\u4FDD\u5B58\u52A8\u753B\u8BBE\u7F6E" }),
        " ",
        /* @__PURE__ */ (0, import_jsx_runtime8.jsx)("span", { role: "status", children: message })
      ] })
    ] })
  ] });
}

// src/client/PluginSettingsCard.tsx
var import_react9 = require("react");

// src/client/settings-card.module.css
var settings_card_default = {
  card: "settings_card_card",
  cardOpen: "settings_card_cardOpen",
  header: "settings_card_header",
  headerStatic: "settings_card_headerStatic",
  headText: "settings_card_headText",
  name: "settings_card_name",
  description: "settings_card_description",
  pending: "settings_card_pending",
  chevron: "settings_card_chevron",
  chevronOpen: "settings_card_chevronOpen",
  body: "settings_card_body",
  readOnly: "settings_card_readOnly",
  notExposed: "settings_card_notExposed",
  footer: "settings_card_footer",
  failed: "settings_card_failed",
  discard: "settings_card_discard",
  save: "settings_card_save",
  field: "settings_card_field",
  head: "settings_card_head",
  label: "settings_card_label",
  badges: "settings_card_badges",
  badge: "settings_card_badge",
  reset: "settings_card_reset",
  input: "settings_card_input",
  select: "settings_card_select",
  inputInvalid: "settings_card_inputInvalid",
  selectWrap: "settings_card_selectWrap",
  selectButton: "settings_card_selectButton",
  selectLabel: "settings_card_selectLabel",
  selectChevron: "settings_card_selectChevron",
  selectChevronOpen: "settings_card_selectChevronOpen",
  selectPopup: "settings_card_selectPopup",
  selectPopupOpen: "settings_card_selectPopupOpen",
  selectPopupClose: "settings_card_selectPopupClose",
  selectOption: "settings_card_selectOption",
  selectOptionActive: "settings_card_selectOptionActive",
  selectOptionSelected: "settings_card_selectOptionSelected",
  invalid: "settings_card_invalid",
  hint: "settings_card_hint"
};

// src/client/PluginSettingsCard.tsx
var import_jsx_runtime9 = require("react/jsx-runtime");
function PluginSettingsCard(props) {
  const [open, setOpen] = (0, import_react9.useState)(props.defaultOpen ?? true);
  const { state, alwaysOpen } = props;
  if (!state.available) return null;
  const title = props.t(props.titleKey);
  const description = props.t(props.descriptionKey);
  const blocked = !state.dirty || state.invalid || state.saving;
  const expanded = alwaysOpen === true || open;
  const cardClass = expanded ? `${settings_card_default.cardOpen} ${settings_card_default.card}` : settings_card_default.card;
  const header = alwaysOpen === true ? /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: settings_card_default.headerStatic, children: [
    /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("span", { className: settings_card_default.headText, children: [
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: settings_card_default.name, title, children: title }),
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: settings_card_default.description, title: description, children: props.descriptionNode ?? description })
    ] }),
    state.dirty ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: settings_card_default.pending, title: props.t("settings.unsaved"), children: props.t("settings.unsaved") }) : null
  ] }) : /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
    "button",
    {
      type: "button",
      className: settings_card_default.header,
      "aria-expanded": open,
      "aria-label": `${props.t(open ? "settings.collapse" : "settings.expand")}: ${title}`,
      onClick: () => {
        setOpen(!open);
      },
      children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("span", { className: settings_card_default.headText, children: [
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: settings_card_default.name, title, children: title }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: settings_card_default.description, title: description, children: props.descriptionNode ?? description })
        ] }),
        state.dirty ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: settings_card_default.pending, title: props.t("settings.unsaved"), children: props.t("settings.unsaved") }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
          "svg",
          {
            width: "14",
            height: "14",
            viewBox: "0 0 14 14",
            fill: "none",
            xmlns: "http://www.w3.org/2000/svg",
            className: open ? `${settings_card_default.chevron} ${settings_card_default.chevronOpen}` : settings_card_default.chevron,
            children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
              "path",
              {
                d: "M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z",
                fill: "currentColor"
              }
            )
          }
        )
      ]
    }
  );
  if (!state.exposed && props.renderChildrenWhenNotExposed !== true) {
    const showNotice = props.hideNotExposedNotice !== true;
    return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("li", { className: cardClass, children: [
      header,
      expanded ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: settings_card_default.body, children: showNotice ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { className: settings_card_default.notExposed, role: "status", children: props.t("settings.notExposed") }) : null }) : null
    ] });
  }
  return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("li", { className: cardClass, children: [
    header,
    expanded ? /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: settings_card_default.body, children: [
      !state.writable ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { className: settings_card_default.readOnly, role: "status", children: props.t("settings.readOnly") }) : null,
      props.children,
      props.hideFooter === true ? null : /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: settings_card_default.footer, children: [
        state.failed ? /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("p", { className: settings_card_default.failed, role: "status", children: [
          props.t("settings.saveFailed"),
          state.failedReason ? " - " + state.failedReason : ""
        ] }) : null,
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
          "button",
          {
            type: "button",
            className: settings_card_default.discard,
            disabled: !state.dirty || state.saving,
            onClick: props.onDiscard,
            children: props.t("settings.discard")
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
          "button",
          {
            type: "button",
            className: settings_card_default.save,
            disabled: blocked,
            onClick: props.onSave,
            children: props.t(!state.saving ? "settings.save" : "settings.saving")
          }
        )
      ] })
    ] }) : null
  ] });
}
function ValueField(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: settings_card_default.field, children: [
    /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: settings_card_default.head, children: [
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("label", { className: settings_card_default.label, htmlFor: props.id, children: props.label }),
      props.overridden ? /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("span", { className: settings_card_default.badges, children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: settings_card_default.badge, children: props.overriddenLabel }),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
          "button",
          {
            type: "button",
            className: settings_card_default.reset,
            disabled: props.disabled,
            onClick: props.onReset,
            children: props.resetLabel
          }
        )
      ] }) : null
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
      "input",
      {
        id: props.id,
        className: props.invalid ? settings_card_default.inputInvalid : settings_card_default.input,
        type: "text",
        ...props.numeric === true ? { inputMode: "numeric" } : {},
        ...props.invalid ? { "aria-invalid": true } : {},
        value: props.text,
        placeholder: props.placeholder ?? "",
        disabled: props.disabled,
        onChange: (event) => {
          props.onEdit(event.target.value);
        }
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { className: props.invalid ? settings_card_default.invalid : settings_card_default.hint, children: props.invalid ? props.invalidLabel : props.hint })
  ] });
}
var NON_SKIN_BODY_MARKERS = /* @__PURE__ */ new Set(["dshSkinCenter", "dshSidebarCollapsed"]);
function isSkinActive() {
  const datasetList = Object.keys(document.body.dataset);
  const isActive = datasetList.some((key) => key.startsWith("dsh") && !NON_SKIN_BODY_MARKERS.has(key));
  return isActive;
}
var SELECT_CLOSE_MS = 100;
function SelectField(props) {
  const { id, options, value } = props;
  const [open, setOpen] = (0, import_react9.useState)(false);
  const [closing, setClosing] = (0, import_react9.useState)(false);
  const [phase, setPhase] = (0, import_react9.useState)("initial");
  const [activeIndex, setActiveIndex] = (0, import_react9.useState)(0);
  const closeTimer = (0, import_react9.useRef)(void 0);
  const wrapRef = (0, import_react9.useRef)(null);
  const popupRef = (0, import_react9.useRef)(null);
  const currentIndex = () => {
    const index = options.findIndex((option) => option.value === value);
    return index >= 0 ? index : 0;
  };
  const close = (0, import_react9.useCallback)(() => {
    if (closeTimer.current !== void 0) clearTimeout(closeTimer.current);
    setClosing(true);
    closeTimer.current = setTimeout(() => {
      setClosing(false);
      setOpen(false);
    }, SELECT_CLOSE_MS);
  }, []);
  const openPopup = () => {
    if (closeTimer.current !== void 0) clearTimeout(closeTimer.current);
    setActiveIndex(currentIndex());
    setPhase("initial");
    setClosing(false);
    setOpen(true);
  };
  const commit = (index) => {
    const option = options[index];
    if (option) props.onEdit(option.value);
    close();
  };
  const onTriggerClick = () => {
    if (props.disabled) return;
    if (open && !closing) close();
    else openPopup();
  };
  const onKeyDown = (event) => {
    if (props.disabled) return;
    const count = options.length;
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp":
      case "Enter":
      case " ":
        event.preventDefault();
        if (!open) {
          openPopup();
        } else if (!closing) {
          if (event.key === "ArrowDown") setActiveIndex((index) => (index + 1) % count);
          else if (event.key === "ArrowUp") setActiveIndex((index) => (index - 1 + count) % count);
          else commit(activeIndex);
        }
        break;
      case "Escape":
        if (open) {
          event.preventDefault();
          event.stopPropagation();
          close();
        }
        break;
      case "Tab":
        if (open) close();
        break;
    }
  };
  (0, import_react9.useEffect)(() => () => {
    if (closeTimer.current !== void 0) clearTimeout(closeTimer.current);
  }, []);
  (0, import_react9.useLayoutEffect)(() => {
    if (open && !closing && phase === "initial") {
      void popupRef.current?.offsetHeight;
      setPhase("open");
    }
  }, [open, closing, phase]);
  (0, import_react9.useEffect)(() => {
    if (!open) return;
    const onPointerDown = (event) => {
      const target = event.target;
      if (target instanceof Node && !wrapRef.current?.contains(target)) close();
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, close]);
  (0, import_react9.useEffect)(() => {
    if (props.disabled && open) close();
  }, [props.disabled, open, close]);
  if (isSkinActive()) {
    return /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
      "select",
      {
        id,
        className: settings_card_default.select,
        value,
        disabled: props.disabled,
        onChange: (event) => {
          props.onEdit(event.target.value);
        },
        children: options.map((option) => /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("option", { value: option.value, children: option.label }, option.value))
      }
    );
  }
  const label = options.find((option) => option.value === value)?.label ?? "";
  const popupClass = closing ? `${settings_card_default.selectPopup} ${settings_card_default.selectPopupClose}` : phase === "open" ? `${settings_card_default.selectPopup} ${settings_card_default.selectPopupOpen}` : settings_card_default.selectPopup;
  return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: settings_card_default.selectWrap, ref: wrapRef, children: [
    /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)(
      "button",
      {
        type: "button",
        id,
        className: `${settings_card_default.select} ${settings_card_default.selectButton}`,
        disabled: props.disabled,
        "aria-haspopup": "listbox",
        "aria-expanded": open,
        "aria-activedescendant": open ? `${id}-o${activeIndex}` : void 0,
        "aria-invalid": props.invalid || void 0,
        onClick: onTriggerClick,
        onKeyDown,
        children: [
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: settings_card_default.selectLabel, children: label }),
          /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
            "svg",
            {
              width: "14",
              height: "14",
              viewBox: "0 0 14 14",
              fill: "none",
              xmlns: "http://www.w3.org/2000/svg",
              className: open ? `${settings_card_default.selectChevron} ${settings_card_default.selectChevronOpen}` : settings_card_default.selectChevron,
              "aria-hidden": "true",
              children: /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
                "path",
                {
                  d: "M11.8486 5.5L11.4238 5.92383L8.69727 8.65137C8.44157 8.90706 8.21562 9.13382 8.01172 9.29785C7.79912 9.46883 7.55595 9.61756 7.25 9.66602C7.08435 9.69222 6.91565 9.69222 6.75 9.66602C6.44405 9.61756 6.20088 9.46883 5.98828 9.29785C5.78438 9.13382 5.55843 8.90706 5.30273 8.65137L2.57617 5.92383L2.15137 5.5L3 4.65137L3.42383 5.07617L6.15137 7.80273C6.42595 8.07732 6.59876 8.24849 6.74023 8.3623C6.87291 8.46904 6.92272 8.47813 6.9375 8.48047C6.97895 8.48703 7.02105 8.48703 7.0625 8.48047C7.07728 8.47813 7.12709 8.46904 7.25977 8.3623C7.40124 8.24849 7.57405 8.07732 7.84863 7.80273L10.5762 5.07617L11 4.65137L11.8486 5.5Z",
                  fill: "currentColor"
                }
              )
            }
          )
        ]
      }
    ),
    open ? /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("div", { className: popupClass, role: "listbox", ref: popupRef, children: options.map((option, index) => /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
      "div",
      {
        id: `${id}-o${index}`,
        role: "option",
        "aria-selected": option.value === value,
        className: `${settings_card_default.selectOption}${option.value === value ? ` ${settings_card_default.selectOptionSelected}` : ""}${index === activeIndex && !closing ? ` ${settings_card_default.selectOptionActive}` : ""}`,
        onClick: () => {
          commit(index);
        },
        children: option.label
      },
      option.value
    )) }) : null
  ] });
}
function BooleanField(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: settings_card_default.field, children: [
    /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: settings_card_default.head, children: [
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("label", { className: settings_card_default.label, htmlFor: props.id, children: props.label }),
      props.overridden ? /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("span", { className: settings_card_default.badges, children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: settings_card_default.badge, children: props.overriddenLabel }),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
          "button",
          {
            type: "button",
            className: settings_card_default.reset,
            disabled: props.disabled,
            onClick: props.onReset,
            children: props.resetLabel
          }
        )
      ] }) : null
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
      SelectField,
      {
        id: props.id,
        options: [
          { value: "", label: props.inheritLabel },
          { value: "true", label: props.onLabel },
          { value: "false", label: props.offLabel }
        ],
        value: props.text,
        disabled: props.disabled,
        invalid: props.invalid,
        onEdit: props.onEdit
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { className: settings_card_default.hint, children: props.hint })
  ] });
}
function ChoiceField(props) {
  return /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: settings_card_default.field, children: [
    /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("div", { className: settings_card_default.head, children: [
      /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("label", { className: settings_card_default.label, htmlFor: props.id, children: props.label }),
      props.overridden ? /* @__PURE__ */ (0, import_jsx_runtime9.jsxs)("span", { className: settings_card_default.badges, children: [
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("span", { className: settings_card_default.badge, children: props.overriddenLabel }),
        /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
          "button",
          {
            type: "button",
            className: settings_card_default.reset,
            disabled: props.disabled,
            onClick: props.onReset,
            children: props.resetLabel
          }
        )
      ] }) : null
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)(
      SelectField,
      {
        id: props.id,
        options: [{ value: "", label: props.inheritLabel }, ...props.choices],
        value: props.text,
        disabled: props.disabled,
        invalid: props.invalid,
        onEdit: props.onEdit
      }
    ),
    /* @__PURE__ */ (0, import_jsx_runtime9.jsx)("p", { className: props.invalid ? settings_card_default.invalid : settings_card_default.hint, children: props.invalid ? props.invalidLabel : props.hint })
  ] });
}

// src/client/settings-form.ts
var import_dsh_client_store2 = require("@deepseek-ai/dsh-client-store");
function numberField(field, constraints = {}) {
  const { integer = false, min } = constraints;
  return {
    field,
    format: (value) => typeof value === "number" ? String(value) : "",
    parse: (text) => {
      const trimmed = text.trim();
      if (trimmed === "") return { kind: "clear" };
      const parsed = Number(trimmed);
      if (!Number.isFinite(parsed)) return void 0;
      if (integer && !Number.isInteger(parsed)) return void 0;
      if (min !== void 0 && parsed < min) return void 0;
      return { kind: "set", value: parsed };
    }
  };
}
function booleanField(field) {
  return {
    field,
    format: (value) => typeof value === "boolean" ? String(value) : "",
    parse: (text) => {
      const trimmed = text.trim();
      if (trimmed === "") return { kind: "clear" };
      if (trimmed === "true") return { kind: "set", value: true };
      if (trimmed === "false") return { kind: "set", value: false };
      return void 0;
    }
  };
}
function choiceField(field, choices) {
  return {
    field,
    format: (value) => typeof value === "string" && choices.includes(value) ? value : "",
    parse: (text) => {
      if (text === "") return { kind: "clear" };
      return choices.includes(text) ? { kind: "set", value: text } : void 0;
    }
  };
}
var CardForm = class {
  /** @param scope - the bound configuration form for this card's namespace. */
  constructor(scope, specs) {
    this.scope = scope;
    this.specs = new Map(specs.map((spec) => [spec.field, spec]));
    this.disposeForm = scope.subscribe(() => {
      this.publish();
    });
  }
  specs;
  staged = /* @__PURE__ */ new Map();
  listeners = /* @__PURE__ */ new Set();
  /** The form subscription installed in the constructor; released by dispose(). */
  disposeForm;
  disposed = false;
  saving = false;
  failed = false;
  failedReason;
  /**
   * Release the form subscription and every bound store listener. The card
   * must call this on teardown; later calls are no-ops.
   */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.disposeForm();
    this.listeners.clear();
  }
  /** Publish a projection of this form, rebuilt whenever the form or a draft changes. */
  bind(project) {
    const store = (0, import_dsh_client_store2.createSnapshotStore)(project());
    this.listeners.add(() => {
      store.set(project());
    });
    return store;
  }
  /** Read the card-level state: what the Host serves, and what a save would do. */
  shell() {
    const snapshot = this.scope.getSnapshot();
    const plan = this.plan();
    return {
      available: snapshot.status !== "loading",
      exposed: snapshot.status === "ready",
      writable: snapshot.writable,
      dirty: plan.length > 0,
      invalid: plan.some((item) => item.judge === void 0),
      saving: this.saving,
      failed: this.failed,
      ...this.failedReason === void 0 ? {} : { failedReason: this.failedReason }
    };
  }
  /** Read one field's state from the effective section and its staged draft. */
  field(field) {
    const spec = this.specOf(field);
    const staged = this.staged.get(field);
    if (staged === void 0) {
      return { text: spec.format(this.sectionValue(field)), overridden: this.stored(field), invalid: false };
    }
    const write = staged.clear ? { kind: "clear" } : spec.parse(staged.text);
    return {
      text: staged.text,
      overridden: write?.kind === "set",
      invalid: write === void 0
    };
  }
  /** The actions the card's slot registration injects. */
  actions() {
    return {
      edit: (field, text) => {
        this.stage(field, { text, clear: false });
      },
      resetField: (field) => {
        this.stage(field, { text: this.specOf(field).format(this.baseValue(field)), clear: true });
      },
      save: () => {
        void this.save();
      },
      discard: () => {
        if (this.staged.size === 0 && !this.failed) return;
        this.staged.clear();
        this.failed = false;
        this.failedReason = void 0;
        this.publish();
      }
    };
  }
  /**
   * Write every staged edit in one atomic form mutation, then re-seed from
   * what the Host accepted.
   *
   * The whole batch rides one mutate, so cross-field validate hooks
   * (baseURL+model) judge it as a unit: the Host either applies every write
   * or refuses the batch. The form contract answers a refusal or a skipped
   * write with `false` (it recovers with a fresh Host view instead of
   * throwing), so the outcome is judged twice: the answer itself, and then the
   * settled snapshot read back one planned write at a time. One missed write
   * fails the whole save. A transport that rejects instead (the dsh-web bridge
   * controller on a dead connection) reports through the same failure path
   * with its rejection message. A save that did not land keeps its drafts, so
   * the user can correct them instead of retyping.
   * @returns settlement after the mutation and the read-back.
   */
  async save() {
    const plan = this.plan();
    const valid = plan.filter((item) => item.judge !== void 0);
    if (plan.length === 0 || this.saving || valid.length !== plan.length) return;
    const pending = /* @__PURE__ */ new Map();
    for (const item of plan) pending.set(item.field, this.staged.get(item.field));
    this.saving = true;
    this.failed = false;
    this.failedReason = void 0;
    this.publish();
    const ops = valid.map((item) => item.op.op === "set" ? { op: "set", path: [item.field], value: item.op.value } : { op: "unset", path: [item.field] });
    let failedReason;
    let accepted = false;
    try {
      accepted = await this.scope.mutate(ops);
    } catch (error) {
      failedReason = error instanceof Error ? error.message : String(error);
    }
    const landed = accepted && failedReason === void 0 && valid.every((item) => item.judge());
    for (const [field, before] of pending) {
      if (landed && this.staged.get(field) === before) this.staged.delete(field);
    }
    this.saving = false;
    this.failed = !landed;
    this.failedReason = failedReason;
    this.publish();
  }
  /**
   * Every staged edit a save would write. An entry whose draft is not a value
   * its field accepts carries no write: the form is still dirty, and the save
   * refuses rather than dropping the edit. A staged edit that matches the
   * effective section is not a write at all.
   * @returns the planned writes, in the order the fields were staged.
   */
  plan() {
    const plan = [];
    for (const [field, staged] of this.staged) {
      const spec = this.specOf(field);
      if (staged.clear) {
        if (this.stored(field)) plan.push({ field, op: { field, op: "unset" }, judge: () => this.landedUnset(field) });
        continue;
      }
      if (staged.text === spec.format(this.sectionValue(field))) continue;
      const write = spec.parse(staged.text);
      if (write === void 0) plan.push({ field, op: { field, op: "unset" }, judge: void 0 });
      else if (write.kind === "clear") plan.push({ field, op: { field, op: "unset" }, judge: () => this.landedUnset(field) });
      else plan.push({ field, op: { field, op: "set", value: write.value }, judge: () => this.landedSet(field, write.value) });
    }
    return plan;
  }
  /**
   * Read-back judgment for a planned set: the user layer must hold the
   * intended value once the mutation has settled.
   */
  landedSet(field, value) {
    if (this.specOf(field).secret) return true;
    return this.userLayer()?.[field] === value;
  }
  /**
   * Read-back judgment for a planned unset: the field must be gone from the
   * user layer once the mutation has settled.
   */
  landedUnset(field) {
    return !this.stored(field);
  }
  stage(field, edit) {
    this.staged.set(field, edit);
    this.failed = false;
    this.failedReason = void 0;
    this.publish();
  }
  specOf(field) {
    const spec = this.specs.get(field);
    if (spec === void 0) throw new Error(`settings card has no field ${field}`);
    return spec;
  }
  snapshotOf() {
    return this.scope.getSnapshot();
  }
  sectionValue(field) {
    return this.snapshotOf().value?.[field];
  }
  baseValue(field) {
    return this.snapshotOf().base?.[field];
  }
  userLayer() {
    return this.snapshotOf().user;
  }
  stored(field) {
    const user = this.userLayer();
    return user !== void 0 && Object.hasOwn(user, field);
  }
  publish() {
    for (const listener of this.listeners) listener();
  }
};

// src/client/pet-setting-fields.ts
function petNumberField(field) {
  const bubble = field === "bubbleScale";
  const min = bubble ? BUBBLE_SCALE_MIN : field === "size" ? DISPLAY_SIZE_MIN : 0;
  const max = bubble ? BUBBLE_SCALE_MAX : field === "size" ? DISPLAY_SIZE_MAX : DISPLAY_INSET_MAX;
  const spec = numberField(field, { min, integer: !bubble });
  return { ...spec, parse(text) {
    const value = spec.parse(text);
    if (value?.kind === "set" && value.value > max) return void 0;
    if (value?.kind === "set" && bubble) {
      const steps = value.value / BUBBLE_SCALE_STEP;
      if (Math.abs(steps - Math.round(steps)) > 1e-8) return void 0;
    }
    return value;
  } };
}

// src/client/settings-section.module.css
var settings_section_default = {
  sectionList: "settings_section_sectionList"
};

// src/client/PetSettingsCard.tsx
var import_jsx_runtime10 = require("react/jsx-runtime");
async function fetchPetChoices() {
  const list = await petJson("/api/pet/pets");
  if (!Array.isArray(list) || !list.length || list.some((pet) => typeof pet.id !== "string" || typeof pet.displayName !== "string")) {
    throw new Error("pet registry unavailable");
  }
  return list;
}
async function fetchPetState() {
  const body = await petJson("/api/pet/state");
  if (typeof body.pet?.id !== "string") throw new Error("pet state has no selected pet");
  return { petId: body.pet.id, visible: body.display?.visible !== false };
}
var PetSettingsCardController = class {
  form;
  store;
  // The choice list rides a mutable array shared with the choiceField spec,
  // so loading the registry re-validates and re-formats the petId field
  // without rebuilding the form.
  petChoices = [];
  petLabels = /* @__PURE__ */ new Map();
  selectedPetId;
  selectedVisible;
  stagedPetId;
  stagedVisible;
  savingPet = false;
  petSaveFailed = false;
  loaded = false;
  serviceStatus = "loading";
  disposed = false;
  /** Pending deferred-load or retry timer; cancelled by dispose(). */
  pendingTimer;
  /** @param scope - the bound configuration form for the 'pet' entry. */
  constructor(scope) {
    this.form = new CardForm(scope, [
      booleanField("enabled"),
      booleanField("decorationEnabled"),
      booleanField("visible"),
      petNumberField("size"),
      petNumberField("right"),
      petNumberField("bottom"),
      petNumberField("bubbleScale"),
      choiceField("petId", this.petChoices)
    ]);
    this.store = this.form.bind(() => this.projection());
    this.pendingTimer = window.setTimeout(() => {
      this.pendingTimer = void 0;
      if (this.disposed) return;
      void this.refreshService();
    }, 0);
  }
  /** Retry throughout installation/reload; retain drafts until a verified save. */
  async refreshService() {
    const [state, choices] = await Promise.allSettled([
      fetchPetState(),
      this.loaded ? Promise.resolve(void 0) : fetchPetChoices()
    ]);
    if (this.disposed) return;
    if (choices.status === "fulfilled" && choices.value) {
      const list = choices.value;
      this.petChoices.splice(0, this.petChoices.length, ...list.map((choice) => choice.id));
      for (const choice of list) this.petLabels.set(choice.id, choice.displayName);
      this.loaded = true;
    }
    if (state.status === "fulfilled") {
      this.selectedPetId = state.value.petId;
      this.selectedVisible = state.value.visible;
      this.serviceStatus = choices.status === "rejected" ? petServiceFailure(choices.reason) : "ready";
    } else {
      this.serviceStatus = petServiceFailure(state.reason);
    }
    this.store.set(this.projection());
    this.pendingTimer = window.setTimeout(() => {
      this.pendingTimer = void 0;
      if (!this.disposed) void this.refreshService();
    }, 3e3);
  }
  fallback() {
    const shell = this.form.shell();
    return shell.available && !shell.exposed && this.selectedPetId !== void 0;
  }
  /**
   * The visibility the fallback switch renders: the staged draft when the user
   * moved it, the persisted value otherwise. There is no user layer to override
   * here, so the field is never marked overridden.
   */
  fallbackVisible() {
    const value = this.stagedVisible ?? this.selectedVisible;
    return { text: value === void 0 ? "" : String(value), overridden: false, invalid: false };
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
    if (this.savingPet || this.serviceStatus !== "ready" || !this.loaded || this.disposed) return;
    if (petId === void 0 && visible === void 0) return;
    if (petId !== void 0 && !this.petChoices.includes(petId)) return;
    this.savingPet = true;
    this.petSaveFailed = false;
    this.store.set(this.projection());
    try {
      if (petId !== void 0) {
        const response = await fetch("/api/pet/set-pet", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ petId })
        });
        const result = await response.json();
        if (!response.ok || result.ok !== true || result.petId !== petId) {
          throw new Error("pet selection was not persisted");
        }
      }
      if (visible !== void 0) {
        const response = await fetch("/api/pet/set-visible", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ visible })
        });
        if (!response.ok) throw new Error("pet visibility was not persisted");
      }
      const persisted = await fetchPetState();
      if (petId !== void 0 && persisted.petId !== petId) throw new Error("pet selection was not persisted");
      if (visible !== void 0 && persisted.visible !== visible) throw new Error("pet visibility was not persisted");
      this.selectedPetId = persisted.petId;
      this.selectedVisible = persisted.visible;
      if (this.stagedPetId === petId) this.stagedPetId = void 0;
      if (this.stagedVisible === visible) this.stagedVisible = void 0;
    } catch {
      this.petSaveFailed = true;
    } finally {
      this.savingPet = false;
      if (!this.disposed) this.store.set(this.projection());
    }
  }
  projection() {
    const fallback = this.fallback();
    const shell = this.form.shell();
    const configuredPet = this.form.field("petId");
    return {
      ...shell,
      ...fallback ? {
        exposed: true,
        writable: this.serviceStatus === "ready" && this.loaded,
        dirty: this.stagedPetId !== void 0 && this.stagedPetId !== this.selectedPetId || this.stagedVisible !== void 0 && this.stagedVisible !== this.selectedVisible,
        invalid: this.serviceStatus !== "ready" || !this.loaded || this.stagedPetId !== void 0 && !this.petChoices.includes(this.stagedPetId),
        saving: this.savingPet,
        failed: this.petSaveFailed,
        failedReason: void 0
      } : {},
      petSelectionFallback: fallback,
      serviceStatus: this.serviceStatus,
      enabled: this.form.field("enabled"),
      decorationEnabled: this.form.field("decorationEnabled"),
      visible: fallback ? this.fallbackVisible() : this.form.field("visible"),
      size: this.form.field("size"),
      right: this.form.field("right"),
      bottom: this.form.field("bottom"),
      bubbleScale: this.form.field("bubbleScale"),
      petId: fallback ? { text: this.stagedPetId ?? this.selectedPetId ?? "", overridden: false, invalid: this.stagedPetId !== void 0 && !this.petChoices.includes(this.stagedPetId) } : configuredPet.text === "" && this.selectedPetId !== void 0 ? { ...configuredPet, text: this.selectedPetId } : configuredPet,
      petChoices: this.petChoices.map((id) => ({ value: id, label: this.petLabels.get(id) ?? id }))
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
        if (!this.fallback()) return actions.edit(field, value);
        if (field === "petId") this.stagedPetId = value === "" ? void 0 : value;
        else if (field === "visible") this.stagedVisible = value === "" ? void 0 : value === "true";
        else return;
        this.petSaveFailed = false;
        this.store.set(this.projection());
      },
      resetField: (field) => {
        if (!this.fallback()) return actions.resetField(field);
        if (field === "petId") this.stagedPetId = void 0;
        else if (field === "visible") this.stagedVisible = void 0;
        else return;
        this.petSaveFailed = false;
        this.store.set(this.projection());
      },
      save: () => {
        if (this.fallback()) void this.saveFallback();
        else actions.save();
      },
      discard: () => {
        if (!this.fallback()) return actions.discard();
        this.stagedPetId = void 0;
        this.stagedVisible = void 0;
        this.petSaveFailed = false;
        this.store.set(this.projection());
      }
    };
  }
  /**
   * Release the card's scope subscription, bound stores and pending load
   * timers; the slot disposer calls this on teardown.
   */
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    if (this.pendingTimer !== void 0) {
      window.clearTimeout(this.pendingTimer);
      this.pendingTimer = void 0;
    }
    this.form.dispose();
  }
};
function PetSettingsCard(props) {
  const { t: t2 } = props;
  const state = props.usePetSettingsCard((snapshot) => snapshot);
  const disabled = !state.writable;
  const serviceNotice = t2(state.serviceStatus === "authorization" ? "settings.serviceAuthorization" : state.serviceStatus === "loading" ? "settings.serviceLoading" : "settings.serviceUnavailable");
  const fieldProps = {
    overriddenLabel: t2("settings.overridden"),
    resetLabel: t2("settings.reset"),
    invalidLabel: t2("settings.invalidNumber"),
    disabled
  };
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)(
    PluginSettingsCard,
    {
      t: (key, params) => key === "settings.notExposed" || key === "settings.readOnly" && state.petSelectionFallback && state.serviceStatus !== "ready" ? serviceNotice : t2(key, params),
      titleKey: "settings.title",
      descriptionKey: "settings.description",
      descriptionNode: state.petSelectionFallback ? t2("settings.petHint") : void 0,
      state,
      onSave: props.save,
      onDiscard: props.discard,
      alwaysOpen: true,
      children: [
        state.invalid && (!state.petSelectionFallback || state.serviceStatus === "ready") && /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("p", { role: "status", style: { color: "#c58b2a", lineHeight: 1.6 }, children: t2("settings.invalidDraft") }),
        state.petSelectionFallback ? null : /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
          BooleanField,
          {
            id: "settings-pet-enabled",
            label: t2("settings.enabled"),
            hint: t2("settings.enabledHint"),
            inheritLabel: t2("settings.inherit"),
            onLabel: t2("settings.on"),
            offLabel: t2("settings.off"),
            ...fieldProps,
            ...state.enabled,
            onEdit: (text) => {
              props.edit("enabled", text);
            },
            onReset: () => {
              props.resetField("enabled");
            }
          }
        ),
        state.petSelectionFallback ? null : /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
          BooleanField,
          {
            id: "settings-pet-decoration",
            label: t2("settings.decoration"),
            hint: t2("settings.decorationHint"),
            inheritLabel: t2("settings.inherit"),
            onLabel: t2("settings.on"),
            offLabel: t2("settings.off"),
            ...fieldProps,
            ...state.decorationEnabled,
            onEdit: (text) => {
              props.edit("decorationEnabled", text);
            },
            onReset: () => {
              props.resetField("decorationEnabled");
            }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
          ChoiceField,
          {
            id: "settings-pet-pet",
            label: t2("settings.pet"),
            hint: t2("settings.petHint"),
            inheritLabel: t2("settings.inherit"),
            ...fieldProps,
            ...state.petId,
            choices: state.petChoices,
            disabled: disabled || state.petChoices.length === 1,
            onEdit: (text) => {
              props.edit("petId", text);
            },
            onReset: () => {
              props.resetField("petId");
            }
          }
        ),
        /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
          BooleanField,
          {
            id: "settings-pet-visible",
            label: t2("settings.visible"),
            hint: t2("settings.visibleHint"),
            inheritLabel: t2("settings.inherit"),
            onLabel: t2("settings.on"),
            offLabel: t2("settings.off"),
            ...fieldProps,
            ...state.visible,
            onEdit: (text) => {
              props.edit("visible", text);
            },
            onReset: () => {
              props.resetField("visible");
            }
          }
        ),
        state.petSelectionFallback ? null : /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
          ValueField,
          {
            id: "settings-pet-size",
            label: t2("settings.size"),
            hint: t2("settings.sizeHint"),
            numeric: true,
            ...fieldProps,
            ...state.size,
            invalidLabel: t2("settings.invalidSize"),
            onEdit: (text) => {
              props.edit("size", text);
            },
            onReset: () => {
              props.resetField("size");
            }
          }
        ),
        state.petSelectionFallback ? null : /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
          ValueField,
          {
            id: "settings-pet-right",
            label: t2("settings.right"),
            hint: t2("settings.rightHint"),
            numeric: true,
            ...fieldProps,
            ...state.right,
            invalidLabel: t2("settings.invalidInset"),
            onEdit: (text) => {
              props.edit("right", text);
            },
            onReset: () => {
              props.resetField("right");
            }
          }
        ),
        state.petSelectionFallback ? null : /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
          ValueField,
          {
            id: "settings-pet-bottom",
            label: t2("settings.bottom"),
            hint: t2("settings.bottomHint"),
            numeric: true,
            ...fieldProps,
            ...state.bottom,
            invalidLabel: t2("settings.invalidInset"),
            onEdit: (text) => {
              props.edit("bottom", text);
            },
            onReset: () => {
              props.resetField("bottom");
            }
          }
        ),
        state.petSelectionFallback ? null : /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(
          ValueField,
          {
            id: "settings-pet-bubble-scale",
            label: t2("settings.bubbleScale"),
            hint: t2("settings.bubbleScaleHint"),
            numeric: true,
            ...fieldProps,
            ...state.bubbleScale,
            invalidLabel: t2("settings.invalidBubbleScale"),
            onEdit: (text) => {
              props.edit("bubbleScale", text);
            },
            onReset: () => {
              props.resetField("bubbleScale");
            }
          }
        )
      ]
    }
  );
}
function PetSettingsSection(props) {
  const { t: t2, usePetSettingsCard, save, discard, edit, resetField } = props;
  return /* @__PURE__ */ (0, import_jsx_runtime10.jsxs)("ul", { className: settings_section_default.sectionList, children: [
    /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(PetSettingsCard, { t: t2, usePetSettingsCard, save, discard, edit, resetField }),
    /* @__PURE__ */ (0, import_jsx_runtime10.jsx)("li", { style: { listStyle: "none" }, children: /* @__PURE__ */ (0, import_jsx_runtime10.jsx)(PlaybackSettings, {}) })
  ] });
}

// src/client/main-session.ts
function mainViewSessionId(byId) {
  if (byId === void 0 || byId === null) return void 0;
  for (const row of Object.values(byId)) {
    if (row !== void 0 && (row.retainedBy?.mainView ?? 0) > 0) return row.id;
  }
  return void 0;
}

// src/contracts/renderer.ts
var PET_RENDERER_API_VERSION = "x-org.linxin666.pet-center/v1alpha1";

// src/client/renderers/frames2d.ts
var WATCHDOG_MS = 1200;
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function validateFrames2dConfig(config) {
  if (!isRecord(config) || !isRecord(config.tracks) || !isRecord(config.phases)) {
    throw new Error("frames2d config requires tracks and phases objects");
  }
  const tracks = {};
  for (const [name, raw] of Object.entries(config.tracks)) {
    if (!isRecord(raw) || !Array.isArray(raw.frames) || raw.frames.length === 0 || raw.frames.some((f) => typeof f !== "string" || f === "") || !Array.isArray(raw.durations) || raw.durations.length !== raw.frames.length || raw.durations.some((d) => typeof d !== "number" || !(d > 0))) {
      throw new Error("frames2d track " + JSON.stringify(name) + " needs same-length frames/durations");
    }
    tracks[name] = {
      frames: raw.frames,
      durations: raw.durations,
      loop: raw.loop !== false,
      ...typeof raw.fallback === "string" ? { fallback: raw.fallback } : {}
    };
  }
  const phases = config.phases;
  if (typeof phases.idle !== "string" || tracks[phases.idle] === void 0) {
    throw new Error("frames2d phases.idle must name an existing track");
  }
  let skins;
  if (Array.isArray(config.skins)) {
    const resolved = [];
    for (const skin of config.skins) {
      if (!isRecord(skin) || typeof skin.id !== "string" || typeof skin.label !== "string" || typeof skin.idleTrack !== "string" || skin.idleTrack === "") continue;
      const target = tracks[skin.idleTrack];
      if (target === void 0 || !target.loop) continue;
      let clickActions;
      if (Array.isArray(skin.clickActions)) {
        const kept = [];
        for (const action of skin.clickActions) {
          if (!isRecord(action) || typeof action.track !== "string" || action.track === "" || typeof action.probability !== "number" || !(action.probability > 0) || action.probability > 1) continue;
          if (tracks[action.track] === void 0) continue;
          kept.push({
            track: action.track,
            probability: action.probability,
            ...Array.isArray(action.phrases) ? { phrases: action.phrases } : {}
          });
        }
        if (kept.length > 0) clickActions = kept;
      }
      let gameplayTracks;
      if (isRecord(skin.gameplayTracks)) {
        const kept = {};
        for (const [state, trackName] of Object.entries(skin.gameplayTracks)) {
          if (typeof trackName !== "string" || trackName === "" || tracks[trackName] === void 0) continue;
          kept[state] = trackName;
        }
        if (Object.keys(kept).length > 0) gameplayTracks = kept;
      }
      resolved.push({
        id: skin.id,
        label: skin.label,
        idleTrack: skin.idleTrack,
        ...clickActions === void 0 ? {} : { clickActions },
        ...gameplayTracks === void 0 ? {} : { gameplayTracks }
      });
    }
    if (resolved.length > 0) skins = resolved;
  }
  const frameDensity = Number.isInteger(config.frameDensity) && config.frameDensity >= 1 && config.frameDensity <= 4 ? config.frameDensity : 1;
  return { tracks, frameDensity, phases, ...skins === void 0 ? {} : { skins } };
}
var frames2dRenderer = {
  id: "frames2d",
  apiVersion: PET_RENDERER_API_VERSION,
  validateConfig: validateFrames2dConfig,
  mount(ctx, config) {
    const reducedMotion = typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let canvas = null;
    let context2d = null;
    let img = null;
    try {
      if (typeof createImageBitmap === "function" && typeof fetch === "function") {
        const probe = document.createElement("canvas");
        const c2d = probe.getContext("2d");
        if (c2d !== null) {
          canvas = probe;
          context2d = c2d;
        }
      }
    } catch {
      canvas = null;
      context2d = null;
    }
    if (canvas !== null && context2d !== null) {
      canvas.dataset.dshPetFrames2d = ctx.petId;
      canvas.draggable = false;
      canvas.style.width = "100%";
      canvas.style.height = "100%";
      canvas.style.objectFit = "contain";
      canvas.style.pointerEvents = "none";
      ctx.container.appendChild(canvas);
    } else {
      img = document.createElement("img");
      img.dataset.dshPetFrames2d = ctx.petId;
      img.alt = "";
      img.draggable = false;
      img.style.width = "100%";
      img.style.height = "100%";
      img.style.objectFit = "contain";
      img.style.pointerEvents = "none";
      ctx.container.appendChild(img);
    }
    const decoding = /* @__PURE__ */ new Map();
    const decodedAll = [];
    const FRAME_POOL_LIMIT = 8;
    const frameQueue = [];
    let activeFrames = 0;
    const decodeFrame = async (url) => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("http " + response.status);
        const bitmap = await createImageBitmap(await response.blob());
        return { source: bitmap, width: bitmap.width, height: bitmap.height };
      } catch {
        return await new Promise((resolve) => {
          try {
            const pre = new Image();
            pre.onload = () => {
              resolve(pre.naturalWidth > 0 ? { source: pre, width: pre.naturalWidth, height: pre.naturalHeight } : void 0);
            };
            pre.onerror = () => resolve(void 0);
            pre.src = url;
          } catch {
            resolve(void 0);
          }
        });
      }
    };
    const pumpFrames = () => {
      while (activeFrames < FRAME_POOL_LIMIT && frameQueue.length > 0) {
        const queued = frameQueue.shift();
        activeFrames += 1;
        queued.release();
      }
    };
    const loadFrame = (url, jump = false) => {
      if (jump) {
        const index = frameQueue.findIndex((queued) => queued.url === url);
        if (index > 0) frameQueue.unshift(frameQueue.splice(index, 1)[0]);
      }
      const cached = decoding.get(url);
      if (cached !== void 0) return cached;
      let release;
      const gate = new Promise((resolve) => {
        release = resolve;
      });
      const job = gate.then(() => disposed ? void 0 : decodeFrame(url));
      job.then(
        (frame) => {
          if (frame === void 0) decoding.delete(url);
        },
        () => decoding.delete(url)
      );
      void job.finally(() => {
        activeFrames -= 1;
        pumpFrames();
      });
      decoding.set(url, job);
      decodedAll.push(job.then(() => void 0, () => void 0));
      const entry = { url, release };
      if (jump) frameQueue.unshift(entry);
      else frameQueue.push(entry);
      pumpFrames();
      return job;
    };
    const PREFETCH_AHEAD = 12;
    const prefetchAhead = (trackId, index) => {
      const def = config.tracks[trackId];
      if (def === void 0) return;
      const end = Math.min(def.frames.length, index + 1 + PREFETCH_AHEAD);
      for (let ahead = index + 1; ahead < end; ahead += 1) {
        const url = def.frames[ahead];
        if (url !== void 0) void loadFrame(url);
      }
    };
    let disposed = false;
    let timer;
    let watchdog;
    let track = config.phases.idle;
    let frameIndex = 0;
    let lastAdvance = Date.now();
    let override;
    let activityTrack;
    let playbackFps;
    let runningLimit = 0;
    let otherActionFps = 0;
    let baseIdle = config.phases.idle;
    let drawToken = 0;
    let lastDrawnUrl;
    const trackForPhase = (phase) => {
      const mapped = config.phases[phase];
      if (mapped === void 0) return baseIdle;
      const target = mapped === config.phases.idle ? baseIdle : mapped;
      return config.tracks[target] !== void 0 ? target : baseIdle;
    };
    const activityTarget = () => activityTrack === void 0 ? trackForPhase(ctx.phase.get()) : activityTrack === config.phases.idle ? baseIdle : activityTrack;
    const frameDuration = () => playbackFrameDuration(track, config.tracks[track]?.durations[frameIndex] ?? 200, playbackFps, runningLimit, otherActionFps);
    const paintCanvas = (url) => {
      if (context2d === null || canvas === null) return;
      const myToken = ++drawToken;
      void loadFrame(url, true).then((frame) => {
        if (disposed || frame === void 0 || myToken !== drawToken) return;
        if (lastDrawnUrl === url) return;
        lastDrawnUrl = url;
        if (canvas.width !== frame.width || canvas.height !== frame.height) {
          canvas.width = frame.width;
          canvas.height = frame.height;
        } else {
          context2d.clearRect(0, 0, canvas.width, canvas.height);
        }
        context2d.drawImage(frame.source, 0, 0);
      }).catch(() => {
      });
    };
    const show = (trackId, index) => {
      const def = config.tracks[trackId];
      const url = def?.frames[index];
      if (url === void 0) return;
      const element = canvas ?? img;
      if (element !== null && element.dataset.dshPetTrack !== trackId) element.dataset.dshPetTrack = trackId;
      prefetchAhead(trackId, index);
      if (img !== null) {
        if (img.getAttribute("src") !== url) img.src = url;
        return;
      }
      paintCanvas(url);
    };
    const schedule = (ms) => {
      if (disposed) return;
      timer = setTimeout(tick, ms);
    };
    function tick() {
      if (disposed) return;
      const def = config.tracks[track];
      if (def === void 0 || def.frames.length === 0) return;
      const now = Date.now();
      let remaining = Math.max(0, now - lastAdvance);
      if (def.loop) {
        const cycle = def.durations.reduce((sum, ms) => sum + playbackFrameDuration(track, ms, playbackFps, runningLimit, otherActionFps), 0);
        remaining %= cycle;
      }
      let completed = false;
      while (remaining >= frameDuration()) {
        remaining -= frameDuration();
        if (frameIndex + 1 < def.frames.length) frameIndex++;
        else if (def.loop) frameIndex = 0;
        else {
          completed = true;
          break;
        }
      }
      if (!completed) {
        lastAdvance = now - remaining;
        show(track, frameIndex);
        schedule(Math.max(1, frameDuration() - remaining));
        return;
      }
      const target = def.fallback !== void 0 && config.tracks[def.fallback] !== void 0 ? def.fallback === config.phases.idle ? baseIdle : def.fallback : baseIdle;
      if (activityTrack !== void 0 && override !== void 0 && target === baseIdle) {
        override = void 0;
        play(activityTarget());
        return;
      }
      if (target === activityTarget()) override = void 0;
      play(target);
    }
    function play(trackId) {
      if (disposed) return;
      if (config.tracks[trackId] === void 0) trackId = baseIdle;
      if (timer !== void 0) clearTimeout(timer);
      track = trackId;
      frameIndex = 0;
      lastAdvance = Date.now();
      show(track, frameIndex);
      if (reducedMotion) return;
      const def = config.tracks[track];
      schedule(frameDuration());
    }
    const unsubscribe = ctx.phase.subscribe((phase) => {
      if (override !== void 0) return;
      const target = activityTrack === void 0 ? trackForPhase(phase) : activityTarget();
      if (target !== track) play(target);
    });
    if (!reducedMotion) {
      watchdog = setInterval(() => {
        if (disposed) return;
        const def = config.tracks[track];
        if (def === void 0 || !def.loop) return;
        const expected = frameDuration() + WATCHDOG_MS;
        if (Date.now() - lastAdvance > expected) tick();
      }, WATCHDOG_MS);
    }
    play(track);
    let disposedOnce = false;
    const dispose = () => {
      if (disposedOnce) return;
      disposedOnce = true;
      disposed = true;
      unsubscribe();
      if (timer !== void 0) clearTimeout(timer);
      if (watchdog !== void 0) clearInterval(watchdog);
      for (const queued of frameQueue.splice(0)) queued.release();
      void Promise.allSettled(decodedAll).then(() => {
        for (const job of decoding.values()) {
          void job.then((frame) => {
            try {
              const maybeClose = frame?.source?.close;
              if (typeof maybeClose === "function" && frame !== void 0) maybeClose.call(frame.source);
            } catch {
            }
          }).catch(() => {
          });
        }
        decoding.clear();
      });
      canvas?.remove();
      img?.remove();
    };
    ctx.onCleanup(dispose);
    return {
      dispose,
      setState(next) {
        if (disposed) return;
        if (next === void 0) {
          override = void 0;
          const target = activityTarget();
          if (target !== track) play(target);
          return;
        }
        if (config.tracks[next] === void 0) return;
        override = next;
        if (next !== track) play(next);
      },
      setIdleTrack(next) {
        if (disposed) return;
        if (next === void 0 || config.tracks[next] !== void 0 && config.tracks[next].loop) {
          baseIdle = next ?? config.phases.idle;
        }
        if (override === void 0) {
          const target = activityTarget();
          if (target !== track) play(target);
        }
      },
      setActivityTrack(next) {
        if (disposed || next !== void 0 && config.tracks[next] === void 0) return;
        if (activityTrack === next) return;
        activityTrack = next;
        if (override === void 0) {
          const target = activityTarget();
          if (target !== track) play(target);
        }
      },
      setPlaybackFps(next, runLimit = 0, actionFps = 0) {
        if (disposed) return;
        const value = next === void 0 ? void 0 : animationFps(next);
        const limit = optionalFps(runLimit), actions = optionalFps(actionFps);
        if (playbackFps === value && runningLimit === limit && otherActionFps === actions) return;
        const previous = frameDuration();
        const progress = Math.min(1, Math.max(0, (Date.now() - lastAdvance) / previous));
        playbackFps = value;
        runningLimit = limit;
        otherActionFps = actions;
        if (reducedMotion) return;
        if (timer !== void 0) clearTimeout(timer);
        const duration = frameDuration();
        lastAdvance = Date.now() - progress * duration;
        schedule(Math.max(1, (1 - progress) * duration));
      },
      currentTrack() {
        return track;
      }
    };
  }
};

// src/client/index.ts
async function petFetch(path, body) {
  const response = await fetch(path, body === void 0 ? {} : {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error("pet " + path + " failed: " + response.status);
  }
  return await response.json();
}
var petApi = {
  state: (currentSessionId) => petFetch("/api/pet/state?current=" + encodeURIComponent(currentSessionId ?? "")),
  markSessionViewed: (sessionId, revision) => petFetch("/api/pet/session-viewed", { sessionId, revision }),
  pets: () => petFetch("/api/pet/pets"),
  interact: (kind) => petFetch("/api/pet/interact", { kind }),
  setVisible: (visible) => petFetch("/api/pet/set-visible", { visible }),
  setConfig: (patch) => petFetch("/api/pet/set-config", patch),
  setName: (name) => petFetch("/api/pet/set-name", { name }),
  setPet: (petId) => petFetch("/api/pet/set-pet", { petId }),
  setSkin: (skin) => petFetch("/api/pet/set-skin", skin === void 0 ? {} : { skin }),
  gameplayTouch: (zone) => petFetch("/api/pet/gameplay/touch", zone === void 0 ? {} : { zone }),
  gameplaySetMode: (mode) => petFetch("/api/pet/gameplay/mode", { mode }),
  gameplayWorkTick: () => petFetch("/api/pet/gameplay/work-tick", {}),
  gameplayBuy: (item) => petFetch("/api/pet/gameplay/buy", { item })
};
var POLL_MS = 1e3;
var PET_SETTINGS_NS = "pet";
var inject = ["slots", "locale", "connection", "configForms", "remote", "sessions", "uiWorkspace"];
var AGGREGATE_ENTRY_ID = "web-ui-pet";
var PET_ENTRY_IDS = [AGGREGATE_ENTRY_ID, "ui-pet", PET_SETTINGS_NS];
function servedEntryId(forms) {
  let served;
  try {
    served = forms.describe().getSnapshot().view?.namespaces.map((view) => view.ns);
  } catch {
    served = void 0;
  }
  if (!served || served.length === 0) return PET_SETTINGS_NS;
  return PET_ENTRY_IDS.find((id) => served.includes(id)) ?? PET_SETTINGS_NS;
}
function petSettingsForm(ctx) {
  const binder = ctx.get("webUiSettings");
  if (binder !== void 0 && typeof binder.bind === "function") {
    return binder.bind({ namespace: PET_SETTINGS_NS });
  }
  return ctx.configForms.get(servedEntryId(ctx.configForms));
}
var workTickGate = createWorkTickGate();
function activeWorkTickMs(store) {
  const state = store.getSnapshot();
  const definition = state.pets.find((entry) => entry.id === state.snapshot?.pet.id);
  return definition?.gameplay?.work?.tickMs;
}
function apply(ctx) {
  ctx.effect(() => {
    try {
      return ctx.locale.register(NS, { zh, en });
    } catch {
      return () => {
      };
    }
  }, "pet: dictionaries");
  defaultPetRendererRegistry.register(frames2dRenderer);
  const settingsForm = petSettingsForm(ctx);
  const enabled = () => {
    const snapshot = settingsForm.getSnapshot();
    return snapshot.status === "ready" ? snapshot.value?.enabled ?? true : snapshot.status === "unavailable";
  };
  const petSettings = new PetSettingsCardController(settingsForm);
  ctx.slots.inject("settings.section", () => {
    try {
      const unregister = ctx.slots.register({
        name: "settings.section",
        id: "pet",
        order: 130,
        label: () => ctx.locale.bind("pet")("settings.title"),
        locale: "pet",
        inject: () => petSettings.inject()
      }, PetSettingsSection);
      return () => {
        unregister();
        petSettings.dispose();
      };
    } catch {
      return () => {
      };
    }
  });
  let disposeUi;
  let clearUiTeardown;
  let uiDead = false;
  let nativeBridge;
  const killUi = () => {
    if (uiDead) return;
    uiDead = true;
    void nativeBridge?.configure({ enabled: false }).catch(() => {
    });
    clearUiTeardown?.();
    clearUiTeardown = void 0;
    disposeUi?.();
    disposeUi = void 0;
  };
  const syncUi = () => {
    if (!uiDead && enabled() && disposeUi === void 0) {
      const petStore = createPetStore().create();
      const setSnapshot = petStore.actions.setSnapshot;
      const setPets = petStore.actions.setPets;
      const setState = petStore.actions.setState;
      const setFeedback = petStore.actions.setFeedback;
      const setDesktopActive = petStore.actions.setDesktopActive;
      setDesktopActive(false);
      const sessions = ctx.sessions;
      const currentSessionId = () => mainViewSessionId(sessions.list.getSnapshot().byId);
      let petsLoaded = false;
      let petsLoading = false;
      let polling = false;
      let pollAgain = false;
      let nativeOptionsKey;
      let nativeRequestSeq = 0;
      let uiGone = false;
      let viewedInFlight = false;
      let acknowledgedView;
      let stateSeq = 0;
      let navigationRevision = 0;
      const pollNow = () => {
        if (uiGone) return;
        if (polling) {
          pollAgain = true;
          return;
        }
        polling = true;
        if (!petsLoaded && !petsLoading) {
          petsLoading = true;
          petApi.pets().then((list) => {
            petsLoaded = true;
            setPets(list);
          }, () => {
          }).finally(() => {
            petsLoading = false;
          });
        }
        const seq = stateSeq + 1;
        stateSeq = seq;
        const requestedSessionId = currentSessionId();
        const stateRequest = petApi.state(requestedSessionId);
        stateRequest.then((snapshot) => {
          if (uiGone || seq !== stateSeq || requestedSessionId !== currentSessionId()) return;
          const publishNativeState = (active) => {
            if (uiGone) return;
            setDesktopActive(active);
            container.style.display = active ? "none" : "";
          };
          const nativeOptions = {
            enabled: snapshot.display.desktopEnabled !== false && snapshot.display.visible,
            currentSessionId: requestedSessionId ?? ""
          };
          nativeBridge = desktopConnection(snapshot.desktop);
          if (snapshot.desktop?.supported) publishNativeState(snapshot.desktop.active);
          const pending = snapshot.desktop?.pendingOpen;
          if (pending && pending.revision !== navigationRevision) {
            navigationRevision = pending.revision;
            window.dispatchEvent(new CustomEvent("dsh-pet-open-session", { detail: pending.sessionId }));
            void desktopRequest("ack-open", { revision: pending.revision }).catch(() => {
              navigationRevision = 0;
            });
          }
          const key = JSON.stringify(nativeOptions);
          if (key !== nativeOptionsKey && nativeBridge) {
            nativeOptionsKey = key;
            const nativeSeq = ++nativeRequestSeq;
            if (nativeOptions.enabled && !snapshot.desktop?.supported) publishNativeState(true);
            void nativeBridge.configure(nativeOptions).then((result) => {
              if (uiGone || nativeSeq !== nativeRequestSeq) return;
              publishNativeState(result.active);
              if (nativeOptions.enabled && !result.active && !snapshot.desktop?.supported) nativeOptionsKey = void 0;
            }).catch(() => {
              if (uiGone || nativeSeq !== nativeRequestSeq) return;
              nativeOptionsKey = void 0;
              publishNativeState(false);
            });
          }
          setSnapshot(snapshot);
          if (requestedSessionId && snapshot.awaitingView !== void 0 && document.visibilityState === "visible" && document.hasFocus()) {
            const viewKey = JSON.stringify([requestedSessionId, snapshot.awaitingView]);
            if (!viewedInFlight && acknowledgedView !== viewKey) {
              viewedInFlight = true;
              void petApi.markSessionViewed(requestedSessionId, snapshot.awaitingView).then(() => {
                acknowledgedView = viewKey;
              }, () => {
              }).finally(() => {
                viewedInFlight = false;
              });
            }
          }
        }, () => {
          if (seq !== stateSeq) return;
          setState("error", "pet.state transport error");
        }).finally(() => {
          polling = false;
          if (pollAgain && !uiGone) {
            pollAgain = false;
            pollNow();
          }
        });
      };
      const disposePoll = ctx.effect(() => {
        let timer;
        const stop = () => {
          if (timer !== void 0) {
            window.clearInterval(timer);
            timer = void 0;
          }
        };
        const start = () => {
          if (timer === void 0 && document.visibilityState === "visible") {
            timer = window.setInterval(pollNow, POLL_MS);
          }
        };
        const onVisibility = () => {
          if (document.visibilityState === "visible") {
            pollNow();
            start();
          } else {
            stop();
          }
        };
        start();
        document.addEventListener("visibilitychange", onVisibility);
        window.addEventListener("focus", onVisibility);
        return () => {
          stop();
          document.removeEventListener("visibilitychange", onVisibility);
          window.removeEventListener("focus", onVisibility);
        };
      }, "pet: poll");
      const disposeSessionWatch = ctx.effect(() => {
        let observedSessionId = currentSessionId();
        const unsubscribe = sessions.list.subscribe(() => {
          const nextId = currentSessionId();
          if (nextId === observedSessionId) return;
          observedSessionId = nextId;
          stateSeq++;
          if (document.visibilityState === "visible") pollNow();
        });
        return unsubscribe;
      }, "pet: current-session watch");
      const openSession = (sessionId) => {
        const list = sessions.list.getSnapshot();
        if (list.byId[sessionId] === void 0) return;
        ctx.uiWorkspace.openSession(sessionId);
      };
      const nativeOpenSession = (event) => {
        const id = event.detail;
        if (typeof id === "string") openSession(id);
      };
      ctx.effect(() => {
        window.addEventListener("dsh-pet-open-session", nativeOpenSession);
        return () => window.removeEventListener("dsh-pet-open-session", nativeOpenSession);
      }, "pet: native session navigation");
      const injected = () => ({
        store: petStore,
        ensure: pollNow,
        openSession,
        pet: () => {
          petApi.interact("pet").then((result) => {
            setFeedback({
              text: result.reaction,
              kind: result.delta > 0 ? "pet" : "none",
              at: Date.now()
            });
          }, () => {
          });
        },
        feed: () => {
          petApi.interact("feed").then((result) => {
            setFeedback({
              text: result.reaction,
              kind: "feed",
              at: Date.now()
            });
          }, () => {
          });
        },
        hide: () => {
          petApi.setVisible(false).then(() => {
            pollNow();
          }, () => {
          });
        },
        summon: () => {
          petApi.setVisible(true).then(() => {
            pollNow();
          }, () => {
          });
        },
        dragEnd: (right, bottom) => {
          petApi.setConfig({ right, bottom }).then(() => {
            pollNow();
          }, () => {
          });
        },
        rename: (name) => {
          petApi.setName(name).then((result) => {
            if (result.ok) pollNow();
          }, () => {
          });
        },
        feedbackDone: () => {
          setFeedback(null);
        },
        gameplay: {
          touch: (zone) => petApi.gameplayTouch(zone),
          setSkin: (skin) => petApi.setSkin(skin).then((result) => {
            if (result.ok) pollNow();
            return result;
          }, () => ({ ok: false, error: "transport" })),
          setMode: async (mode) => {
            if (mode === "work") workTickGate.reset();
            return petApi.gameplaySetMode(mode);
          },
          workTick: async () => {
            if (!workTickGate.allow(activeWorkTickMs(petStore))) {
              return { ok: true };
            }
            return petApi.gameplayWorkTick();
          },
          buy: (item) => petApi.gameplayBuy(item)
        }
      });
      takeoverPetUiTeardown();
      for (const stale of Array.from(document.querySelectorAll("div[data-dsh-pet-root]"))) {
        stale.remove();
      }
      const container = document.createElement("div");
      container.dataset.dshPetRoot = "";
      container.dataset.dshPlugin = "pet";
      if (petStore.getSnapshot().desktopActive) container.style.display = "none";
      document.body.appendChild(container);
      const petRoot = (0, import_client.createRoot)(container);
      petRoot.render((0, import_react10.createElement)(PetGroupEntry, { ...injected(), t, portalTarget: container }));
      disposeUi = () => {
        if (uiGone) return;
        uiGone = true;
        stateSeq += 1;
        clearUiTeardown?.();
        clearUiTeardown = void 0;
        petRoot.unmount();
        container.remove();
        disposePoll();
        disposeSessionWatch();
        disposeUi = void 0;
      };
      clearUiTeardown = registerPetUiTeardown(() => {
        uiDead = true;
        disposeUi?.();
      });
      pollNow();
    } else if (!uiDead && !enabled() && disposeUi !== void 0) {
      void nativeBridge?.configure({ enabled: false }).catch(() => {
      });
      disposeUi();
      disposeUi = void 0;
    }
  };
  const unsubscribeSettings = settingsForm.subscribe(syncUi);
  ctx.effect(
    () => () => {
      unsubscribeSettings();
      killUi();
    },
    "pet: client lifecycle"
  );
  syncUi();
}

if(typeof document!=="undefined"){let tag=document.querySelector('style[data-dsh-pet-local]');if(!tag){tag=document.createElement('style');tag.dataset.dshPetLocal='';document.head.appendChild(tag)}tag.textContent="/* src/client/pet.module.css */\n.pet_float {\n  position: fixed;\n  pointer-events: auto;\n  user-select: none;\n  -webkit-user-select: none;\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  will-change: transform;\n  contain: layout style;\n}\n.pet_sprite {\n  image-rendering: auto;\n  touch-action: none;\n  contain: paint;\n}\n.pet_spriteWrap {\n  position: relative;\n  flex: 0 0 auto;\n}\n.pet_bubble {\n  position: absolute;\n  bottom: 100%;\n  margin-bottom: 6px;\n  white-space: nowrap;\n  padding: calc(4px * var(--pet-bubble-scale, 1)) calc(10px * var(--pet-bubble-scale, 1));\n  border-radius: 999px;\n  font-size: calc(12px * var(--pet-bubble-scale, 1));\n  line-height: 1.4;\n  color: #f4f7ff;\n  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);\n  animation: pet_pet-bubble-pop 2.6s ease-out forwards;\n  pointer-events: none;\n}\n.pet_bubblePet {\n  background: rgba(77, 107, 254, 0.95);\n}\n.pet_bubbleFeed {\n  background: rgba(3, 105, 161, 0.95);\n}\n.pet_bubbleStatus {\n  max-width: min(calc(280px * var(--pet-bubble-scale, 1)), calc(100vw - 24px));\n  overflow: hidden;\n  text-overflow: ellipsis;\n  padding: calc(5px * var(--pet-bubble-scale, 1)) calc(12px * var(--pet-bubble-scale, 1));\n  background:\n    linear-gradient(\n      160deg,\n      rgba(19, 28, 54, 0.9),\n      rgba(7, 11, 26, 0.94));\n  border: 1px solid rgba(126, 152, 255, 0.45);\n  box-shadow:\n    0 4px 12px rgba(2, 6, 23, 0.35),\n    inset 0 1px 0 rgba(226, 232, 255, 0.1),\n    0 0 12px rgba(77, 107, 254, 0.18);\n  backdrop-filter: blur(8px);\n  letter-spacing: 0.02em;\n  animation: pet_pet-bubble-in 240ms ease-out;\n}\n.pet_bubbleWhisper {\n  letter-spacing: 0.03em;\n  animation: pet_pet-whisper-in 320ms cubic-bezier(0.22, 1, 0.36, 1);\n}\n.pet_bubbleWhisper::before {\n  content: \"\\300c\";\n  margin-right: 2px;\n  opacity: 0.7;\n}\n.pet_bubbleWhisper::after {\n  content: \"\\300d\";\n  margin-left: 2px;\n  opacity: 0.7;\n}\n.pet_bubbleStack {\n  position: absolute;\n  bottom: 100%;\n  display: flex;\n  flex-direction: column-reverse;\n  align-items: center;\n  gap: 4px;\n  pointer-events: auto;\n}\n.pet_bubbleAnchor {\n  position: relative;\n  display: inline-flex;\n}\n.pet_bubbleMore {\n  position: absolute;\n  top: -9px;\n  right: -10px;\n  z-index: 1;\n  min-width: 18px;\n  height: 18px;\n  padding: 0 5px;\n  border: 1px solid rgba(126, 152, 255, 0.55);\n  border-radius: 999px;\n  display: inline-flex;\n  align-items: center;\n  justify-content: center;\n  font-size: 10px;\n  font-weight: 600;\n  line-height: 1;\n  color: #eef2ff;\n  background:\n    linear-gradient(\n      160deg,\n      rgba(74, 104, 245, 0.95),\n      rgba(47, 68, 184, 0.95));\n  box-shadow: 0 2px 6px rgba(2, 6, 23, 0.4);\n  cursor: pointer;\n  transition: filter 120ms ease;\n}\n.pet_bubbleMore:hover {\n  filter: brightness(1.15);\n}\n.pet_bubbleMore:focus-visible {\n  outline: none;\n  box-shadow: 0 0 0 2px rgba(126, 152, 255, 0.9);\n}\n.pet_bubbleStack .pet_bubble {\n  position: relative;\n  bottom: auto;\n  margin-bottom: 0;\n  pointer-events: auto;\n}\n.pet_bubbleClickable {\n  cursor: pointer;\n  font: inherit;\n  text-align: center;\n  appearance: none;\n  transition: filter 120ms ease, box-shadow 120ms ease;\n}\n.pet_bubbleClickable:hover {\n  filter: brightness(1.12);\n}\n.pet_bubbleClickable:focus-visible {\n  outline: none;\n  box-shadow: 0 0 0 2px rgba(126, 152, 255, 0.9);\n}\n@keyframes pet_pet-bubble-in {\n  from {\n    opacity: 0;\n    transform: translateY(6px) scale(0.96);\n  }\n  to {\n    opacity: 1;\n    transform: translateY(0) scale(1);\n  }\n}\n@keyframes pet_pet-whisper-in {\n  0% {\n    opacity: 0;\n    transform: translateY(8px) scale(0.9);\n  }\n  60% {\n    transform: translateY(-1px) scale(1.02);\n  }\n  100% {\n    opacity: 1;\n    transform: translateY(0) scale(1);\n  }\n}\n@keyframes pet_pet-panel-in {\n  from {\n    opacity: 0;\n    transform: translateY(4px) scale(0.97);\n  }\n  to {\n    opacity: 1;\n    transform: translateY(0) scale(1);\n  }\n}\n@keyframes pet_pet-bubble-pop {\n  0% {\n    opacity: 0;\n    transform: translateY(6px) scale(0.85);\n  }\n  15% {\n    opacity: 1;\n    transform: translateY(0) scale(1.05);\n  }\n  25% {\n    transform: translateY(0) scale(1);\n  }\n  75% {\n    opacity: 1;\n  }\n  100% {\n    opacity: 0;\n    transform: translateY(-8px) scale(0.95);\n  }\n}\n.pet_panel {\n  position: absolute;\n  top: 100%;\n  margin-top: 8px;\n  background:\n    linear-gradient(\n      165deg,\n      rgba(19, 28, 54, 0.95),\n      rgba(7, 11, 26, 0.97));\n  border: 1px solid rgba(126, 152, 255, 0.3);\n  border-radius: 12px;\n  padding: 10px 12px;\n  color: #e6ebf8;\n  font-size: 12px;\n  box-shadow:\n    0 8px 24px rgba(2, 6, 23, 0.45),\n    0 0 0 1px rgba(77, 107, 254, 0.1),\n    inset 0 1px 0 rgba(226, 232, 255, 0.08);\n  backdrop-filter: blur(10px);\n  display: flex;\n  flex-direction: column;\n  gap: 7px;\n  min-width: 148px;\n  animation: pet_pet-panel-in 200ms cubic-bezier(0.22, 1, 0.36, 1);\n  transform-origin: 50% 0;\n}\n.pet_panel::after {\n  content: \"\";\n  position: absolute;\n  bottom: 100%;\n  left: 0;\n  right: 0;\n  height: 14px;\n}\n.pet_panelAbove {\n  top: auto;\n  bottom: 100%;\n  margin-top: 0;\n  margin-bottom: 8px;\n  transform-origin: 50% 100%;\n}\n.pet_panelAbove::after {\n  top: 100%;\n  bottom: auto;\n}\n.pet_rankRow {\n  display: flex;\n  justify-content: space-between;\n  gap: 10px;\n  white-space: nowrap;\n}\n.pet_nameCell {\n  font-weight: 600;\n  letter-spacing: 0.02em;\n  background:\n    linear-gradient(\n      90deg,\n      #a9c1ff,\n      #6c8bff 60%,\n      #4d6bfe);\n  -webkit-background-clip: text;\n  background-clip: text;\n  color: transparent;\n}\n.pet_statRank {\n  color: #9db4ff;\n  font-weight: 600;\n}\n.pet_statTreats {\n  color: #7dd3fc;\n  font-weight: 600;\n}\n.pet_statPoints {\n  color: #fcd34d;\n  font-weight: 600;\n}\n.pet_renameRow {\n  display: flex;\n  gap: 6px;\n  align-items: center;\n}\n.pet_nameInput {\n  flex: 1;\n  min-width: 0;\n  border: 1px solid rgba(126, 152, 255, 0.5);\n  border-radius: 6px;\n  background: rgba(19, 28, 54, 0.9);\n  color: #e6ebf8;\n  font-size: 12px;\n  padding: 3px 6px;\n  outline: none;\n}\n.pet_nameInput:focus {\n  border-color: #4d6bfe;\n  box-shadow: 0 0 0 2px rgba(77, 107, 254, 0.45);\n}\n.pet_actions {\n  display: flex;\n  gap: 6px;\n}\n.pet_action {\n  flex: 1;\n  border: none;\n  border-radius: 6px;\n  padding: 4px 8px;\n  font-size: 12px;\n  font-weight: 600;\n  cursor: pointer;\n  color: #fff;\n  background:\n    linear-gradient(\n      180deg,\n      #4a68f5,\n      #3a55e0);\n  box-shadow: 0 2px 6px rgba(77, 107, 254, 0.3);\n  transition:\n    filter 120ms ease,\n    box-shadow 120ms ease,\n    transform 120ms ease;\n}\n.pet_action:hover {\n  filter: brightness(1.08);\n  transform: translateY(-1px);\n  box-shadow: 0 4px 10px rgba(77, 107, 254, 0.4);\n}\n.pet_action:active {\n  filter: brightness(0.94);\n  transform: translateY(0);\n  box-shadow: 0 1px 4px rgba(77, 107, 254, 0.3);\n}\n.pet_action:focus-visible {\n  outline: none;\n  box-shadow: 0 0 0 2px rgba(126, 152, 255, 0.9);\n}\n.pet_summon {\n  border: 1px dashed rgba(126, 152, 255, 0.6);\n  background: rgba(7, 11, 26, 0.75);\n  color: #8ea6ff;\n  border-radius: 999px;\n  padding: 2px 10px;\n  font-size: 11px;\n  cursor: pointer;\n  transition:\n    border-color 120ms ease,\n    color 120ms ease,\n    background 120ms ease,\n    box-shadow 120ms ease;\n}\n.pet_summon:hover {\n  border-color: rgba(126, 152, 255, 0.95);\n  color: #c3d3ff;\n  background: rgba(7, 11, 26, 0.9);\n}\n.pet_summon:active {\n  color: #8ea6ff;\n  border-color: rgba(126, 152, 255, 0.8);\n}\n.pet_summon:focus-visible {\n  outline: none;\n  box-shadow: 0 0 0 2px rgba(126, 152, 255, 0.9);\n}\n@media (prefers-reduced-motion: reduce) {\n  .pet_bubble,\n  .pet_bubbleStatus,\n  .pet_bubbleWhisper,\n  .pet_panel {\n    animation: none;\n    opacity: 1;\n  }\n  .pet_action,\n  .pet_summon,\n  .pet_bubbleMore {\n    transition: none;\n  }\n}\n.pet_gameplayHud {\n  position: absolute;\n  left: 0;\n  bottom: 0;\n  width: 0;\n  height: 0;\n}\n.pet_gameplayModeChip {\n  position: absolute;\n  left: 0;\n  top: 0;\n  transform: translateY(-100%) translateY(-4px);\n  padding: 1px 8px;\n  border-radius: 999px;\n  background: rgba(126, 152, 255, 0.18);\n  color: #cdd7ff;\n  font-size: 10px;\n  white-space: nowrap;\n  pointer-events: none;\n}\n.pet_gameplayCard {\n  position: absolute;\n  left: 0;\n  bottom: 0;\n  transform: none;\n  max-height: 340px;\n  overflow-y: auto;\n  min-width: 180px;\n  padding: 10px 12px;\n  border: 1px solid rgba(126, 152, 255, 0.25);\n  border-radius: 10px;\n  background: rgba(7, 11, 26, 0.92);\n  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);\n  color: #dfe6ff;\n  font-size: 12px;\n}\n.pet_gameplayBars {\n  display: flex;\n  flex-direction: column;\n  gap: 4px;\n  margin-bottom: 8px;\n}\n.pet_gameplayBarRow {\n  display: flex;\n  align-items: center;\n  gap: 6px;\n}\n.pet_gameplayBarLabel {\n  width: 34px;\n  flex-shrink: 0;\n  color: #9aa8d8;\n}\n.pet_gameplayBarTrack {\n  flex: 1;\n  height: 6px;\n  border-radius: 3px;\n  background: rgba(126, 152, 255, 0.15);\n  overflow: hidden;\n}\n.pet_gameplayBarFill {\n  display: block;\n  height: 100%;\n  border-radius: 3px;\n  background:\n    linear-gradient(\n      90deg,\n      #7e98ff,\n      #9db4ff);\n  transition: width 300ms ease;\n}\n.pet_gameplayActions {\n  display: flex;\n  flex-wrap: wrap;\n  gap: 6px;\n}\n.pet_gameplayShopItems {\n  display: grid;\n  grid-template-columns: repeat(2, minmax(0, 1fr));\n  gap: 8px;\n  margin-bottom: 8px;\n}\n.pet_gameplayShopItem {\n  display: flex;\n  flex-direction: column;\n  align-items: center;\n  gap: 4px;\n  padding: 8px 6px;\n  border: 1px solid rgba(126, 152, 255, 0.25);\n  border-radius: 8px;\n  background: rgba(126, 152, 255, 0.08);\n  color: inherit;\n  cursor: pointer;\n}\n.pet_gameplayShopItem:hover {\n  border-color: rgba(126, 152, 255, 0.7);\n  background: rgba(126, 152, 255, 0.16);\n}\n.pet_gameplayShopItemImage {\n  width: 36px;\n  height: 36px;\n  object-fit: contain;\n  image-rendering: pixelated;\n  pointer-events: none;\n}\n.pet_gameplayShopItemLabel {\n  font-size: 11px;\n  text-align: center;\n}\n.pet_gameplayShopItemPrice {\n  font-size: 10px;\n  color: #ffd27e;\n}\n.pet_gameplaySkinItems {\n  display: flex;\n  flex-direction: column;\n  gap: 6px;\n  margin-bottom: 8px;\n}\n.pet_gameplaySkinItem {\n  display: block;\n  width: 100%;\n  padding: 8px 10px;\n  border: 1px solid rgba(126, 152, 255, 0.25);\n  border-radius: 8px;\n  background: rgba(126, 152, 255, 0.08);\n  color: inherit;\n  cursor: pointer;\n  text-align: left;\n  font-size: 12px;\n}\n.pet_gameplaySkinItem:hover {\n  border-color: rgba(126, 152, 255, 0.7);\n  background: rgba(126, 152, 255, 0.16);\n}\n.pet_gameplaySkinItemActive {\n  border-color: rgba(126, 152, 255, 0.9);\n  background: rgba(126, 152, 255, 0.28);\n}\n.pet_gameplayClose {\n  position: absolute;\n  top: 4px;\n  right: 8px;\n  border: none;\n  background: none;\n  color: #9aa8d8;\n  font-size: 14px;\n  cursor: pointer;\n  padding: 0 2px;\n}\n.pet_gameplayClose:hover {\n  color: #ffffff;\n}\n.pet_gameplayFloat {\n  position: absolute;\n  left: 50%;\n  top: -8px;\n  transform: translateX(-50%);\n  padding: 2px 10px;\n  border-radius: 999px;\n  background: rgba(255, 210, 126, 0.92);\n  color: #3a2a00;\n  font-size: 11px;\n  white-space: nowrap;\n  pointer-events: none;\n  animation: pet_pet-gameplay-float 1100ms ease-out forwards;\n}\n@keyframes pet_pet-gameplay-float {\n  from {\n    opacity: 0;\n    transform: translateX(-50%) translateY(6px);\n  }\n  20% {\n    opacity: 1;\n  }\n  to {\n    opacity: 0;\n    transform: translateX(-50%) translateY(-18px);\n  }\n}\n@media (prefers-reduced-motion: reduce) {\n  .pet_gameplayFloat {\n    animation: none;\n    opacity: 1;\n  }\n  .pet_gameplayBarFill {\n    transition: none;\n  }\n}\n.pet_bubbleUsage {\n  display: flex;\n  flex-direction: column;\n  align-items: stretch;\n  gap: 3px;\n  min-width: 128px;\n  max-width: min(280px, calc(100vw - 24px));\n  padding: 6px 12px;\n  white-space: nowrap;\n  background:\n    linear-gradient(\n      160deg,\n      rgba(19, 28, 54, 0.92),\n      rgba(7, 11, 26, 0.95));\n  border: 1px solid rgba(126, 152, 255, 0.45);\n  box-shadow:\n    0 4px 12px rgba(2, 6, 23, 0.35),\n    inset 0 1px 0 rgba(226, 232, 255, 0.1),\n    0 0 12px rgba(77, 107, 254, 0.18);\n  backdrop-filter: blur(8px);\n  letter-spacing: 0.02em;\n  animation: pet_pet-usage-in 280ms cubic-bezier(0.22, 1, 0.36, 1);\n}\n.pet_bubbleUsageHead {\n  display: flex;\n  align-items: baseline;\n  justify-content: space-between;\n  gap: 10px;\n}\n.pet_bubbleUsageTitle {\n  overflow: hidden;\n  text-overflow: ellipsis;\n  opacity: 0.85;\n}\n.pet_bubbleUsageValue {\n  font-weight: 600;\n  font-variant-numeric: tabular-nums;\n  flex-shrink: 0;\n}\n.pet_bubbleUsageNote {\n  overflow: hidden;\n  text-overflow: ellipsis;\n  font-size: 10px;\n  opacity: 0.55;\n}\n.pet_bubbleUsageMeter {\n  display: block;\n  height: 4px;\n  border-radius: 999px;\n  background: rgba(226, 232, 255, 0.14);\n  overflow: hidden;\n}\n.pet_bubbleUsageMeterFill {\n  display: block;\n  height: 100%;\n  border-radius: 999px;\n  background: #6ee7b7;\n  transition: width 300ms ease;\n}\n.pet_bubbleUsageOk {\n  border-color: rgba(126, 152, 255, 0.45);\n}\n.pet_bubbleUsageWarn {\n  border-color: rgba(251, 191, 36, 0.55);\n}\n.pet_bubbleUsageWarn .pet_bubbleUsageMeterFill {\n  background: #fbbf24;\n}\n.pet_bubbleUsageLow {\n  border-color: rgba(248, 113, 113, 0.6);\n}\n.pet_bubbleUsageLow .pet_bubbleUsageMeterFill {\n  background: #f87171;\n}\n@keyframes pet_pet-usage-in {\n  from {\n    opacity: 0;\n    transform: translateY(6px) scale(0.96);\n  }\n  to {\n    opacity: 1;\n    transform: translateY(0) scale(1);\n  }\n}\n@media (prefers-reduced-motion: reduce) {\n  .pet_bubbleUsage {\n    animation: none;\n  }\n}\n\n/* src/client/settings-card.module.css */\n.settings_card_card {\n  border: 1px solid var(--dsw-alias-border-l2);\n  background: var(--dsw-alias-bg-layer-3);\n  border-radius: 12px;\n  list-style: none;\n  transition: border-color 0.16s, background 0.16s;\n}\n.settings_card_card:hover {\n  border-color: var(--dsw-alias-label-dimmed);\n}\n.settings_card_cardOpen {\n  background: var(--dsw-alias-bg-layer-2);\n  border-color: var(--dsw-alias-label-dimmed);\n}\n.settings_card_header {\n  appearance: none;\n  width: 100%;\n  box-sizing: border-box;\n  font: inherit;\n  color: inherit;\n  text-align: left;\n  cursor: pointer;\n  background: transparent;\n  border: 0;\n  border-radius: 12px;\n  align-items: center;\n  gap: 12px;\n  padding: 14px 16px;\n  display: flex;\n}\n.settings_card_header:focus-visible {\n  outline: 2px solid var(--dsw-alias-brand-primary);\n  outline-offset: -2px;\n}\n.settings_card_headerStatic {\n  width: 100%;\n  box-sizing: border-box;\n  border-radius: 12px;\n  align-items: center;\n  gap: 12px;\n  padding: 14px 16px;\n  display: flex;\n}\n.settings_card_headText {\n  flex-direction: column;\n  flex: 1;\n  gap: 4px;\n  min-width: 0;\n  display: flex;\n}\n.settings_card_name {\n  color: var(--dsw-alias-label-primary);\n  font-size: 15px;\n  font-weight: 600;\n  line-height: 1.4;\n}\n.settings_card_description {\n  color: var(--dsw-alias-label-secondary);\n  font-size: 13px;\n  line-height: 1.5;\n}\n.settings_card_pending {\n  white-space: nowrap;\n  background: var(--dsw-alias-bg-module-platform);\n  color: var(--dsw-alias-label-secondary);\n  border-radius: 999px;\n  flex: none;\n  padding: 1px 8px;\n  font-size: 11px;\n  font-weight: 500;\n  line-height: 17px;\n}\n.settings_card_chevron {\n  color: var(--dsw-alias-label-tertiary);\n  flex: none;\n  transition: transform 0.16s;\n}\n.settings_card_chevronOpen {\n  transform: rotate(180deg);\n}\n.settings_card_body {\n  border-top: 1px solid var(--dsw-alias-border-l2);\n  margin: 0 16px;\n  padding-bottom: 8px;\n}\n.settings_card_readOnly {\n  color: var(--dsw-alias-label-secondary);\n  margin: 12px 0 0;\n  font-size: 12px;\n  line-height: 1.5;\n}\n.settings_card_notExposed {\n  color: var(--dsw-alias-state-warn-primary);\n  margin: 12px 0 0;\n  font-size: 12px;\n  line-height: 1.5;\n}\n.settings_card_footer {\n  border-top: 1px solid var(--dsw-alias-border-l2);\n  justify-content: flex-end;\n  align-items: center;\n  gap: 8px;\n  padding: 12px 0 4px;\n  display: flex;\n}\n.settings_card_failed {\n  min-width: 0;\n  color: var(--dsw-alias-state-error-primary, #b42318);\n  flex: 1;\n  margin: 0;\n  font-size: 12px;\n  line-height: 1.5;\n  text-overflow: ellipsis;\n  overflow: hidden;\n  white-space: nowrap;\n}\n.settings_card_discard,\n.settings_card_save {\n  appearance: none;\n  font: inherit;\n  cursor: pointer;\n  border: 1px solid transparent;\n  border-radius: 8px;\n  padding: 5px 14px;\n  font-size: 13px;\n  line-height: 1.5;\n}\n.settings_card_discard {\n  border-color: var(--dsw-alias-border-l2);\n  color: var(--dsw-alias-label-secondary);\n  background: transparent;\n}\n.settings_card_discard:hover:not(:disabled) {\n  color: var(--dsw-alias-label-primary);\n  border-color: var(--dsw-alias-label-dimmed);\n}\n.settings_card_save {\n  background: var(--dsw-alias-label-primary);\n  color: var(--dsw-alias-bg-layer-3);\n}\n.settings_card_discard:disabled,\n.settings_card_save:disabled {\n  opacity: 0.4;\n  cursor: default;\n}\n.settings_card_discard:focus-visible,\n.settings_card_save:focus-visible {\n  outline: 2px solid var(--dsw-alias-brand-primary);\n  outline-offset: 1px;\n}\n.settings_card_field {\n  flex-direction: column;\n  gap: 6px;\n  padding: 12px 0;\n  display: flex;\n}\n.settings_card_field + .settings_card_field {\n  border-top: 1px solid var(--dsw-alias-border-l2);\n}\n.settings_card_head {\n  align-items: center;\n  gap: 8px;\n  display: flex;\n}\n.settings_card_label {\n  min-width: 0;\n  color: var(--dsw-alias-label-primary);\n  flex: 1;\n  font-size: 13px;\n  font-weight: 500;\n  line-height: 1.5;\n}\n.settings_card_badges {\n  align-items: center;\n  gap: 8px;\n  display: inline-flex;\n}\n.settings_card_badge {\n  white-space: nowrap;\n  background: var(--dsw-alias-bg-module-platform);\n  color: var(--dsw-alias-label-secondary);\n  border-radius: 999px;\n  padding: 1px 8px;\n  font-size: 11px;\n  font-weight: 500;\n  line-height: 17px;\n}\n.settings_card_reset {\n  font: inherit;\n  color: var(--dsw-alias-label-secondary);\n  cursor: pointer;\n  background: transparent;\n  border: none;\n  padding: 0;\n  font-size: 12px;\n  line-height: 1.5;\n}\n.settings_card_reset:hover:not(:disabled) {\n  color: var(--dsw-alias-label-primary);\n}\n.settings_card_reset:disabled {\n  cursor: default;\n}\n.settings_card_reset:focus-visible {\n  outline: 2px solid var(--dsw-alias-brand-primary);\n  outline-offset: 2px;\n}\n.settings_card_reset:focus-visible {\n  outline: 2px solid var(--dsw-alias-brand-primary);\n  outline-offset: 2px;\n}\n.settings_card_input,\n.settings_card_select {\n  border: 1px solid var(--dsw-alias-border-l2);\n  background: var(--dsw-alias-bg-layer-3);\n  height: 34px;\n  font: inherit;\n  color: var(--dsw-alias-label-primary);\n  border-radius: 8px;\n  padding: 0 12px;\n  font-size: 13px;\n  line-height: 1.5;\n}\n.settings_card_input:focus-visible,\n.settings_card_select:focus-visible {\n  border-color: var(--dsw-alias-brand-primary);\n  outline: none;\n}\n.settings_card_input:disabled,\n.settings_card_select:disabled {\n  color: var(--dsw-alias-label-tertiary);\n  cursor: default;\n}\n.settings_card_inputInvalid {\n  border: 1px solid var(--dsw-alias-state-error-primary, #b42318);\n  background: var(--dsw-alias-bg-layer-3);\n  height: 34px;\n  font: inherit;\n  color: var(--dsw-alias-label-primary);\n  border-radius: 8px;\n  padding: 0 12px;\n  font-size: 13px;\n  line-height: 1.5;\n}\n.settings_card_inputInvalid:focus-visible {\n  outline: 2px solid var(--dsw-alias-state-error-primary, #b42318);\n  outline-offset: 1px;\n  border-color: var(--dsw-alias-state-error-primary, #b42318);\n}\n.settings_card_selectWrap {\n  position: relative;\n}\n.settings_card_selectButton {\n  appearance: none;\n  width: 100%;\n  text-align: left;\n  cursor: pointer;\n  align-items: center;\n  justify-content: space-between;\n  gap: 8px;\n  display: flex;\n}\n.settings_card_selectLabel {\n  min-width: 0;\n  overflow: hidden;\n  text-overflow: ellipsis;\n  white-space: nowrap;\n}\n.settings_card_selectChevron {\n  color: var(--dsw-alias-label-tertiary);\n  flex: none;\n  transition: transform 0.16s;\n}\n.settings_card_selectChevronOpen {\n  transform: rotate(180deg);\n}\n.settings_card_selectPopup {\n  position: absolute;\n  top: calc(100% + 4px);\n  left: 0;\n  right: 0;\n  z-index: 40;\n  flex-direction: column;\n  max-height: 240px;\n  overflow-y: auto;\n  border: 1px solid var(--dsw-alias-border-l2);\n  border-radius: 8px;\n  background: var(--dsw-alias-bg-layer-3);\n  box-shadow: 0 8px 24px var(--dsw-alias-bg-mask-2);\n  padding: 4px;\n  opacity: 0;\n  transform: translateY(-4px);\n  transition: opacity 0.1s ease, transform 0.1s ease;\n  display: flex;\n}\n.settings_card_selectPopupOpen {\n  opacity: 1;\n  transform: none;\n}\n.settings_card_selectPopupClose {\n  opacity: 0;\n  transform: translateY(-4px);\n  pointer-events: none;\n}\n.settings_card_selectOption {\n  flex-shrink: 0;\n  border-radius: 6px;\n  padding: 6px 10px;\n  font-size: 13px;\n  line-height: 1.5;\n  color: var(--dsw-alias-label-primary);\n  cursor: pointer;\n  white-space: nowrap;\n  overflow: hidden;\n  text-overflow: ellipsis;\n}\n.settings_card_selectOption:hover,\n.settings_card_selectOptionActive {\n  background: var(--dsw-alias-interactive-bg-hover);\n}\n.settings_card_selectOptionSelected {\n  color: var(--dsw-alias-brand-primary);\n  font-weight: 500;\n  background: color-mix(in srgb, var(--dsw-alias-brand-primary-new-colorprimary-new-color) 10%, transparent);\n}\n.settings_card_invalid {\n  color: var(--dsw-alias-state-error-primary, #b42318);\n  margin: 0;\n  font-size: 12px;\n  line-height: 1.5;\n}\n.settings_card_hint {\n  color: var(--dsw-alias-label-secondary);\n  margin: 0;\n  font-size: 12px;\n  line-height: 1.5;\n}\n@media (prefers-reduced-motion: reduce) {\n  .settings_card_card,\n  .settings_card_header,\n  .settings_card_chevron,\n  .settings_card_chevronOpen,\n  .settings_card_discard,\n  .settings_card_save,\n  .settings_card_selectChevron,\n  .settings_card_selectChevronOpen,\n  .settings_card_selectPopup {\n    transition: none;\n  }\n}\n\n/* src/client/settings-section.module.css */\n.settings_section_sectionList {\n  list-style: none;\n  margin: 0;\n  padding: 0;\n}\n"}return module.exports;}});
