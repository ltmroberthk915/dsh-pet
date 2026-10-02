// src/affinity.ts
var AFFINITY_MAX = 999999999;
var AFFINITY_RANKS = [
  { min: 0, name: "\u5E7C\u9CB8", emoji: "*" },
  { min: 25, name: "\u4F19\u4F34", emoji: "**" },
  { min: 50, name: "\u631A\u53CB", emoji: "***" },
  { min: 80, name: "\u6DF1\u6D77\u7F81\u7ECA", emoji: "****" },
  { min: 200, name: "\u5FC3\u6709\u7075\u7280", emoji: "*****" },
  { min: 500, name: "\u4F20\u8BF4\u7F81\u7ECA", emoji: "******" },
  { min: 2e3, name: "\u795E\u8BDD\u7F81\u7ECA", emoji: "*******" },
  { min: 1e4, name: "\u6C38\u6052\u4E4B\u5951", emoji: "********" },
  { min: 1e5, name: "\u9CB8\u751F\u5171\u6E21", emoji: "*********" }
];
var defaultAffinityConfig = {
  turnReward: 1,
  petReward: 1,
  petCooldownMs: 1e4,
  feedReward: 5,
  feedCooldownMs: 3e4
};

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

// src/invariant.ts
function invariant(condition, message) {
  if (!condition) {
    throw new Error(`[dsh-pet] ${message}`);
  }
}
function runPetInvariants() {
  invariant(AFFINITY_MAX > 0, "AFFINITY_MAX must be positive");
  invariant(
    AFFINITY_RANKS.length > 0 && AFFINITY_RANKS[0].min === 0,
    "AFFINITY_RANKS must start at 0"
  );
  invariant(defaultAffinityConfig.turnReward > 0, "turnReward must be positive");
  invariant(
    defaultAffinityConfig.feedCooldownMs > defaultAffinityConfig.petCooldownMs,
    "feed cooldown must exceed pet cooldown"
  );
  const phases = ["idle", "waiting", "thinking", "tool", "done"];
  for (const phase of phases) {
    invariant(
      ["idle", "running", "running-right", "waiting", "jumping"].includes(animationForPhase(phase)),
      `phase ${phase} maps outside the animation contract`
    );
  }
}
runPetInvariants();
export {
  invariant,
  runPetInvariants
};
