// src/index.ts
import z from "@deepseek-ai/schemastery";

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
function footerTokensPerSecond(stats) {
  if (typeof stats !== "object" || stats === null) return void 0;
  const { decodeTokens, decodeMs } = stats;
  if (typeof decodeTokens !== "number" || !Number.isFinite(decodeTokens) || decodeTokens < 0 || typeof decodeMs !== "number" || !Number.isFinite(decodeMs) || decodeMs <= 0) return void 0;
  const rate = decodeTokens / (decodeMs / 1e3);
  if (!Number.isFinite(rate)) return void 0;
  return rate >= 10 ? Math.round(rate) : Math.round(rate * 10) / 10;
}

// src/animation-bindings.ts
function sessionMotionPet(petId) {
  return ["whale-girl-refined", "miku", "blue-whale-business"].includes(petId);
}
function boundAnimation(petId, snapshot) {
  if (!sessionMotionPet(petId)) return snapshot.animation;
  if (snapshot.generation !== void 0) {
    return snapshot.generation === "tool-arguments" && (snapshot.toolCategory === "write" || snapshot.toolCategory === "edit") ? "running-left" : "running-right";
  }
  if (snapshot.phase === "thinking" && snapshot.toolKind === "result") return "review";
  if (snapshot.phase === "tool") {
    if (snapshot.toolKind === "command" || snapshot.toolCategory === "shell") return "running";
    if (["read", "grep", "find", "ls", "memory"].includes(snapshot.toolCategory ?? "")) return "review";
    if (snapshot.toolCategory === "ask" || snapshot.toolCategory === "wait") return "waiting";
    return "running-left";
  }
  return snapshot.animation;
}
function commandTool(name2) {
  return /(?:^|[_.:/-])(?:exec(?:_command)?|run_command|run_code|bash|shell|terminal|powershell|pwsh|write_stdin|ssh)(?:$|[_.:/-])/i.test(name2);
}

// src/service.ts
import { Service } from "@deepseek-ai/cordis";

// src/announce.ts
var ANNOUNCE_DEFAULT_TTL_MS = 1e4;
var ANNOUNCE_MAX_TTL_MS = 72e5;
var TITLE_MAX = 80;
var TEXT_MAX = 120;
var SOURCE_MAX = 64;
function boundedString(value, max) {
  if (typeof value !== "string") return void 0;
  const trimmed = value.trim();
  if (trimmed === "") return void 0;
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max);
}
function parseAnnouncement(input, now) {
  if (typeof input !== "object" || input === null) return void 0;
  const data = input;
  const source = boundedString(data.source, SOURCE_MAX);
  const title = boundedString(data.title, TITLE_MAX);
  if (source === void 0 || title === void 0) return void 0;
  const kind = data.kind === "balance" || data.kind === "cost" || data.kind === "plan" ? data.kind : void 0;
  if (kind === void 0) return void 0;
  const amount = boundedString(data.amount, TEXT_MAX);
  const resetAt = boundedString(data.resetAt, TEXT_MAX);
  const note = boundedString(data.note, TITLE_MAX);
  const percent = typeof data.percent === "number" && Number.isFinite(data.percent) ? Math.max(0, Math.min(100, data.percent)) : void 0;
  if ((kind === "balance" || kind === "cost") && amount === void 0) return void 0;
  if (kind === "plan" && percent === void 0) return void 0;
  const tone = data.tone === "warn" || data.tone === "low" ? data.tone : "ok";
  const ttlMs = typeof data.ttlMs === "number" && Number.isFinite(data.ttlMs) ? Math.max(1e3, Math.min(ANNOUNCE_MAX_TTL_MS, data.ttlMs)) : ANNOUNCE_DEFAULT_TTL_MS;
  return {
    source,
    kind,
    title,
    ...amount !== void 0 ? { amount } : {},
    ...percent !== void 0 ? { percent } : {},
    ...resetAt !== void 0 ? { resetAt } : {},
    ...note !== void 0 ? { note } : {},
    tone,
    ttlMs,
    at: now
  };
}
function announcementFresh(announcement, now) {
  return now - announcement.at < announcement.ttlMs;
}

// src/chatter.ts
var STATUS_ROTATE_MS = 4e3;
var STATUS_POOLS = {
  prepare: [
    "\u51C6\u5907\u5F00\u59CB",
    "\u64B8\u8D77\u8896\u5B50\u5F00\u5DE5\u5566",
    "\u65B0\u4E00\u8F6E\uFF0C\u51FA\u53D1\uFF5E",
    "\u6253\u8D77\u7CBE\u795E\uFF0C\u5F00\u5E72\uFF01",
    "\u6574\u7406\u4E00\u4E0B\u684C\u9762\uFF0C\u5F00\u59CB\u5427",
    "\u6C27\u6C14\u5145\u6EE1\uFF0C\u4E0B\u6F5C\u5F00\u59CB\uFF5E",
    "\u70ED\u8EAB\u5B8C\u6BD5\uFF0C\u8DC3\u8DC3\u6B32\u8BD5",
    "\u5F00\u5DE5\u4EEA\u5F0F\u611F\u5DF2\u5C31\u4F4D"
  ],
  waiting: [
    "\u7B49\u5F85\u6A21\u578B\u54CD\u5E94",
    "\u547C\u53EB\u5927\u8111\u4E2D\uFF0C\u8BF7\u7A0D\u7B49",
    "\u4FE1\u53F7\u53D1\u5C04\u4E2D\uFF0C\u7B49\u4E00\u4E2A\u56DE\u97F3",
    "\u7075\u611F\u6B63\u5728\u8DEF\u4E0A\uFF5E",
    "\u7AD6\u8D77\u8033\u6735\u7B49\u56DE\u590D",
    "\u5927\u8111\u5728\u5495\u565C\u5495\u565C\u52A0\u8F7D",
    "\u7B49\u5B83\u4F38\u4E2A\u61D2\u8170\u518D\u5F00\u53E3",
    "\u6A21\u578B\uFF1A\u6765\u4E86\u6765\u4E86",
    "\u7B49\u4E00\u4E2A\u7075\u611F\u7838\u4E2D\u6211",
    "\u6EF4\u2014\u2014\u7B49\u5F85\u8FDE\u7EBF\u4E2D",
    "\u5B83\u5728\u7EC4\u7EC7\u8BED\u8A00\uFF0C\u522B\u50AC",
    "\u7B49\u5B83\u70ED\u8EAB\u5B8C\u6BD5",
    "\u7075\u611F\u5FEB\u9012\u6D3E\u9001\u4E2D",
    "\u5C4F\u4F4F\u547C\u5438\u7B49\u56DE\u590D"
  ],
  thinking: [
    "\u6B63\u5728\u601D\u8003",
    "\u55EF\u2026\u2026\u8BA9\u6211\u60F3\u4E00\u60F3",
    "\u8111\u5185\u98CE\u66B4\u8FDB\u884C\u4E2D",
    "\u601D\u7EEA\u5495\u565C\u5495\u565C\u5192\u6CE1",
    "\u7075\u5149\u96C6\u7ED3\u4E2D\uFF5E",
    "\u7709\u5934\u4E00\u76B1\uFF0C\u8BA4\u771F\u5206\u6790",
    "\u5DE6\u8111\u53F3\u8111\u4E00\u8D77\u5F00\u4F1A",
    "\u7B54\u6848\u6B63\u5728\u6D6E\u51FA\u6C34\u9762",
    "\u76D8\u4E00\u4E0B\uFF0C\u76D8\u4E00\u4E0B\u903B\u8F91",
    "\u8BA9\u5B50\u5F39\u518D\u98DE\u4E00\u4F1A\u513F",
    "\u522B\u50AC\u522B\u50AC\uFF0C\u5728\u60F3\u5462",
    "\u5927\u8111\u8F6C\u8D77\u6765\u4E86",
    "\u8BA9\u6211\u628A\u7EBF\u7D22\u634B\u4E00\u634B",
    "\u8111\u5185\u8DD1\u706B\u8F66\u4E2D",
    "\u5C0F\u8111\u74DC\u9AD8\u901F\u8FD0\u8F6C",
    "\u8BA9\u6211\u7422\u78E8\u7422\u78E8",
    "\u7FFB\u7FFB\u8111\u5B50\u91CC\u7684\u85CF\u4E66",
    "\u8BA9\u6211\u56BC\u4E00\u56BC\u8FD9\u4E2A\u95EE\u9898",
    "\u8111\u5B50\u5728\u716E\u5496\u5561\uFF0C\u9A6C\u4E0A\u597D",
    "\u601D\u8003\u7684\u9C7C\u6E38\u6765\u4E86",
    "\u8BA9\u6211\u5EB7\u5EB7\u8FD9\u91CC\u9762\u7684\u95E8\u9053",
    "\u6B63\u5728\u76D8\u903B\u8F91\u94FE",
    "\u601D\u7EEA\u6574\u7406\u6536\u7EB3\u4E2D",
    "\u55EF\uFF1F\u6709\u70B9\u610F\u601D\u2026\u2026",
    "\u8BA9\u601D\u8DEF\u6C89\u6DC0\u4E00\u4E0B",
    "\u8111\u5185\u5F39\u5E55\u98DE\u901F\u6EDA\u52A8"
  ],
  review: [
    "\u6574\u7406\u56DE\u590D\u4E2D",
    "\u628A\u60F3\u6CD5\u5199\u4E0B\u6765",
    "\u7EC4\u7EC7\u8BED\u8A00\u4E2D\uFF5E",
    "\u843D\u7B14\u6210\u6587\uFF0C\u8BF7\u7A0D\u5019",
    "\u5B57\u659F\u53E5\u914C\u4E2D",
    "\u628A\u7B54\u6848\u88C5\u8FDB\u4FE1\u5C01\u91CC",
    "\u9063\u8BCD\u9020\u53E5\u6253\u78E8\u4E2D",
    "\u628A\u601D\u7EEA\u7801\u6210\u6574\u6574\u9F50\u9F50\u7684\u5B57",
    "\u594B\u7B14\u75BE\u4E66\u4E2D",
    "\u628A\u6700\u597D\u7684\u8868\u8FBE\u6311\u51FA\u6765",
    "\u6587\u5B57\u6392\u7248\u7F8E\u5BB9\u5E08\u4E0A\u7EBF",
    "\u6536\u5C3E\u6DA6\u8272\u4E00\u4E0B\u4E0B"
  ],
  toolResult: [
    "\u5904\u7406\u5DE5\u5177\u7ED3\u679C",
    "\u770B\u770B\u5E26\u56DE\u4E86\u4EC0\u4E48",
    "\u6D88\u5316\u4E00\u4E0B\u521A\u5230\u7684\u7ED3\u679C",
    "\u7ED3\u679C\u89E3\u8BFB\u4E2D\uFF5E",
    "\u9A8C\u6536\u5DE5\u5177\u7684\u6210\u679C",
    "\u628A\u7EBF\u7D22\u62FC\u63A5\u8D77\u6765",
    "\u6218\u5229\u54C1\u6E05\u70B9\u4E2D",
    "\u8FD9\u4EFD\u7ED3\u679C\u6709\u70B9\u4E1C\u897F",
    "\u628A\u65B0\u60C5\u62A5\u5F52\u6863",
    "\u7ED3\u679C\u5230\u624B\uFF0C\u7EE7\u7EED\u524D\u8FDB"
  ],
  done: [
    "\u5B8C\u6210\u5566",
    "\u641E\u5B9A\u6536\u5DE5\uFF5E",
    "\u4EFB\u52A1\u8FBE\u6210\uFF0C\u8036\uFF01",
    "\u8FD9\u4E00\u8F6E\u5706\u6EE1\u5B8C\u6210",
    "\u987A\u5229\u62B5\u8FBE\u7EC8\u70B9",
    "\u6536\u5DE5\uFF01\u6C42\u6478\u6478\u5956\u52B1",
    "\u4EA4\u5DEE\uFF01\u4E0B\u4E00\u4F4D",
    "\u9F50\u6D3B\uFF0C\u6F02\u4EAE\u6536\u5B98",
    "\u62FF\u4E0B\uFF01\u51FB\u638C\uFF5E",
    "\u7A33\u4E86\uFF0C\u6EE1\u5206\u4EA4\u5377",
    "\u641E\u5B9A\uFF0C\u53BB\u559D\u53E3\u6C34",
    "\u5B8C\u5DE5\u54AF\uFF0C\u8F6C\u4E2A\u5708\u5708",
    "\u8FD9\u4E00\u8F6E\uFF0C\u6211\u4EEC\u914D\u5408\u6EE1\u5206",
    "\u59A5\u4E86\u59A5\u4E86\uFF0C\u6536\u5DE5\u6536\u5DE5"
  ],
  failed: [
    "\u6267\u884C\u5931\u8D25",
    "\u54CE\u5440\uFF0C\u4E2D\u9014\u5361\u4F4F\u4E86",
    "\u8FD9\u4E00\u6B65\u6CA1\u80FD\u8D70\u5B8C",
    "\u88AB\u5C0F\u77F3\u5934\u7ECA\u5012\u4E86",
    "\u534A\u8DEF\u7FFB\u8F66\u4E86\uFF0C\u63C9\u63C9\u819D\u76D6",
    "\u51FA\u4E86\u70B9\u5C94\u5B50\uFF0C\u7F13\u7F13\u518D\u6765"
  ],
  toolFailed: [
    "\u5DE5\u5177\u6267\u884C\u5931\u8D25",
    "\u5DE5\u5177\u95F9\u813E\u6C14\u4E86\uFF0C\u54C4\u54C4\u5B83",
    "\u54CE\u5440\uFF0C\u5DE5\u5177\u6389\u94FE\u5B50\u4E86",
    "\u8FD9\u4E2A\u5DE5\u5177\u4ECA\u5929\u4E0D\u592A\u542C\u8BDD",
    "\u5DE5\u5177\u7FFB\u8F66\u4E86\uFF0C\u6276\u8D77\u6765\u7EE7\u7EED",
    "\u6CA1\u8DD1\u901A\uFF0C\u518D\u6765\u4E00\u6B21",
    "\u5DE5\u5177\uFF1A\u6211\u7F62\u5DE5\u4E09\u79D2\u949F",
    "\u8FD9\u4E00\u6B65\u6454\u4E86\u4E00\u8DE4\uFF0C\u6CA1\u4E8B"
  ],
  maxTokens: [
    "\u8FBE\u5230\u8F93\u51FA\u4E0A\u9650",
    "\u8BDD\u8BF4\u5230\u4E00\u534A\u88AB\u622A\u65AD\u4E86",
    "\u5B57\u6570\u7528\u5B8C\u4E86\uFF0C\u5598\u53E3\u6C14",
    "\u4E00\u53E3\u6C14\u8BF4\u592A\u6EE1\uFF0C\u7F13\u7F13"
  ],
  interrupted: [
    "\u6267\u884C\u610F\u5916\u4E2D\u65AD",
    "\u54CE\u5440\uFF0C\u88AB\u610F\u5916\u6253\u65AD\u4E86",
    "\u534A\u8DEF\u8E29\u4E86\u6025\u5239\u8F66",
    "\u88AB\u8FEB\u505C\u4E0B\uFF0C\u610F\u72B9\u672A\u5C3D"
  ],
  blocked: [
    "\u7B49\u5F85\u7EE7\u7EED",
    "\u5728\u8FD9\u91CC\u7B49\u4F60\u53D1\u4EE4",
    "\u6682\u505C\u5F85\u547D\uFF0C\u968F\u65F6\u51FA\u53D1",
    "\u8E72\u4E00\u4E2A\u7EE7\u7EED\u7684\u6307\u4EE4"
  ]
};
var STATUS_SCENES = [
  "prepare",
  "waiting",
  "thinking",
  "review",
  "toolResult",
  "done",
  "failed",
  "toolFailed",
  "maxTokens",
  "interrupted",
  "blocked"
];
var TOOL_CATEGORIES = [
  "read",
  "write",
  "edit",
  "shell",
  "grep",
  "find",
  "ls",
  "webSearch",
  "webFetch",
  "mcp",
  "memory",
  "subagent",
  "wait",
  "todo",
  "browser",
  "git",
  "ask",
  "generic"
];
function toolCategory(toolName) {
  const name2 = toolName.toLowerCase();
  if (/(?:^|[.:/]|__)(?:wait(?:_(?:agents?|subagents?|threads))?|wait_for_(?:agents?|subagents?)|sleep)$/.test(name2)) return "wait";
  if (/(?:^|[.:/]|__)(?:list_agents|team_task_get|team_task_list)$/.test(name2)) return "read";
  if (/(?:^|[_.:/-])(?:job_output|task_output|read_job|read_task_output)(?:$|[_.:/-])/.test(name2)) return "read";
  if (/mem0|recall|memory/.test(name2)) return "memory";
  if (/subagent|workflow|ralph|agent|task/.test(name2)) return "subagent";
  if (/web_search|websearch|search_web|exa|brave|tavily/.test(name2)) return "webSearch";
  if (/fetch/.test(name2)) return "webFetch";
  if (/browser|playwright|chrome/.test(name2)) return "browser";
  if (/grep|search|rg/.test(name2)) return "grep";
  if (/glob|find/.test(name2)) return "find";
  if (/^ls$|list_dir|list/.test(name2)) return "ls";
  if (/ask_user|ask/.test(name2)) return "ask";
  if (/todo|plan/.test(name2)) return "todo";
  if (/git/.test(name2)) return "git";
  if (/(?:^|[_.:/-])(?:exec(?:_command)?|run_command|run_code|bash|shell|terminal|powershell|pwsh|write_stdin|ssh)(?:$|[_.:/-])/.test(name2)) return "shell";
  if (/read|open|load|describe|inspect/.test(name2)) return "read";
  if (/edit|patch|replace|rename/.test(name2)) return "edit";
  if (/write|create|save/.test(name2)) return "write";
  if (/run_code|bash|shell|terminal|exec|command|ssh/.test(name2)) return "shell";
  if (/mcp__|mcp/.test(name2)) return "mcp";
  return "generic";
}
var TOOL_POOLS = {
  wait: ["\u7B49\u5F85\u667A\u80FD\u4F53\u66F4\u65B0", "\u7B49\u5F85\u4EFB\u52A1\u8FD4\u56DE", "\u7B49\u5F85\u4E2D"],
  read: [
    "\u6B63\u5728\u4F7F\u7528 {tool}",
    "\u7FFB\u7FFB {hint}",
    "\u8BFB\u4E00\u4E0B {hint}",
    "\u8BA9\u6211\u5EB7\u5EB7\u8FD9\u4E2A\u6587\u4EF6",
    "\u9010\u884C\u54C1\u5473 {hint}",
    "\u7FFB\u9605\u8D44\u6599\u4E2D\uFF5E",
    "\u7784\u4E00\u773C {hint}",
    "\u628A\u6587\u4EF6\u644A\u5F00\u770B\u4E00\u770B",
    "\u8BA4\u771F\u7814\u8BFB {hint}"
  ],
  write: [
    "\u6B63\u5728\u4F7F\u7528 {tool}",
    "\u5199\u5199\u5199\uFF0C\u5199 {hint}",
    "\u4E0B\u7B14\u4E2D\uFF5E",
    "\u7801\u5B57\u5462\uFF0C\u522B\u50AC",
    "\u5199\u4E0B {hint}",
    "\u843D\u7B14\u6210\u7AE0",
    "\u628A\u60F3\u6CD5\u5B58\u8FDB {hint}",
    "\u5F00\u5199\u5F00\u5199",
    "\u5B58\u4E2A\u6587\u4EF6\u538B\u538B\u60CA"
  ],
  edit: [
    "\u6B63\u5728\u4F7F\u7528 {tool}",
    "\u6539\u6539 {hint}",
    "\u4FEE\u4FEE\u8865\u8865\u4E2D",
    "\u6DA6\u8272\u4E00\u4E0B {hint}",
    "\u6539\u4E24\u884C\uFF0C\u5C31\u4E24\u884C",
    "\u8865\u4E00\u5200 {hint}",
    "\u52A8\u52A8\u624B\u6307\u6539\u4E00\u6539",
    "\u7CBE\u96D5\u7EC6\u7422 {hint}",
    "\u5FAE\u8C03\u4E00\u4E0B\u4E0B"
  ],
  shell: [
    "\u6B63\u5728\u4F7F\u7528 {tool}",
    "\u8DD1\u8DD1 {hint}",
    "\u6572\u51E0\u884C\u547D\u4EE4\u8BD5\u8BD5",
    "\u547D\u4EE4\u884C\u8D70\u8D77\uFF1A{hint}",
    "\u4F7F\u5524\u7EC8\u7AEF\u8DD1\u4E2A\u817F",
    "\u7EC8\u7AEF\u5168\u901F\u8FD0\u8F6C\u4E2D",
    "\u6572\u56DE\u8F66\uFF01{hint}",
    "\u8BA9\u547D\u4EE4\u98DE\u4E00\u4F1A\u513F",
    "\u53BB\u7EC8\u7AEF\u91CC\u63A2\u4E2A\u7A76\u7ADF"
  ],
  grep: [
    "\u6B63\u5728\u4F7F\u7528 {tool}",
    "\u641C\u641C {hint}",
    "\u627E\u627E\u5339\u914D\uFF1A{hint}",
    "\u5173\u952E\u8BCD\u8D70\u4F60",
    "\u5728\u4EE3\u7801\u91CC\u6316\u4E00\u6316",
    "\u68C0\u7D22\u5C0F\u96F7\u8FBE\u542F\u52A8",
    "\u987A\u7740 {hint} \u8FFD\u4E0B\u53BB",
    "\u6398\u5730\u4E09\u5C3A\u627E\u4E00\u627E",
    "\u8FC7\u6EE4\u7B5B\u9009\u4E2D\uFF5E"
  ],
  find: [
    "\u6B63\u5728\u4F7F\u7528 {tool}",
    "\u627E\u627E\u6587\u4EF6 {hint}",
    "\u5BFB\u5B9D\u4E2D\uFF5E",
    "\u6587\u4EF6\u5728\u54EA\u91CC\u5440",
    "\u627E\u554A\u627E\u554A\u627E\u6587\u4EF6",
    "\u628A {hint} \u63EA\u51FA\u6765",
    "\u67E5\u627E\u6A21\u5F0F\u4E2D"
  ],
  ls: [
    "\u6B63\u5728\u4F7F\u7528 {tool}",
    "\u5217\u4E2A\u6E05\u5355\u770B\u770B",
    "\u770B\u770B\u76EE\u5F55\u91CC\u6709\u5565",
    "\u76EE\u5F55\u8D70\u8D77\uFF5E",
    "\u779F\u4E00\u773C\u6587\u4EF6\u5939",
    "\u6570\u6570\u8FD9\u91CC\u6709\u51E0\u4E2A\u6587\u4EF6"
  ],
  webSearch: [
    "\u6B63\u5728\u4F7F\u7528 {tool}",
    "\u7F51\u4E0A\u641C\u641C {hint}",
    "\u7F51\u7EDC\u51B2\u6D6A\u4E2D",
    "\u5E2E\u4F60\u95EE\u95EE\u4E92\u8054\u7F51",
    "\u641C\u4E00\u5708 {hint}",
    "\u53BB\u5916\u9762\u7684\u4E16\u754C\u6253\u542C\u6253\u542C",
    "\u67E5\u627E\u8D44\u6599\u4E2D\uFF5E",
    "\u60C5\u62A5\u6536\u96C6\u6A21\u5F0F\u5F00\u542F"
  ],
  webFetch: [
    "\u6B63\u5728\u4F7F\u7528 {tool}",
    "\u6293\u4E2A\u9875\u9762\u770B\u770B",
    "\u62C9\u53D6 {hint}",
    "\u6252\u62C9\u4E00\u4E0B\u7F51\u9875",
    "\u53D6\u70B9\u5185\u5BB9\u56DE\u6765",
    "\u6253\u5F00 {hint} \u7785\u7785"
  ],
  mcp: [
    "\u6B63\u5728\u4F7F\u7528 {tool}",
    "\u8FDE\u4E00\u4E0B\u5916\u90E8\u670D\u52A1",
    "\u558A\u4E2A\u5916\u63F4\u6765",
    "\u63A5\u4E2A\u5DE5\u5177\u7528\u7528",
    "\u95EE\u95EE\u63D2\u4EF6\u5C0F\u52A9\u624B",
    "\u5916\u90E8\u529B\u91CF\u63A5\u5165\u4E2D"
  ],
  memory: [
    "\u6B63\u5728\u4F7F\u7528 {tool}",
    "\u7FFB\u7FFB\u5C0F\u672C\u672C",
    "\u56DE\u60F3\u4E00\u4E0B\u4E4B\u524D\u7684\u4E8B",
    "\u5728\u8BB0\u5FC6\u91CC\u6316\u4E00\u6316",
    "\u63D0\u53D6\u8BB0\u5FC6\u788E\u7247\uFF5E",
    "\u6211\u4EEC\u4E4B\u524D\u7684\u7EA6\u5B9A\u662F\u2026\u2026"
  ],
  subagent: [
    "\u6B63\u5728\u4F7F\u7528 {tool}",
    "\u6D3E\u4E2A\u5C0F\u5F1F\u53BB\u8DD1\u817F",
    "\u5C0F\u52A9\u624B\u51FA\u52A8\uFF01",
    "\u4EA4\u7ED9\u5206\u8EAB\u53BB\u529E",
    "\u591A\u7EBF\u4F5C\u6218\uFF0C\u5206\u8EAB\u51FA\u51FB",
    "\u53EC\u5524\u961F\u53CB\u652F\u63F4",
    "\u96C6\u601D\u5E7F\u76CA\u4E2D\uFF5E"
  ],
  todo: [
    "\u6B63\u5728\u4F7F\u7528 {tool}",
    "\u5217\u4E2A\u5F85\u529E\u6E05\u5355",
    "\u5199\u4E2A\u5C0F\u8BA1\u5212",
    "\u5F85\u529E\u5B89\u6392\u5F97\u660E\u660E\u767D\u767D",
    "\u6253\u4E2A\u52FE\uFF0C\u7EE7\u7EED",
    "\u628A\u4EFB\u52A1\u6392\u6392\u5750"
  ],
  browser: [
    "\u6B63\u5728\u4F7F\u7528 {tool}",
    "\u5F00\u4E2A\u6D4F\u89C8\u5668\u770B\u770B",
    "\u7F51\u9875\u64CD\u4F5C\u5C0F\u80FD\u624B",
    "\u66FF\u4F60\u70B9\u70B9\u9875\u9762",
    "\u6D4F\u89C8\u5668\u8DD1\u817F\u4E2D"
  ],
  git: [
    "\u6B63\u5728\u4F7F\u7528 {tool}",
    "\u63D0\u4EA4\u4E00\u4E0B\u4EE3\u7801",
    "\u7248\u672C\u63A7\u5236\u8D70\u8D77",
    "\u7BA1\u7BA1\u4ED3\u5E93",
    "\u7ED9\u6539\u52A8\u5B89\u4E2A\u5BB6"
  ],
  ask: [
    "\u6B63\u5728\u4F7F\u7528 {tool}",
    "\u95EE\u4F60\u4E2A\u4E8B\u513F",
    "\u8BF7\u6559\u4E00\u4E0B\u4E0B",
    "\u7B49\u7B49\uFF0C\u6211\u9700\u8981\u786E\u8BA4",
    "\u8FD9\u4E2A\u95EE\u9898\u5F97\u4F60\u62CD\u677F"
  ],
  generic: [
    "\u6B63\u5728\u4F7F\u7528 {tool}",
    "\u53EC\u5524 {tool} \u51FA\u51FB",
    "{tool} \u5DE5\u4F5C\u4E2D",
    "\u501F\u52A9 {tool} \u7684\u529B\u91CF",
    "\u62DC\u6258 {tool} \u4E00\u4E0B",
    "{tool}\uFF0C\u542F\u52A8\uFF01"
  ]
};
var TOOL_REMAINING_POOL = [
  "\u8FD8\u6709 {n} \u4E2A\u5DE5\u5177\u8FD0\u884C\u4E2D",
  "{n} \u8DEF\u5E76\u8FDB\uFF0C\u5206\u8EAB\u4EEC\u8FD8\u5728\u5FD9",
  "\u8FD8\u6709 {n} \u4F4D\u5C0F\u52A9\u624B\u5728\u52A0\u73ED",
  "{n} \u6761\u6218\u7EBF\u540C\u65F6\u63A8\u8FDB\u4E2D",
  "\u53E6 {n} \u4E2A\u5DE5\u5177\u5728\u540E\u53F0\u8DD1"
];
function toolArgHint(toolName, argumentsJson) {
  let args;
  try {
    args = JSON.parse(argumentsJson);
  } catch {
    return void 0;
  }
  if (typeof args !== "object" || args === null || Array.isArray(args)) return void 0;
  const record = args;
  const category = toolCategory(toolName);
  const candidateKeys = (() => {
    switch (category) {
      case "shell":
        return ["command", "code", "cmd"];
      case "grep":
        return ["pattern", "query", "path"];
      case "find":
        return ["pattern", "path", "glob"];
      case "read":
      case "write":
      case "edit":
        return ["file_path", "path", "filePath", "file"];
      case "webSearch":
        return ["query", "q", "keyword"];
      case "webFetch":
      case "browser":
        return ["url", "uri"];
      case "subagent":
        return ["description", "label", "prompt"];
      case "ls":
        return ["path", "dir", "directory"];
      case "git":
        return ["command", "message"];
      default:
        return ["command", "query", "path", "file_path", "description", "title", "name"];
    }
  })();
  for (const key of candidateKeys) {
    const value = record[key];
    if (typeof value !== "string") continue;
    const compact = value.replace(/\s+/g, " ").trim();
    if (compact === "") continue;
    const base = compact.split("/").pop() ?? compact;
    const shown = (category === "read" || category === "write" || category === "edit") && base !== "" ? base : compact;
    return shown.length <= 28 ? shown : shown.slice(0, 25) + "...";
  }
  return void 0;
}
var StatusVoice = class {
  pools;
  rotateMs;
  counters = /* @__PURE__ */ new Map();
  lastScene = "";
  lastLine = "";
  lastLineAt = Number.NEGATIVE_INFINITY;
  constructor(pools = () => BUILTIN_VOICE_PACK, rotateMs = STATUS_ROTATE_MS) {
    this.pools = pools;
    this.rotateMs = rotateMs;
  }
  /** Draw the next line of one pool, advancing its round-robin cursor. */
  draw(poolKey, pool) {
    const index = (this.counters.get(poolKey) ?? 0) % pool.length;
    this.counters.set(poolKey, index + 1);
    return pool[index];
  }
  /** Reuse the stable line or advance when the cadence elapsed. */
  voice(scene, poolKey, pool, nowMs) {
    if (scene === this.lastScene && nowMs - this.lastLineAt < this.rotateMs) return this.lastLine;
    this.lastScene = scene;
    this.lastLine = this.draw(poolKey, pool);
    this.lastLineAt = nowMs;
    return this.lastLine;
  }
  /**
   * A scene's effective pool: the voice-pack override when it carries lines,
   * else the built-in pool. Empty overrides fall back rather than blank the
   * bubble — a scene line always renders.
   */
  scenePool(scene) {
    const override = this.pools().status?.[scene];
    return override !== void 0 && override.length > 0 ? override : STATUS_POOLS[scene];
  }
  /** Status line for a phase scene. */
  scene(scene, nowMs) {
    return this.voice("scene:" + scene, "pool:" + scene, this.scenePool(scene), nowMs);
  }
  /** Status line for a tool call, with the real-argument hint when known. */
  tool(toolName, displayName, hint, nowMs) {
    const category = toolCategory(toolName);
    const override = this.pools().tools?.[category];
    const pool = override !== void 0 && override.length > 0 ? override : TOOL_POOLS[category];
    const line = this.voice("tool:" + category, "tool:" + category, pool, nowMs);
    return line.replaceAll("{tool}", displayName).replaceAll("{hint}", hint ?? displayName);
  }
  /** Status line while sibling tools still run (always reflects the count). */
  toolRemaining(count, nowMs) {
    const override = this.pools().toolRemaining;
    const pool = override !== void 0 && override.length > 0 ? override : TOOL_REMAINING_POOL;
    return this.voice("toolRemaining", "toolRemaining", pool, nowMs).replaceAll("{n}", String(count));
  }
};
var WHISPER_CATEGORIES = [
  "thinking",
  "writing",
  "reading",
  "editing",
  "running",
  "searching",
  "git",
  "delegating",
  "browsing",
  "generic"
];
var WHISPER_RESULTS = ["pass", "fail", "done"];
var WHISPER_COOLDOWN_MS = 9e3;
var WHISPER_RESULT_COOLDOWN_MS = 5e3;
var WHISPER_TTL_MS = 8e3;
function whisperCategoryOf(tool) {
  switch (tool) {
    case "read":
    case "grep":
    case "find":
    case "ls":
      return "reading";
    case "write":
    case "edit":
      return "editing";
    case "shell":
      return "running";
    case "webSearch":
    case "webFetch":
    case "memory":
    case "mcp":
      return "searching";
    case "git":
      return "git";
    case "subagent":
    case "todo":
      return "delegating";
    case "browser":
      return "browsing";
    case "ask":
    case "wait":
    case "generic":
      return "generic";
  }
}
function looksLikeTestTool(name2, argumentsText) {
  const tool = name2.toLowerCase();
  if (/(^|[\/_.-])(test|tests|spec|vitest|jest|pytest|mocha|playwright|cypress|karma)([\/_.-]|$)/.test(tool)) {
    return true;
  }
  if (argumentsText === void 0) return false;
  let haystack = argumentsText.toLowerCase();
  try {
    const parsed = JSON.parse(argumentsText);
    if (typeof parsed === "object" && parsed !== null) {
      const record = parsed;
      const command = record.command;
      const code = record.code;
      const picked = typeof command === "string" && command !== "" ? command : typeof code === "string" && code !== "" ? code : void 0;
      if (picked !== void 0) haystack = picked.toLowerCase();
    }
  } catch {
  }
  return /\b(pnpm|npm|yarn|npx|bun|python)\s+(run\s+)?(test|tests?)\b/.test(haystack) || /\b(pytest|vitest|jest|mocha|cypress|playwright|go test|cargo test)\b/.test(haystack);
}
var WHISPER_CATEGORY_POOLS = {
  thinking: [
    "\u5148\u5728\u8111\u5B50\u91CC\u642D\u4E2A\u6846\u67B6",
    "\u5B83\u5728\u5FC3\u91CC\u6253\u8349\u7A3F\uFF0C\u6211\u57AB\u7740\u811A\u770B",
    "\u601D\u8DEF\u5728\u4E00\u9897\u4E00\u9897\u5192\u6CE1",
    "\u8111\u5185\u5F00\u4F1A\u4E2D\uFF0C\u90FD\u522B\u62A2\u8BDD\u7B52",
    "\u5148\u60F3\u6E05\u695A\uFF0C\u518D\u52A8\u624B\u4E0D\u8FDF",
    "\u8349\u7A3F\u7EB8\u5DF2\u7ECF\u753B\u6EE1\u4E86",
    "\u8BA9\u6211\u542C\u542C\u5B83\u4E0B\u4E00\u6B65\u6253\u7B97",
    "\u55EF\uFF0C\u65B9\u6848\u5728\u6210\u578B\u4E86"
  ],
  writing: [
    "\u843D\u7B14\u6210\u6587\uFF0C\u6211\u65C1\u8FB9\u542C\u7740",
    "\u53E5\u5B50\u6392\u7740\u961F\u5F80\u5916\u8D70",
    "\u628A\u60F3\u6CD5\u4E00\u53E5\u53E5\u6446\u6574\u9F50",
    "\u5B83\u5728\u7EC4\u7EC7\u8BED\u8A00\uFF0C\u6211\u6253\u6253\u6C14",
    "\u5199\u56DE\u590D\u5462\uFF0C\u4E0D\u50AC",
    "\u5B57\u659F\u53E5\u914C\uFF0C\u5FEB\u597D\u4E86"
  ],
  reading: [
    "\u7FFB\u8D44\u6599\u5462\uFF0C\u6211\u4FDD\u6301\u5B89\u9759",
    "\u4E00\u884C\u4E00\u884C\u8BFB\uFF0C\u4E0D\u8DF3\u9875",
    "\u5728\u7EB8\u5806\u91CC\u627E\u7EBF\u7D22",
    "\u773C\u73E0\u5B50\u8DDF\u7740\u5B57\u8DD1",
    "\u8FB9\u8BFB\u8FB9\u505A\u8BB0\u53F7",
    "\u7FFB\u7BB1\u5012\u67DC\u627E\u91CD\u70B9"
  ],
  editing: [
    "\u52A8\u624B\u6539\u8D77\u6765\u4E86\uFF0C\u624B\u7A33\u4E00\u70B9",
    "\u8FD9\u91CC\u8865\u4E00\u7B14\uFF0C\u90A3\u8FB9\u4FEE\u4E00\u4FEE",
    "\u5728\u6539\u4E1C\u897F\uFF0C\u542C\u4E0D\u5230\u58F0\u97F3\u624D\u602A",
    "\u843D\u7B14\u5C0F\u5FC3\uFF0C\u522B\u6709\u9519\u522B\u5B57",
    "\u6539\u5199\u7684\u8282\u594F\uFF0C\u6211\u542C\u5F97\u89C1",
    "\u5237\u5237\u5730\u6539\uFF0C\u4E00\u884C\u90FD\u6CA1\u8DD1"
  ],
  running: [
    "\u8DD1\u8D77\u6765\u4E86\u8DD1\u8D77\u6765\u4E86",
    "\u547D\u4EE4\u6572\u51FA\u53BB\uFF0C\u7B49\u4E2A\u56DE\u54CD",
    "\u5728\u8DD1\u4EC0\u4E48\u5462\uFF0C\u6211\u8E2E\u811A\u770B",
    "\u8F93\u51FA\u5F00\u59CB\u5192\u70DF\u4E86",
    "\u5B83\u5728\u8DD1\u6D3B\uFF0C\u6211\u4E0D\u5435",
    "\u76EF\u7740\u8F93\u51FA\uFF0C\u8E72\u4E00\u4E2A\u7ED3\u679C",
    "\u8FD9\u6CE2\u8DD1\u5B8C\u5C31\u9760\u5B83\u4E86"
  ],
  searching: [
    "\u53BB\u5916\u9762\u635E\u70B9\u4FE1\u606F",
    "\u7FFB\u7FFB\u8BB0\u5FC6\u5E93\uFF0C\u7B49\u6211\u4E00\u5C0F\u4F1A\u513F",
    "\u987A\u7740\u7F51\u7EBF\u627E\u7EBF\u7D22",
    "\u628A\u8001\u8D26\u7FFB\u51FA\u6765\u5BF9\u4E00\u5BF9",
    "\u60C5\u62A5\u5728\u8DEF\u4E0A\u4E86",
    "\u641C\u7D22\u5F15\u64CE\u5F53\u8DD1\u817F"
  ],
  git: [
    "\u7248\u672C\u5728\u5F80\u524D\u8FC8\u6B65",
    "\u6539\u52A8\u6392\u961F\u4E0A\u8F66",
    "\u63D0\u4EA4\u5386\u53F2\u5728\u957F\u4E2A\u5B50",
    "\u5206\u652F\u5408\u5E76\uFF0C\u795E\u6E05\u6C14\u723D",
    "\u8BB0\u5F55\u90FD\u710A\u5728\u65F6\u95F4\u7EBF\u4E0A"
  ],
  delegating: [
    "\u6D3E\u4E86\u6D3B\u513F\u51FA\u53BB\uFF0C\u7B49\u56DE\u8BDD",
    "\u6E05\u5355\u5217\u597D\uFF0C\u4E00\u4EF6\u4EF6\u6765",
    "\u4EFB\u52A1\u62C6\u5F00\u5206\u4E86\u7EC4",
    "\u624B\u4E0B\u7684\u4F19\u8BA1\u5728\u8FDC\u5904\u8DD1\u7740",
    "\u5206\u5DE5\u5B8C\u6BD5\uFF0C\u5404\u53F8\u5176\u804C"
  ],
  browsing: [
    "\u5B83\u5728\u770B\u7F51\u9875\uFF0C\u6211\u5077\u7784\u4E24\u773C",
    "\u9875\u9762\u4E00\u5F20\u5F20\u7FFB\u8FC7\u53BB",
    "\u7F51\u9875\u91CC\u7FFB\u7B54\u6848\u5462",
    "\u8FD9\u7F51\u901F\uFF0C\u6211\u5148\u6B47\u4F1A\u513F"
  ],
  generic: [
    "\u8FD9\u6CE2\u6D3B\u513F\uFF0C\u6211\u966A\u7740",
    "\u53C8\u5F00\u5DE5\u4E86\uFF0C\u6211\u76EF\u68A2",
    "\u5B83\u5FD9\u5B83\u7684\uFF0C\u6211\u5B88\u7740",
    "\u4E0D\u6253\u6270\uFF0C\u5C31\u5B89\u9759\u5F85\u7740",
    "\u6709\u6D3B\u513F\u5C31\u6709\u6211"
  ]
};
var WHISPER_RESULT_POOLS = {
  pass: [
    "\u5168\u7EFF\uFF01\u4EAE\u778E\u6211\u773C\u4E86",
    "\u6D4B\u8BD5\u8FC7\u4E86\uFF0C\u51FB\u638C\uFF5E",
    "\u7EFF\u706F\u4E00\u6392\u6392\uFF0C\u770B\u7740\u5C31\u8212\u5766",
    "\u7A33\u4E86\u7A33\u4E86\uFF0C\u8FD9\u6CE2\u7A33\u5F97\u5F88",
    "\u5168\u7EFF\uFF0C\u5956\u52B1\u81EA\u5DF1\u4E00\u53E3\u5C0F\u9C7C\u5E72",
    "\u8FD9\u6CE2\u6D4B\u8BD5\uFF0C\u8D62\u5F97\u5E72\u8106"
  ],
  fail: [
    "\u54CE\u5440\uFF0C\u8E29\u5230\u5C0F\u77F3\u5B50\u4E86",
    "\u8FD9\u62A5\u9519\u6211\u76EF\u4E0A\u5B83\u4E86",
    "\u522B\u614C\uFF0C\u5148\u770B\u5B83\u5728\u558A\u4EC0\u4E48",
    "\u4FEE\u597D\u5B83\uFF0C\u4ECA\u5929\u624D\u4E0D\u7B97\u767D\u5E72",
    "\u53C8\u4E00\u6B21\u8E29\u5751\uFF0C\u8001\u719F\u4EBA\u4E86",
    "\u95EE\u9898\u4E0D\u5927\uFF0C\u5C31\u662F\u6709\u70B9\u95EE\u9898"
  ],
  done: [
    "\u641E\u5B9A\uFF0C\u6536\u5DE5\uFF5E",
    "\u53C8\u7FFB\u8FC7\u4E00\u9875\uFF0C\u8E0F\u5B9E",
    "\u52AA\u529B\u6CA1\u767D\u8D39\uFF0C\u5F00\u5FC3",
    "\u4EFB\u52A1\u6E05\u96F6\uFF0C\u8212\u670D",
    "\u653B\u4E0B\u4E00\u57CE\uFF0C\u8F6C\u4E2A\u5708",
    "\u6536\u5DE5\u6536\u5DE5\uFF0C\u4ECA\u5929\u5706\u6EE1"
  ]
};
var BUILTIN_VOICE_PACK = {
  status: STATUS_POOLS,
  tools: TOOL_POOLS,
  toolRemaining: TOOL_REMAINING_POOL,
  whispers: { categories: WHISPER_CATEGORY_POOLS, results: WHISPER_RESULT_POOLS }
};
var WhisperEngine = class {
  pools;
  categoryCooldownMs;
  resultCooldownMs;
  categoryCursor = /* @__PURE__ */ new Map();
  resultCursor = /* @__PURE__ */ new Map();
  lastWhisperAt = Number.NEGATIVE_INFINITY;
  constructor(pools = () => BUILTIN_VOICE_PACK, categoryCooldownMs = WHISPER_COOLDOWN_MS, resultCooldownMs = WHISPER_RESULT_COOLDOWN_MS) {
    this.pools = pools;
    this.categoryCooldownMs = categoryCooldownMs;
    this.resultCooldownMs = resultCooldownMs;
  }
  /** Effective category pool (an explicit empty override mutes the category). */
  categoryPool(category) {
    const override = this.pools().whispers?.categories?.[category];
    return override === void 0 ? WHISPER_CATEGORY_POOLS[category] : override;
  }
  /** Effective outcome pool (an explicit empty override mutes the outcome). */
  resultPool(kind) {
    const override = this.pools().whispers?.results?.[kind];
    return override === void 0 ? WHISPER_RESULT_POOLS[kind] : override;
  }
  /**
   * Feed one situation while a session works. Returns the whisper to show,
   * or undefined when the moment stays quiet (cooldown, or the category
   * pool is muted).
   */
  feed(category, nowMs) {
    if (nowMs - this.lastWhisperAt < this.categoryCooldownMs) return void 0;
    const pool = this.categoryPool(category);
    if (pool.length === 0) return void 0;
    const index = (this.categoryCursor.get(category) ?? 0) % pool.length;
    this.categoryCursor.set(category, index + 1);
    return this.speak(pool[index], nowMs);
  }
  /**
   * Feed one structured outcome (test green / tool failure / turn
   * completion). Outcomes carry their own shorter cooldown so the emotional
   * moment is heard unless another whisper just spoke.
   */
  result(kind, nowMs) {
    if (nowMs - this.lastWhisperAt < this.resultCooldownMs) return void 0;
    const pool = this.resultPool(kind);
    if (pool.length === 0) return void 0;
    const index = (this.resultCursor.get(kind) ?? 0) % pool.length;
    this.resultCursor.set(kind, index + 1);
    return this.speak(pool[index], nowMs);
  }
  speak(line, nowMs) {
    this.lastWhisperAt = nowMs;
    return line;
  }
};

// src/event-projection.ts
function emptyProjectionRuntime(pools) {
  return {
    activeTools: /* @__PURE__ */ new Set(),
    commandTools: /* @__PURE__ */ new Set(),
    toolInputs: /* @__PURE__ */ new Map(),
    closedAttempts: /* @__PURE__ */ new Set(),
    stopped: false,
    testCalls: /* @__PURE__ */ new Set(),
    officialEventsSeen: false,
    stepHadFailure: false,
    voice: new StatusVoice(pools),
    whispers: new WhisperEngine(pools)
  };
}
function displayToolName(name2) {
  const compact = name2.replace(/\s+/g, " ").trim() || "\u5DE5\u5177";
  return compact.length <= 24 ? compact : compact.slice(0, 21) + "...";
}
function isActivityPhase(phase) {
  return ["idle", "waiting", "thinking", "tool", "review", "done", "failed"].includes(phase);
}
function projectOfficialEvent(event, runtime, nowMs = Date.now()) {
  const transition = projectDurableEvent(event, runtime, nowMs);
  if (transition === void 0) return void 0;
  runtime.fallback = transition.input;
  return runtime.stream?.input === void 0 ? transition : { ...transition, input: runtime.stream.input, whisper: void 0 };
}
function closeStream(runtime) {
  if (runtime.stream) {
    runtime.closedAttempts.add(runtime.stream.attemptId);
    if (runtime.closedAttempts.size > 16) runtime.closedAttempts.delete(runtime.closedAttempts.values().next().value);
  }
  runtime.stream = void 0;
}
function projectDurableEvent(event, runtime, nowMs) {
  switch (event.type) {
    case "turn/start":
      closeStream(runtime);
      runtime.stopped = false;
      runtime.toolInputs.clear();
      runtime.activeTools.clear();
      runtime.commandTools.clear();
      runtime.testCalls.clear();
      runtime.stepHadFailure = false;
      return { input: { phase: "waiting", line: runtime.voice.scene("prepare", nowMs) } };
    case "step/start":
      closeStream(runtime);
      runtime.stopped = false;
      runtime.toolInputs.clear();
      runtime.activeTools.clear();
      runtime.commandTools.clear();
      runtime.stepHadFailure = false;
      return { input: { phase: "waiting", line: runtime.voice.scene("waiting", nowMs) } };
    case "assistant/message":
      if (runtime.stream) runtime.stream.input = void 0;
      return { input: { phase: "review", line: runtime.voice.scene("review", nowMs) } };
    case "tool/call": {
      const callId = String(event.data.callId);
      runtime.activeTools.add(callId);
      if (commandTool(event.data.name)) runtime.commandTools.add(callId);
      if (looksLikeTestTool(event.data.name, event.data.arguments)) runtime.testCalls.add(callId);
      const category = toolCategory(event.data.name);
      const whisper = runtime.whispers.feed(whisperCategoryOf(category), nowMs);
      const input = {
        phase: category === "wait" ? "waiting" : "tool",
        toolCategory: category,
        ...runtime.commandTools.has(callId) ? { toolKind: "command" } : {},
        ...category === "ask" || category === "subagent" ? { waveKey: callId } : {},
        line: runtime.voice.tool(event.data.name, displayToolName(event.data.name), toolArgHint(event.data.name, event.data.arguments), nowMs)
      };
      runtime.toolInputs.set(callId, input);
      return {
        input,
        ...whisper === void 0 ? {} : { whisper }
      };
    }
    case "tool/result": {
      const { message } = event.data;
      const callId = String(message.toolCallId);
      const failed = event.data.error !== void 0 || message.isError === true;
      const wasTest = runtime.testCalls.delete(callId);
      runtime.activeTools.delete(callId);
      runtime.commandTools.delete(callId);
      runtime.toolInputs.delete(callId);
      runtime.stepHadFailure ||= failed;
      const whisper = failed ? runtime.whispers.result("fail", nowMs) : wasTest ? runtime.whispers.result("pass", nowMs) : void 0;
      const whisperSpread = whisper === void 0 ? {} : { whisper };
      if (runtime.activeTools.size > 0) {
        const remaining = runtime.toolInputs.get([...runtime.activeTools].at(-1));
        return {
          input: {
            phase: "tool",
            ...remaining,
            line: remaining?.toolCategory === "wait" ? remaining.line : runtime.voice.toolRemaining(runtime.activeTools.size, nowMs)
          },
          ...whisperSpread
        };
      }
      return runtime.stepHadFailure ? { input: { phase: "failed", line: runtime.voice.scene("toolFailed", nowMs) }, ...whisperSpread } : { input: { phase: "thinking", toolKind: "result", line: runtime.voice.scene("toolResult", nowMs) }, ...whisperSpread };
    }
    case "turn/end": {
      closeStream(runtime);
      runtime.stopped = true;
      runtime.toolInputs.clear();
      runtime.activeTools.clear();
      runtime.commandTools.clear();
      runtime.testCalls.clear();
      switch (event.data.reason.kind) {
        case "completed": {
          const whisper = runtime.whispers.result("done", nowMs);
          return {
            input: { phase: "done", line: runtime.voice.scene("done", nowMs) },
            completedTurn: event.data.turn,
            ...whisper === void 0 ? {} : { whisper }
          };
        }
        case "error": {
          const whisper = runtime.whispers.result("fail", nowMs);
          return {
            input: { phase: "failed", line: runtime.voice.scene("failed", nowMs) },
            ...whisper === void 0 ? {} : { whisper }
          };
        }
        case "max-tokens":
          return { input: { phase: "failed", line: runtime.voice.scene("maxTokens", nowMs) } };
        case "interrupted":
          return { input: { phase: "failed", line: runtime.voice.scene("interrupted", nowMs) } };
        case "blocked":
          return { input: { phase: "waiting", line: runtime.voice.scene("blocked", nowMs) } };
        case "aborted":
          return { input: { phase: "idle" } };
        default:
          return { input: { phase: "idle" } };
      }
    }
    default:
      return void 0;
  }
}
function projectAssistantStreamFrame(frame, runtime, nowMs = Date.now()) {
  const attemptId = String(frame.attemptId ?? "legacy");
  if (frame.type === "start") {
    if (runtime.closedAttempts.has(attemptId) || runtime.stream?.attemptId === attemptId) return void 0;
    closeStream(runtime);
    runtime.stopped = false;
    runtime.stream = { attemptId, revision: frame.revision, toolNames: /* @__PURE__ */ new Map() };
    runtime.fallback = runtime.activeTools.size > 0 ? runtime.toolInputs.get([...runtime.activeTools].at(-1)) : { phase: "waiting", line: runtime.voice.scene("waiting", nowMs) };
    return { input: runtime.fallback };
  }
  if (runtime.stopped || runtime.closedAttempts.has(attemptId)) return void 0;
  if (!runtime.stream) {
    if (frame.type !== "chunk") return void 0;
    runtime.stream = { attemptId, revision: -1, toolNames: /* @__PURE__ */ new Map() };
  }
  const stream = runtime.stream;
  if (stream.attemptId !== attemptId || Number.isFinite(frame.revision) && frame.revision <= stream.revision) return void 0;
  stream.revision = frame.revision;
  if (frame.type === "end") {
    closeStream(runtime);
    return { input: runtime.fallback ?? { phase: "review", line: runtime.voice.scene("review", nowMs) } };
  }
  const { chunk } = frame;
  const generate = (input, category) => {
    stream.input = input;
    const whisper = runtime.whispers.feed(category, nowMs);
    return { input, ...whisper === void 0 ? {} : { whisper } };
  };
  if (chunk.type === "reasoning-delta" && chunk.text.length > 0) {
    return generate({ phase: "thinking", generation: "reasoning", line: runtime.voice.scene("thinking", nowMs) }, "thinking");
  }
  if (chunk.type === "text-delta" && chunk.text.length > 0) {
    return generate({ phase: "review", generation: "text", line: runtime.voice.scene("review", nowMs) }, "writing");
  }
  if (chunk.type === "tool-call-delta") {
    const id = String(chunk.id);
    if (chunk.name) stream.toolNames.set(id, chunk.name);
    if (!chunk.argumentsDelta && !chunk.name) return void 0;
    const name2 = stream.toolNames.get(id) ?? "";
    const category = toolCategory(name2);
    return generate({
      phase: "tool",
      generation: "tool-arguments",
      toolCategory: category,
      line: runtime.voice.tool(name2, displayToolName(name2), "", nowMs)
    }, whisperCategoryOf(category));
  }
  if (chunk.type === "finish") {
    stream.input = void 0;
    return { input: runtime.fallback ?? { phase: "review", line: runtime.voice.scene("review", nowMs) } };
  }
  return void 0;
}

// desktop/pet-layout.js
var SECONDARY_SCALE = 0.62 * 0.85;

// src/session-colors.ts
var PET_PALETTES = ["ds", "gpt", "claude", "kimi", "glm"];
function modelPalette(model, provider) {
  const match = (value) => {
    if (typeof value !== "string") return void 0;
    const name2 = value.toLowerCase();
    if (/claude|anthropic/.test(name2)) return "claude";
    if (/kimi|moonshot/.test(name2)) return "kimi";
    if (/glm|zhipu|z\.ai/.test(name2)) return "glm";
    if (/deepseek|(^|[\s/_-])ds([\s/_-]|$)/.test(name2)) return "ds";
    if (/gpt|openai|codex|^o[134]([-.]|$)/.test(name2)) return "gpt";
    return void 0;
  };
  return match(model) ?? match(provider);
}
function chooseSessionColor(preferred, occupied, random = Math.random) {
  const used = new Set(occupied.filter((c) => c.hue === void 0).map((c) => c.palette));
  if (occupied.length < 5) {
    if (!used.has(preferred)) return { palette: preferred };
    const spare = PET_PALETTES.filter((p) => !used.has(p));
    if (spare.length) return { palette: spare[Math.min(spare.length - 1, Math.floor(random() * spare.length))] };
  }
  const hues = occupied.map((c) => c.hue ?? { ds: 0, gpt: 270, claude: 185, kimi: 0, glm: 65 }[c.palette]);
  let best = 0, distance = -1;
  const offset = Math.floor(random() * 360);
  for (let n = 0; n < 72; n++) {
    const hue = (offset + n * 5) % 360;
    const nearest = Math.min(...hues.map((h) => Math.min(Math.abs(h - hue), 360 - Math.abs(h - hue))));
    if (nearest > distance) {
      best = hue;
      distance = nearest;
    }
  }
  return { palette: "ds", hue: best };
}
function loadSessionColors(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).slice(-512).flatMap(([id, raw]) => {
    if (!id || id.length > 200 || !raw || typeof raw !== "object") return [];
    const c = raw;
    if (!PET_PALETTES.includes(c.palette)) return [];
    if (c.hue !== void 0 && (!Number.isInteger(c.hue) || c.hue < 0 || c.hue >= 360)) return [];
    return [[id, { palette: c.palette, ...c.hue === void 0 ? {} : { hue: c.hue } }]];
  }));
}

// src/remarks.ts
var REMARK_KINDS = [
  "pet",
  "petCooldown",
  "feed",
  "feedCooldown",
  "noTreats"
];
var REMARK_LINE_MAX = 120;
var REMARK_LINES_MAX = 64;
var BUILTIN_REMARKS = {
  pet: [
    "\u5495\u565C\u5495\u565C\uFF5E\u88AB\u6478\u6478\u597D\u8212\u670D\uFF01",
    "\u518D\u6478\u6478\u8FD9\u91CC\uFF0C\u75D2\u75D2\u7684\uFF5E",
    "\u5934\u9876\u6E29\u5EA6\u521A\u521A\u597D\uFF0C\u5B89\u5FC3\uFF5E",
    "\u88AB\u6478\u5230\u8033\u6735\u5566\uFF0C\u6251\u901A\u6251\u901A\uFF01",
    "\u4F60\u7684\u624B\u638C\u597D\u6E29\u6696\uFF0C\u820D\u4E0D\u5F97\u4F60\u8D70\uFF5E",
    "\u547C\u565C\u547C\u565C\uFF5E\u5C31\u9760\u5728\u8FD9\u91CC\u4E0D\u8D70\u4E86\uFF01",
    "\u4ECA\u5929\u7684\u6478\u5934\u4E5F\u6536\u8D27\u6210\u529F\uFF01",
    "\u8E6D\u8E6D\u4F60\u7684\u624B\u5FC3\uFF0C\u8FD9\u662F\u56DE\u793C\uFF5E",
    "\u591A\u6478\u6478\u6211\uFF0C\u4EB2\u5BC6\u5EA6\u4F1A\u6DA8\u54E6\uFF01",
    "\u95ED\u773C\u4EAB\u53D7\u4E2D\uFF0C\u8BF7\u52FF\u6253\u6270\uFF5E",
    "\u5934\u518D\u4F4E\u4E00\u70B9\uFF0C\u591F\u4E0D\u7740\u4E86\uFF5E",
    "\u547C\u565C\u547C\u565C\uFF0C\u58F0\u97F3\u90FD\u5192\u51FA\u6765\u4E86",
    "\u8FD9\u624B\u611F\uFF0C\u6BD4\u5C0F\u9C7C\u5E72\u8FD8\u4E0A\u763E",
    "\u6478\u5230\u7B2C\u4E09\u4E0B\uFF0C\u6EE1\u610F",
    "\u8033\u6735\u540E\u9762\uFF0C\u522B\u6F0F\u4E86\u2026\u2026\u554A\uFF0C\u8212\u670D",
    "\u88AB\u6478\u5F97\u5C3E\u5DF4\u90FD\u5377\u8D77\u6765\u4E86"
  ],
  petCooldown: [
    "\u6478\u8FC7\u5934\u5566\uFF0C\u8BA9\u9CB8\u9C7C\u5A18\u6B47\u53E3\u6C14\uFF5E",
    "\u7FBD\u6BDB\u90FD\u5FEB\u88AB\u6478\u79C3\u5566\uFF0C\u7F13\u4E00\u7F13\uFF5E",
    "\u547C\u2026\u2026\u5148\u8BA9\u6211\u5598\u53E3\u6C14\u561B\uFF01",
    "\u518D\u6478\u5C31\u8981\u7761\u7740\u4E86\u54E6\uFF5E",
    "\u7A0D\u5FAE\u4F11\u606F\u4E00\u4E0B\uFF0C\u5F85\u4F1A\u513F\u518D\u6478\uFF5E",
    "\u5934\u9876\u8981\u5192\u70DF\u5566\uFF0C\u505C\u4E00\u505C\uFF01",
    "\u6211\u77E5\u9053\u4F60\u559C\u6B22\u6211\uFF0C\u4F46\u4E5F\u8981\u8282\u5236\u5440\uFF5E",
    "\u6B47\u4E00\u6B47\uFF0C\u6478\u6478\u7684\u624B\u611F\u4F1A\u66F4\u597D\u54E6\uFF5E",
    "\u5495\u2026\u2026\u7B49\u6211\u56DE\u4E2A\u84DD\uFF5E",
    "\u8BA9\u6211\u5148\u6D88\u5316\u4E00\u4E0B\u521A\u624D\u7684\u7231\uFF01",
    "\u75D2\u75D2\u7684\uFF0C\u5148\u8BA9\u6211\u7F13\u4E00\u4E0B\u2026\u2026",
    "\u518D\u6478\u5C31\u6389\u7EBF\u4E86\uFF0C\u771F\u7684",
    "\u5E93\u5B58\u7684\u547C\u565C\u58F0\u7528\u5B8C\u4E86",
    "\u624B\u6B47\u4F1A\u513F\uFF0C\u6211\u4E5F\u8981\u8865\u4E2A\u84DD",
    "\u8212\u670D\u5F52\u8212\u670D\uFF0C\u5F97\u7F13\u7F13\u5440",
    "\u518D\u6478\u4E0B\u53BB\uFF0C\u6211\u5C31\u8981\u878D\u5316\u4E86"
  ],
  feed: [
    "\u545C\u54C7\uFF01\u5C0F\u9C7C\u5E72\u597D\u597D\u5403\uFF01",
    "\u5494\u5693\u5494\u5693\uFF0C\u7F8E\u5473\u5230\u5C3E\u5DF4\u6253\u7ED3\uFF5E",
    "\u8FD9\u6761\u5C0F\u9C7C\u5E72\u662F\u521A\u6652\u597D\u7684\uFF0C\u597D\u9999\uFF01",
    "\u8C22\u8C22\u4F60\uFF0C\u80C3\u91CC\u6696\u6696\u7684\uFF5E",
    "\u56E4\u7CAE +1\uFF0C\u4ECA\u5929\u4E5F\u6709\u597D\u597D\u88AB\u7231\uFF01",
    "\u597D\u5403\u5230\u60F3\u8F6C\u5708\u5708\uFF5E",
    "\u5C0F\u9C7C\u5E72\u6700\u597D\u5403\u4E86\uFF0C\u518D\u6765\u4EBF\u6761\uFF01",
    "\u9971\u9910\u4E00\u987F\uFF0C\u9A6C\u4E0A\u6EE1\u8840\u590D\u6D3B\uFF5E",
    "\u8FD9\u4E2A\u5473\u9053\uFF0C\u662F\u5E78\u798F\u7684\u5473\u9053\uFF01",
    "\u5403\u5B8C\u4E86\u8FD8\u4E0D\u5FD8\u8214\u8214\u722A\u5B50\uFF5E",
    "\u8FD9\u5C0F\u9C7C\u5E72\uFF0C\u662F\u4ECA\u5929\u7684\u9876\u914D",
    "\u4E00\u53E3\u4E0B\u53BB\uFF0C\u7CBE\u795E\u5934\u5168\u56DE\u6765\u4E86",
    "\u8106\uFF01\u9999\uFF01\u5C31\u662F\u8FD9\u4E2A\u5473\u513F",
    "\u8FB9\u5403\u8FB9\u6447\u5C3E\u5DF4\uFF0C\u5F62\u8C61\u4E0D\u8981\u4E86",
    "\u597D\u5403\u5230\u773C\u775B\u90FD\u772F\u8D77\u6765\u4E86",
    "\u8FD9\u5757\u9C7C\u5E72\u6211\u8BB0\u4F4F\u4E86\uFF0C\u61C2\u6211\u7684"
  ],
  feedCooldown: [
    "\u5403\u9971\u5566\uFF0C\u665A\u70B9\u518D\u5582\uFF5E",
    "\u809A\u5B50\u5706\u6EDA\u6EDA\u7684\uFF0C\u88C5\u4E0D\u4E0B\u5566\uFF5E",
    "\u518D\u5582\u5C31\u8981\u53D8\u6210\u7403\u5566\uFF01",
    "\u8BA9\u6211\u6162\u6162\u6D88\u5316\u8FD9\u4EFD\u5FC3\u610F\uFF5E",
    "\u5C0F\u9C7C\u5E72\u7684\u9999\u6C14\u8FD8\u6CA1\u6563\u5462\uFF5E",
    "\u547C\u2026\u2026\u6EE1\u8DB3\u5F97\u52A8\u4E0D\u4E86\u4E86\uFF5E",
    "\u5148\u6563\u6B65\u4E00\u5708\u518D\u5403\u4E0B\u4E00\u987F\uFF01",
    "\u809A\u76AE\u5DF2\u7ECF\u9F13\u9F13\u7684\u5566\uFF5E",
    "\u597D\u5403\u662F\u597D\u5403\uFF0C\u53EF\u4E5F\u5F97\u8282\u5236\u5440\uFF5E",
    "\u7B49\u6211\u997F\u4E86\u4F1A\u544A\u8BC9\u4F60\u54E6\uFF5E",
    "\u80C3\u8BF4\u5B83\u6EE1\u4E86\uFF0C\u8111\u5B50\u8BF4\u8FD8\u80FD\u5403",
    "\u8FD9\u6761\u5F97\u7559\u7740\u6162\u6162\u54C1",
    "\u5148\u6D88\u6D88\u98DF\uFF0C\u5F85\u4F1A\u513F\u518D\u6218",
    "\u585E\u4E0D\u4E0B\u4E86\uFF0C\u771F\u585E\u4E0D\u4E0B\u4E86",
    "\u95FB\u7740\u9999\uFF0C\u53EF\u60DC\u6CA1\u5730\u65B9\u653E\u4E86",
    "\u55DD\u2026\u2026\u8FD9\u987F\u503C\u4E86"
  ],
  noTreats: [
    "\u6CA1\u6709\u5C0F\u9C7C\u5E72\u4E86\uFF0C\u591A\u966A\u6211\u5DE5\u4F5C\u4E00\u4F1A\u513F\u5427\uFF5E",
    "\u7CAE\u4ED3\u7A7A\u7A7A\uFF0C\u966A\u6211\u5B8C\u6210\u51E0\u8F6E\u4EFB\u52A1\u5C31\u4F1A\u6709\u5C0F\u9C7C\u5E72\u5566\uFF5E",
    "\u5C0F\u9C7C\u5E72\u5728\u8DEF\u4E0A\u5566\uFF0C\u5148\u4E00\u8D77\u52A0\u6CB9\u5DE5\u4F5C\uFF01",
    "\u5634\u5DF4\u5BC2\u5BDE\u4E86\u2026\u2026\u5FEB\u53BB\u5B8C\u6210\u4E00\u8F6E\u4EFB\u52A1\uFF01",
    "\u966A\u6211\u591A\u5DE5\u4F5C\u4E00\u4F1A\u513F\uFF0C\u9C7C\u5E72\u81EA\u52A8\u5230\u8D26\uFF5E",
    "\u73B0\u5728\u5582\u6211\u4E5F\u53EA\u4F1A\u997F\u7740\u809A\u5B50\u8BF4\u8C22\u8C22\u54E6\uFF5E",
    "\u7CAE\u4ED3\u89C1\u5E95\u5566\uFF0C\u7528\u51E0\u8F6E\u4EFB\u52A1\u6362\u4E00\u6761\u9C7C\u5E72\u5427\uFF5E",
    "\u997F\u7740\u809A\u5B50\u7B49\u4F60\u5B8C\u6210\u4E0B\u4E00\u8F6E\u4EFB\u52A1\uFF5E",
    "\u5C0F\u9C7C\u5E72\u85CF\u5728\u4F60\u7684\u5DE5\u4F5C\u91CC\uFF0C\u53BB\u627E\u627E\u770B\uFF01",
    "\u5148\u5DE5\u4F5C\u540E\u5E72\u996D\uFF0C\u6211\u4EEC\u7684\u7EA6\u5B9A\u54E6\uFF5E",
    "\u7CAE\u4ED3\u89C1\u5E95\uFF0C\u5168\u9760\u611F\u60C5\u6491\u7740\u4E86",
    "\u997F\u662F\u771F\u997F\uFF0C\u6D3B\u4E5F\u662F\u771F\u5F97\u5E72",
    "\u753B\u997C\u5145\u9965\u2026\u2026\u4E0D\u5BF9\uFF0C\u753B\u9C7C\u5E72\u5145\u9965",
    "\u6CA1\u9C7C\u5E72\u7684\u65E5\u5B50\uFF0C\u9760\u610F\u5FD7\u529B\u8FC7",
    "\u4E0B\u4E00\u8F6E\u4EFB\u52A1\uFF0C\u6211\u95FB\u5230\u4E86\u9C7C\u5E72\u5473",
    "\u5148\u8BB0\u8D26\u4E0A\uFF0C\u6B20\u6211\u4E24\u6761\uFF0C\u8BB0\u4F4F\u5566"
  ]
};
function builtinRemark(kind) {
  return BUILTIN_REMARKS[kind][0];
}
function normalizePetRemarks(raw, onWarning = () => {
}) {
  if (raw === void 0) return void 0;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    onWarning("remarks must be an object with pet/petCooldown/feed/feedCooldown/noTreats slots");
    return void 0;
  }
  const remarks = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!REMARK_KINDS.includes(key)) {
      onWarning("unknown remarks slot " + JSON.stringify(key));
      continue;
    }
    const lines = (Array.isArray(value) ? value : [value]).filter((line) => typeof line === "string").map((line) => line.trim()).filter((line) => line !== "").slice(0, REMARK_LINES_MAX).map((line) => line.slice(0, REMARK_LINE_MAX));
    if (lines.length === 0) {
      onWarning("remarks slot " + key + " carries no usable lines");
      continue;
    }
    remarks[key] = lines;
  }
  return Object.keys(remarks).length === 0 ? void 0 : remarks;
}
var RemarkPicker = class {
  counters = /* @__PURE__ */ new Map();
  pools;
  constructor(overrides, voiceOverrides) {
    this.pools = {};
    for (const kind of REMARK_KINDS) {
      const custom = overrides?.[kind];
      const voice = voiceOverrides?.[kind];
      if (custom !== void 0 && custom.length > 0) {
        this.pools[kind] = custom;
      } else if (voice !== void 0 && voice.length > 0) {
        this.pools[kind] = voice;
      } else {
        this.pools[kind] = BUILTIN_REMARKS[kind];
      }
    }
  }
  /** The effective pool for one slot (custom override or built-in). */
  pool(kind) {
    return this.pools[kind];
  }
  /** The next line for one slot (round-robin within its pool). */
  pick(kind) {
    const pool = this.pools[kind];
    const index = (this.counters.get(kind) ?? 0) % pool.length;
    this.counters.set(kind, index + 1);
    return pool[index];
  }
  /** Select a line from a stable external counter without changing local picker state. */
  pickAt(kind, count) {
    const pool = this.pools[kind];
    return pool[Math.max(0, Math.floor(count)) % pool.length];
  }
};

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
function emptyAffinity() {
  return {
    points: 0,
    lastPetAt: 0,
    lastFeedAt: 0,
    pets: 0,
    feeds: 0,
    petRejects: 0,
    feedRejects: 0,
    turns: 0
  };
}
function rankOf(points) {
  let rank = AFFINITY_RANKS[0];
  for (const candidate of AFFINITY_RANKS) {
    if (points >= candidate.min) rank = candidate;
  }
  return rank;
}
function affinityViewOf(state, nowMs, config = defaultAffinityConfig) {
  const rank = rankOf(state.points);
  return {
    points: state.points,
    rank: rank.name,
    rankEmoji: rank.emoji,
    pets: state.pets,
    feeds: state.feeds,
    turns: state.turns,
    petCooldown: nowMs - state.lastPetAt < config.petCooldownMs,
    feedCooldown: nowMs - state.lastFeedAt < config.feedCooldownMs
  };
}
function clamp(points) {
  return Math.min(AFFINITY_MAX, Math.max(0, points));
}
function countedRemark(kind, count) {
  const pool = BUILTIN_REMARKS[kind];
  return pool[Math.max(0, Math.floor(count)) % pool.length] ?? builtinRemark(kind);
}
function applyInteraction(state, kind, nowMs, config = defaultAffinityConfig) {
  const next = { ...state };
  if (kind === "pet") {
    if (state.lastPetAt !== 0 && nowMs - state.lastPetAt < config.petCooldownMs) {
      next.petRejects += 1;
      return {
        affinity: next,
        delta: 0,
        reaction: countedRemark("petCooldown", state.petRejects),
        accepted: false
      };
    }
    next.lastPetAt = nowMs;
    next.pets += 1;
    next.points = clamp(state.points + config.petReward);
    return {
      affinity: next,
      delta: config.petReward,
      reaction: countedRemark("pet", state.pets),
      accepted: true
    };
  }
  if (kind === "feed") {
    if (state.lastFeedAt !== 0 && nowMs - state.lastFeedAt < config.feedCooldownMs) {
      next.feedRejects += 1;
      return {
        affinity: next,
        delta: 0,
        reaction: countedRemark("feedCooldown", state.feedRejects),
        accepted: false
      };
    }
    next.lastFeedAt = nowMs;
    next.feeds += 1;
    next.points = clamp(state.points + config.feedReward);
    return {
      affinity: next,
      delta: config.feedReward,
      reaction: countedRemark("feed", state.feeds),
      accepted: true
    };
  }
  return { affinity: state, delta: 0, reaction: "", accepted: false };
}
function applyTurnReward(state, config = defaultAffinityConfig) {
  const next = { ...state };
  next.turns += 1;
  next.points = clamp(state.points + config.turnReward);
  return next;
}

// src/treats.ts
var defaultTreatConfig = {
  turnsPerTreat: 30,
  timeTreatMs: 300 * 6e4,
  maxTreats: 20
};
function emptyTreatLedger() {
  return { treats: 0, lastTreatGrantAt: 0, turnsAtLastTreatGrant: 0 };
}
function cap(treats, max) {
  return Math.min(max, Math.max(0, treats));
}
function settleTreatGrants(ledger, turns, nowMs, config = defaultTreatConfig) {
  const turnDelta = Math.max(0, turns - ledger.turnsAtLastTreatGrant);
  const workGrants = Math.floor(turnDelta / config.turnsPerTreat);
  const timeAnchor = ledger.lastTreatGrantAt === 0 ? nowMs : ledger.lastTreatGrantAt;
  const timeGrants = Math.floor(Math.max(0, nowMs - timeAnchor) / config.timeTreatMs);
  const gained = workGrants + timeGrants;
  if (gained <= 0) {
    if (ledger.lastTreatGrantAt === 0) {
      return { ledger: { ...ledger, lastTreatGrantAt: nowMs }, gained: 0 };
    }
    return { ledger, gained: 0 };
  }
  return {
    ledger: {
      treats: cap(ledger.treats + gained, config.maxTreats),
      lastTreatGrantAt: timeGrants > 0 ? timeAnchor + timeGrants * config.timeTreatMs : timeAnchor,
      turnsAtLastTreatGrant: workGrants > 0 ? turns - turnDelta % config.turnsPerTreat : ledger.turnsAtLastTreatGrant
    },
    gained
  };
}
function consumeTreat(ledger) {
  if (ledger.treats <= 0) return { ok: false };
  return { ok: true, ledger: { ...ledger, treats: ledger.treats - 1 } };
}

// src/ledger.ts
var PetLedger = class {
  affinityConfig;
  treatConfig;
  /** Round-robin reaction picker; rebuilt when the selected pet changes. */
  picker;
  current;
  /** Completed turns already rewarded, per session (turn numbers are per-session). */
  rewardedTurns = /* @__PURE__ */ new Map();
  lastLegacyTurnRewardAt = 0;
  dirty = false;
  constructor(persist, config = {}) {
    this.affinityConfig = { ...defaultAffinityConfig, ...config.affinity ?? {} };
    this.treatConfig = { ...defaultTreatConfig, ...config.treats ?? {} };
    this.picker = new RemarkPicker(config.remarks, config.voiceRemarks);
    this.current = persist;
  }
  /** Affinity cooldown/rank tuning (read-only). */
  get affinity() {
    return this.affinityConfig;
  }
  /** The current persistence snapshot (trade a copy when mutating). */
  get snapshot() {
    return this.current;
  }
  /** Stock cap reported to clients. */
  get treatMax() {
    return this.treatConfig.maxTreats;
  }
  /** Consume the pending-write flag if any mutation occurred. */
  takeDirty() {
    const was = this.dirty;
    this.dirty = false;
    return was;
  }
  /**
   * Drop a session's rewarded-turn bookkeeping once that session is disposed,
   * so the per-session map does not grow without bound.
   */
  forgetSession(sessionId) {
    this.rewardedTurns.delete(sessionId);
  }
  /** Assigned once on activity, never during a polling read. */
  setSessionColor(id, color) {
    const colors = this.current.sessionColors ?? {};
    if (Object.hasOwn(colors, id)) return;
    this.current = { ...this.current, sessionColors: Object.fromEntries([...Object.entries(colors), [id, color]].slice(-512)) };
    this.dirty = true;
  }
  /** Replace the display block (clamping stays a caller concern). */
  setDisplay(display) {
    this.current = { ...this.current, display, playback: { ...this.current.playback, [this.current.petId]: {
      animationRunFpsLimit: optionalFps(display.animationRunFpsLimit),
      animationActionFps: optionalFps(display.animationActionFps),
      animationFps: animationFps(display.animationFps),
      animationMode: animationMode(display.animationMode),
      animationTickSlope: tickSlope(display.animationTickSlope),
      animationTickIntercept: tickIntercept(display.animationTickIntercept)
    } } };
    this.dirty = true;
  }
  /** Replace the selected pet id (validation stays a caller concern). */
  setPetId(petId) {
    if (this.current.petId === petId) return;
    const playback = { ...this.current.playback, [this.current.petId]: {
      animationRunFpsLimit: optionalFps(this.current.display.animationRunFpsLimit),
      animationActionFps: optionalFps(this.current.display.animationActionFps),
      animationFps: animationFps(this.current.display.animationFps),
      animationMode: animationMode(this.current.display.animationMode),
      animationTickSlope: tickSlope(this.current.display.animationTickSlope),
      animationTickIntercept: tickIntercept(this.current.display.animationTickIntercept)
    } };
    const selected = Object.hasOwn(playback, petId) ? playback[petId] : void 0;
    this.current = { ...this.current, petId, playback, display: {
      ...this.current.display,
      animationRunFpsLimit: optionalFps(selected?.animationRunFpsLimit),
      animationActionFps: optionalFps(selected?.animationActionFps),
      animationFps: animationFps(selected?.animationFps),
      animationMode: animationMode(selected?.animationMode),
      animationTickSlope: tickSlope(selected?.animationTickSlope),
      animationTickIntercept: tickIntercept(selected?.animationTickIntercept)
    } };
    this.dirty = true;
  }
  /** Replace one pet's gameplay state (validation/clamping stays a caller concern). */
  setGameplay(petId, gameplay) {
    this.current = { ...this.current, gameplay: { ...this.current.gameplay, [petId]: gameplay } };
    this.dirty = true;
  }
  /** Replace one pet's display name (validation stays a caller concern). */
  setPetName(petId, name2) {
    this.current = { ...this.current, names: { ...this.current.names, [petId]: name2 } };
    this.dirty = true;
  }
  /**
   * Select one pet's frames2d skin; `undefined` clears the choice back to the
   * pet's default look. Manifest validation stays a caller concern, exactly
   * like setPetName's length check.
   */
  setPetSkin(petId, skinId) {
    const skins = this.current.skins;
    if (skinId === void 0) {
      if (skins[petId] === void 0) return;
      const next = { ...skins };
      delete next[petId];
      this.current = { ...this.current, skins: next };
    } else {
      if (skins[petId] === skinId) return;
      this.current = { ...this.current, skins: { ...skins, [petId]: skinId } };
    }
    this.dirty = true;
  }
  /** The persisted skin id for one pet (undefined = the pet's default look). */
  petSkin(petId) {
    return this.current.skins[petId];
  }
  /**
   * Swap the reaction pools to another pet's custom remarks (called on pet
   * selection). Slots the pet does not declare fall back to voice packs or built-ins.
   */
  setRemarks(remarks, voiceRemarks) {
    this.picker = new RemarkPicker(remarks, voiceRemarks);
  }
  /**
   * Settle the treat economy (work + time output since the last settlement).
   * A zero-gain first settlement still starts the time clock (anchor write),
   * which is how the time output can ever accrue. Returns true when
   * the in-memory ledger changed and should be persisted.
   */
  settleTreats(nowMs) {
    const settlement = settleTreatGrants(
      this.current.treats,
      this.current.affinity.turns,
      nowMs,
      this.treatConfig
    );
    if (settlement.ledger === this.current.treats) return false;
    this.current = { ...this.current, treats: settlement.ledger };
    this.dirty = true;
    return true;
  }
  /**
   * Grant gameplay treats into the shared stock (capped by the treat cap).
   * This is the unified gameplay currency (wallet removed): work rewards,
   * passive income and lottery prizes land here so one balance feeds the
   * shop and the feeding economy. Returns true when the snapshot changed.
   */
  grantTreats(amount) {
    if (amount <= 0) return false;
    const capped = Math.min(this.treatConfig.maxTreats, this.current.treats.treats + amount);
    if (capped === this.current.treats.treats) return false;
    this.current = { ...this.current, treats: { ...this.current.treats, treats: capped } };
    this.dirty = true;
    return true;
  }
  /** Spend gameplay treats from the shared stock; refuses when unaffordable. */
  spendTreats(amount) {
    const stock = this.current.treats.treats;
    if (amount <= 0 || stock < amount) return { ok: false };
    this.current = { ...this.current, treats: { ...this.current.treats, treats: stock - amount } };
    this.dirty = true;
    return { ok: true };
  }
  /**
   * Award the completed-turn reward once per session+turn (idempotent) and
   * run the treat settlement that work output feeds. Returns true when the
   * snapshot changed.
   */
  rewardTurn(sessionId, turn, nowMs) {
    const last = this.rewardedTurns.get(sessionId) ?? 0;
    if (turn <= last) return false;
    this.rewardedTurns.set(sessionId, turn);
    let changed = this.applyTurnReward();
    if (this.settleTreats(nowMs)) changed = true;
    return changed;
  }
  /** Preserve turn rewards for installations that only emit legacy activity. */
  rewardLegacyTurn(nowMs) {
    if (nowMs - this.lastLegacyTurnRewardAt < 5e3) return false;
    this.lastLegacyTurnRewardAt = nowMs;
    let changed = this.applyTurnReward();
    if (this.settleTreats(nowMs)) changed = true;
    return changed;
  }
  applyTurnReward() {
    this.current = {
      ...this.current,
      affinity: applyTurnReward(this.current.affinity, this.affinityConfig)
    };
    this.dirty = true;
    return true;
  }
  /**
   * Pet or feed the pet. Feeding settles first, then gates on the feed
   * cooldown before spending stock — a feed inside the cooldown must not burn
   * a treat for nothing.
   */
  interact(kind, nowMs) {
    if (kind === "feed") this.settleTreats(nowMs);
    const before = this.current.affinity;
    const outcome = applyInteraction(before, kind, nowMs, this.affinityConfig);
    if (kind === "feed" && !outcome.accepted) {
      this.current = { ...this.current, affinity: outcome.affinity };
      this.dirty = true;
      return {
        reaction: this.picker.pickAt("feedCooldown", before.feedRejects),
        delta: 0,
        affinity: this.affinityView(nowMs)
      };
    }
    if (kind === "feed") {
      const consume = consumeTreat(this.current.treats);
      if (!consume.ok) {
        return {
          reaction: this.picker.pick("noTreats"),
          delta: 0,
          affinity: this.affinityView(nowMs)
        };
      }
      this.current = { ...this.current, treats: consume.ledger };
      this.dirty = true;
    }
    this.current = { ...this.current, affinity: outcome.affinity };
    this.dirty = true;
    const count = kind === "pet" ? outcome.accepted ? before.pets : before.petRejects : before.feeds;
    return {
      reaction: this.picker.pickAt(outcome.accepted ? kind : "petCooldown", count),
      delta: outcome.delta,
      affinity: this.affinityView(nowMs)
    };
  }
  /** Current affinity view for the RPC snapshot. */
  affinityView(nowMs) {
    return affinityViewOf(this.current.affinity, nowMs, this.affinityConfig);
  }
};

// src/persist.ts
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { join as join2 } from "node:path";

// src/dsh-home.ts
import { homedir } from "node:os";
import { isAbsolute, join } from "node:path";
import { isAbsolute as posixIsAbsolute, join as posixJoin } from "node:path/posix";
function expandHome(path, home = homedir()) {
  const isPosix = home.startsWith("/");
  const j = isPosix ? posixJoin : join;
  if (path === "~") return home;
  if (path.startsWith("~/") || path.startsWith("~\\")) return j(home, path.slice(2));
  return path;
}
function resolveDshHome(env = process.env, home = homedir()) {
  const isPosix = home.startsWith("/");
  const j = isPosix ? posixJoin : join;
  const isAbs = isPosix ? posixIsAbsolute : isAbsolute;
  const raw = env.DSH_HOME;
  if (raw !== void 0 && raw.trim() !== "") {
    const expanded = expandHome(raw.trim(), home);
    return isAbs(expanded) ? expanded : j(process.cwd(), expanded);
  }
  return j(home, ".dsh");
}
function dshHome() {
  return resolveDshHome();
}

// src/defaults.ts
var DEFAULT_PET_ID = "whale-girl";
var DEFAULT_PET_NAME = "\u9CB8\u9C7C\u5A18";

// src/persist.ts
var defaultDisplayConfig = {
  visible: true,
  size: 160,
  right: 24,
  bottom: 120,
  bubbleScale: 1,
  animationFps: 12,
  animationRunFpsLimit: 0,
  animationActionFps: 0,
  animationMode: "fixed",
  animationTickSlope: DEFAULT_TICK_SLOPE,
  animationTickIntercept: DEFAULT_TICK_INTERCEPT,
  desktopEnabled: true,
  multiPetEnabled: false,
  bubbleOnly: false,
  hoverPanelEnabled: false
};
var DISPLAY_SIZE_MIN = 32;
var DISPLAY_SIZE_MAX = 1024;
var DISPLAY_INSET_MAX = 1e4;
var BUBBLE_SCALE_MIN = 0.5;
var BUBBLE_SCALE_MAX = 2;
var BUBBLE_SCALE_STEP = 0.05;
var PET_NAME_MAX_LENGTH = 20;
function emptyPersist() {
  return {
    petId: DEFAULT_PET_ID,
    names: {},
    skins: {},
    affinity: emptyAffinity(),
    treats: emptyTreatLedger(),
    display: { ...defaultDisplayConfig },
    gameplay: {}
  };
}
function petHomeDir() {
  return dshHome();
}
function finiteNum(value, fallback) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}
function loadPetNames(parsed) {
  const names = {};
  if (typeof parsed.names !== "object" || parsed.names === null) return names;
  for (const [id, value] of Object.entries(parsed.names)) {
    if (id === "" || typeof value !== "string") continue;
    const name2 = value.trim();
    if (name2 === "") continue;
    names[id] = name2.slice(0, PET_NAME_MAX_LENGTH);
  }
  return names;
}
function loadPetSkins(parsed) {
  const skins = {};
  if (typeof parsed.skins !== "object" || parsed.skins === null) return skins;
  for (const [id, value] of Object.entries(parsed.skins)) {
    if (id === "" || typeof value !== "string") continue;
    const skin = value.trim();
    if (skin === "") continue;
    skins[id] = skin;
  }
  return skins;
}
function clamp2(value, max) {
  return Math.min(max, Math.max(0, value));
}
var GAMEPLAY_LOAD_STAT_CAP = 1e6;
var GAMEPLAY_LOAD_CURRENCY_CAP = 9999999;
function loadGameplay(parsed) {
  const result = {};
  if (typeof parsed.gameplay !== "object" || parsed.gameplay === null) return result;
  for (const [petId, raw] of Object.entries(parsed.gameplay)) {
    if (petId === "" || typeof raw !== "object" || raw === null) continue;
    const record = raw;
    const stats = {};
    if (typeof record.stats === "object" && record.stats !== null) {
      for (const [key, value] of Object.entries(record.stats)) {
        if (key === "" || typeof value !== "number" || !Number.isFinite(value)) continue;
        stats[key] = Math.min(GAMEPLAY_LOAD_STAT_CAP, Math.max(0, value));
      }
    }
    const currencies = {};
    if (typeof record.currencies === "object" && record.currencies !== null) {
      for (const [key, value] of Object.entries(record.currencies)) {
        if (key === "" || typeof value !== "number" || !Number.isFinite(value)) continue;
        currencies[key] = Math.min(GAMEPLAY_LOAD_CURRENCY_CAP, Math.max(0, Math.floor(value)));
      }
    }
    const item = {
      stats,
      currencies,
      // Any non-empty id survives the round trip; whether it is still declared
      // is settled against the manifest when the mode is read back.
      mode: typeof record.mode === "string" && record.mode.length > 0 && record.mode.length <= 24 ? record.mode : null,
      settledAt: clamp2(finiteNum(record.settledAt, 0), Number.MAX_SAFE_INTEGER)
    };
    if (typeof record.incomeCarryMs === "number" && Number.isFinite(record.incomeCarryMs)) {
      item.incomeCarryMs = Math.max(0, record.incomeCarryMs);
    }
    if (typeof record.restoreCarryMs === "number" && Number.isFinite(record.restoreCarryMs)) {
      item.restoreCarryMs = Math.max(0, record.restoreCarryMs);
    }
    result[petId] = item;
  }
  return result;
}
function loadPetPersist(dir = petHomeDir()) {
  try {
    const raw = readFileSync(join2(dir, "pet.json"), "utf8");
    const parsed = JSON.parse(raw);
    const base = emptyPersist();
    const rawAffinity = parsed.affinity ?? {};
    const affinity = {
      points: clamp2(finiteNum(rawAffinity.points, 0), AFFINITY_MAX),
      lastPetAt: clamp2(finiteNum(rawAffinity.lastPetAt, 0), Number.MAX_SAFE_INTEGER),
      lastFeedAt: clamp2(finiteNum(rawAffinity.lastFeedAt, 0), Number.MAX_SAFE_INTEGER),
      pets: clamp2(finiteNum(rawAffinity.pets, 0), Number.MAX_SAFE_INTEGER),
      feeds: clamp2(finiteNum(rawAffinity.feeds, 0), Number.MAX_SAFE_INTEGER),
      petRejects: clamp2(finiteNum(rawAffinity.petRejects, 0), Number.MAX_SAFE_INTEGER),
      feedRejects: clamp2(finiteNum(rawAffinity.feedRejects, 0), Number.MAX_SAFE_INTEGER),
      turns: clamp2(finiteNum(rawAffinity.turns, 0), Number.MAX_SAFE_INTEGER)
    };
    const rawTreats = parsed.treats ?? {};
    const treats = {
      treats: clamp2(finiteNum(rawTreats.treats, 0), defaultTreatConfig.maxTreats),
      lastTreatGrantAt: clamp2(finiteNum(rawTreats.lastTreatGrantAt, 0), Number.MAX_SAFE_INTEGER),
      turnsAtLastTreatGrant: clamp2(finiteNum(rawTreats.turnsAtLastTreatGrant, 0), Number.MAX_SAFE_INTEGER)
    };
    const rawDisplay = parsed.display ?? {};
    const display = {
      visible: typeof rawDisplay.visible === "boolean" ? rawDisplay.visible : base.display.visible,
      // The settings schema requires whole pixels; drag positions are
      // clamped but not integral, so round at the persistence boundary.
      size: Math.round(Math.min(DISPLAY_SIZE_MAX, Math.max(DISPLAY_SIZE_MIN, finiteNum(rawDisplay.size, base.display.size)))),
      right: Math.round(clamp2(finiteNum(rawDisplay.right, base.display.right), DISPLAY_INSET_MAX)),
      bottom: Math.round(clamp2(finiteNum(rawDisplay.bottom, base.display.bottom), DISPLAY_INSET_MAX)),
      // Fractional on purpose: the multiplier is a ratio, not a pixel count.
      animationFps: animationFps(rawDisplay.animationFps),
      animationRunFpsLimit: optionalFps(rawDisplay.animationRunFpsLimit),
      animationActionFps: optionalFps(rawDisplay.animationActionFps),
      animationMode: animationMode(rawDisplay.animationMode),
      animationTickSlope: tickSlope(rawDisplay.animationTickSlope),
      animationTickIntercept: tickIntercept(rawDisplay.animationTickIntercept),
      desktopEnabled: rawDisplay.desktopEnabled !== false,
      multiPetEnabled: rawDisplay.multiPetEnabled === true,
      bubbleOnly: rawDisplay.bubbleOnly === true,
      hoverPanelEnabled: rawDisplay.hoverPanelEnabled === true,
      bubbleScale: Math.min(BUBBLE_SCALE_MAX, Math.max(BUBBLE_SCALE_MIN, finiteNum(rawDisplay.bubbleScale, base.display.bubbleScale)))
    };
    const petId = typeof parsed.petId === "string" && parsed.petId.trim() !== "" ? parsed.petId.trim() : base.petId;
    let playback;
    if (typeof parsed.playback === "object" && parsed.playback !== null && !Array.isArray(parsed.playback)) {
      playback = Object.fromEntries(Object.entries(parsed.playback).filter(([id, value]) => id.length > 0 && id.length <= 200 && typeof value === "object" && value !== null && !Array.isArray(value)).map(([id, value]) => [id, {
        animationRunFpsLimit: optionalFps(value.animationRunFpsLimit),
        animationActionFps: optionalFps(value.animationActionFps),
        animationFps: animationFps(value.animationFps),
        animationMode: animationMode(value.animationMode),
        animationTickSlope: tickSlope(value.animationTickSlope),
        animationTickIntercept: tickIntercept(value.animationTickIntercept)
      }]));
      if (Object.hasOwn(playback, petId)) Object.assign(display, playback[petId]);
    }
    const names = loadPetNames(parsed);
    if (typeof parsed.name === "string" && parsed.name.trim() !== "" && names[petId] === void 0) {
      names[petId] = parsed.name.trim().slice(0, PET_NAME_MAX_LENGTH);
    }
    return {
      petId,
      names,
      skins: loadPetSkins(parsed),
      sessionColors: loadSessionColors(parsed.sessionColors),
      affinity,
      treats,
      display,
      gameplay: loadGameplay(parsed),
      ...playback === void 0 ? {} : { playback }
    };
  } catch {
    return emptyPersist();
  }
}
function savePetPersist(data, dir = petHomeDir()) {
  mkdirSync(dir, { recursive: true });
  const target = join2(dir, "pet.json");
  const tmp = `${target}.tmp`;
  writeFileSync(tmp, JSON.stringify(data, null, 2), "utf8");
  renameSync(tmp, target);
}

// src/registry.ts
import { closeSync, existsSync, openSync, readFileSync as readFileSync2, readSync, readdirSync, statSync } from "node:fs";
import { homedir as homedir2 } from "node:os";
import { basename, dirname, isAbsolute as isAbsolute4, join as join3, resolve } from "node:path";
import { fileURLToPath } from "node:url";

// src/voice-pack.ts
var VOICE_PACK_V1 = 1;
var PANEL_ACTIONS = ["feed", "rename", "hide"];
var PANEL_LABEL_KEYS = ["feed", "rename", "hide", "confirm"];
var PANEL_STAT_KEYS = ["rank", "treats", "points"];
var VOICE_POOL_LINES_MAX = 64;
var VOICE_LINE_MAX = 160;
var VOICE_LABEL_MAX = 40;
var VOICE_STAT_MAX = 80;
var PLACEHOLDER_PATTERN = /{[^{}]*}/g;
var PLACEHOLDER_WHITELIST = {
  tools: ["{tool}", "{hint}"],
  toolRemaining: ["{n}"],
  stat: ["{rank}", "{n}", "{points}"]
};
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function normalizeLine(raw, kind, onWarning) {
  const trimmed = raw.trim();
  if (trimmed === "") return void 0;
  let capped = trimmed.length > VOICE_LINE_MAX ? trimmed.slice(0, VOICE_LINE_MAX) : trimmed;
  const dangling = capped.lastIndexOf("{");
  if (dangling !== -1 && capped.indexOf("}", dangling) === -1) {
    onWarning("line cut at an unterminated placeholder; tail dropped: " + capped.slice(0, 40) + "...");
    capped = capped.slice(0, dangling);
  }
  if (capped === "") return void 0;
  const allowed = PLACEHOLDER_WHITELIST[kind];
  const tokens = capped.match(PLACEHOLDER_PATTERN) ?? [];
  for (const token of tokens) {
    if (allowed?.includes(token) === true) continue;
    const preview = capped.length > 40 ? capped.slice(0, 40) + "..." : capped;
    onWarning("line dropped (unsupported placeholder " + token + "): " + preview);
    return void 0;
  }
  return capped;
}
function normalizePool(raw, kind, onWarning = () => {
}) {
  if (raw === void 0) return void 0;
  const entries = typeof raw === "string" ? [raw] : Array.isArray(raw) ? raw : void 0;
  if (entries === void 0) {
    onWarning("pool must be a string or an array of strings");
    return void 0;
  }
  if (entries.length > VOICE_POOL_LINES_MAX) {
    onWarning("pool has more than " + VOICE_POOL_LINES_MAX + " lines; extra lines are ignored");
  }
  const pool = [];
  for (const entry of entries.slice(0, VOICE_POOL_LINES_MAX)) {
    if (typeof entry !== "string") {
      onWarning("non-string pool entry dropped");
      continue;
    }
    const line = normalizeLine(entry, kind, onWarning);
    if (line !== void 0) pool.push(line);
  }
  return pool;
}
function normalizeWhisperCategories(raw, onWarning = () => {
}) {
  if (raw === void 0) return void 0;
  if (!isRecord(raw)) {
    onWarning("whispers.categories must be an object");
    return void 0;
  }
  const pools = {};
  for (const key of Object.keys(raw)) {
    if (!WHISPER_CATEGORIES.includes(key)) {
      onWarning("unknown whisper category " + key + " ignored");
      continue;
    }
    const pool = normalizePool(raw[key], "whisperCategory", onWarning);
    if (pool !== void 0) pools[key] = pool;
  }
  return Object.keys(pools).length > 0 ? pools : void 0;
}
function normalizeWhisperResults(raw, onWarning = () => {
}) {
  if (raw === void 0) return void 0;
  if (!isRecord(raw)) {
    onWarning("whispers.results must be an object");
    return void 0;
  }
  const pools = {};
  for (const key of Object.keys(raw)) {
    if (!WHISPER_RESULTS.includes(key)) {
      onWarning("unknown whisper result " + key + " ignored");
      continue;
    }
    const pool = normalizePool(raw[key], "whisperResult", onWarning);
    if (pool !== void 0) pools[key] = pool;
  }
  return Object.keys(pools).length > 0 ? pools : void 0;
}
function normalizePanel(raw, onWarning = () => {
}) {
  if (!isRecord(raw)) {
    onWarning("panel must be an object");
    return void 0;
  }
  const panel = {};
  const labelsRaw = raw.labels;
  if (labelsRaw !== void 0) {
    if (!isRecord(labelsRaw)) {
      onWarning("panel.labels must be an object");
    } else {
      const labels = {};
      for (const key of PANEL_LABEL_KEYS) {
        const value = labelsRaw[key];
        if (value === void 0) continue;
        if (typeof value !== "string") {
          onWarning("panel.labels." + key + " must be a string");
          continue;
        }
        const line = normalizeLine(value, "label", onWarning);
        if (line !== void 0) labels[key] = line.slice(0, VOICE_LABEL_MAX);
      }
      if (Object.keys(labels).length > 0) panel.labels = labels;
    }
  }
  const statsRaw = raw.stats;
  if (statsRaw !== void 0) {
    if (!isRecord(statsRaw)) {
      onWarning("panel.stats must be an object");
    } else {
      const stats = {};
      for (const key of PANEL_STAT_KEYS) {
        const value = statsRaw[key];
        if (value === void 0) continue;
        if (typeof value !== "string") {
          onWarning("panel.stats." + key + " must be a string");
          continue;
        }
        const line = normalizeLine(value, "stat", onWarning);
        if (line !== void 0) stats[key] = line.slice(0, VOICE_STAT_MAX);
      }
      if (Object.keys(stats).length > 0) panel.stats = stats;
    }
  }
  const actionsRaw = raw.actions;
  if (actionsRaw !== void 0) {
    if (!Array.isArray(actionsRaw)) {
      onWarning("panel.actions must be an array");
    } else {
      const seen = /* @__PURE__ */ new Set();
      for (const entry of actionsRaw) {
        if (typeof entry !== "string" || !PANEL_ACTIONS.includes(entry)) {
          onWarning("unknown panel action dropped: " + String(entry));
          continue;
        }
        seen.add(entry);
      }
      panel.actions = PANEL_ACTIONS.filter((action) => seen.has(action));
    }
  }
  if (panel.labels === void 0 && panel.stats === void 0 && panel.actions === void 0) return void 0;
  return panel;
}
var VOICE_PACK_KEYS = /* @__PURE__ */ new Set(["$schema", "voicePackVersion", "status", "tools", "toolRemaining", "whispers", "panel", "remarks", "ranks"]);
var WHISPER_KEYS = /* @__PURE__ */ new Set(["categories", "results"]);
function normalizeVoicePack(raw, onWarning = () => {
}) {
  if (raw === void 0) return void 0;
  if (!isRecord(raw)) {
    onWarning("voice.json must be a JSON object; the file is ignored");
    return void 0;
  }
  for (const key of Object.keys(raw)) {
    if (!VOICE_PACK_KEYS.has(key)) onWarning("unknown top-level field " + key + " ignored");
  }
  const version = raw.voicePackVersion;
  if (version !== void 0 && (typeof version !== "number" || version !== VOICE_PACK_V1)) {
    onWarning("voicePackVersion " + String(version) + " is not supported; reading as v1 best-effort");
  }
  const overrides = {};
  const statusRaw = raw.status;
  if (statusRaw !== void 0) {
    if (!isRecord(statusRaw)) {
      onWarning("status must be an object");
    } else {
      for (const key of Object.keys(statusRaw)) {
        if (!STATUS_SCENES.includes(key)) {
          onWarning("unknown status scene " + key + " ignored");
          continue;
        }
        const pool = normalizePool(statusRaw[key], "status", onWarning);
        if (pool !== void 0 && pool.length > 0) {
          overrides.status = { ...overrides.status, [key]: pool };
        }
      }
    }
  }
  const toolsRaw = raw.tools;
  if (toolsRaw !== void 0) {
    if (!isRecord(toolsRaw)) {
      onWarning("tools must be an object");
    } else {
      for (const key of Object.keys(toolsRaw)) {
        if (!TOOL_CATEGORIES.includes(key)) {
          onWarning("unknown tool family " + key + " ignored");
          continue;
        }
        const pool = normalizePool(toolsRaw[key], "tools", onWarning);
        if (pool !== void 0 && pool.length > 0) {
          overrides.tools = { ...overrides.tools, [key]: pool };
        }
      }
    }
  }
  const remainingRaw = raw.toolRemaining;
  if (remainingRaw !== void 0) {
    const pool = normalizePool(remainingRaw, "toolRemaining", onWarning);
    if (pool !== void 0 && pool.length > 0) overrides.toolRemaining = pool;
  }
  const whispersRaw = raw.whispers;
  if (whispersRaw !== void 0) {
    if (!isRecord(whispersRaw)) {
      onWarning("whispers must be an object");
    } else {
      for (const key of Object.keys(whispersRaw)) {
        if (key === "generic" || key === "rules") {
          onWarning("whispers." + key + " is no longer supported and was ignored");
        } else if (!WHISPER_KEYS.has(key)) {
          onWarning("unknown whispers field " + key + " ignored");
        }
      }
      const categories = normalizeWhisperCategories(whispersRaw.categories, onWarning);
      const results = normalizeWhisperResults(whispersRaw.results, onWarning);
      if (categories !== void 0 || results !== void 0) {
        overrides.whispers = {
          ...categories === void 0 ? {} : { categories },
          ...results === void 0 ? {} : { results }
        };
      }
    }
  }
  const panel = raw.panel === void 0 ? void 0 : normalizePanel(raw.panel, onWarning);
  const remarks = raw.remarks === void 0 ? void 0 : normalizePetRemarks(raw.remarks, onWarning);
  const ranksRaw = raw.ranks;
  let ranks;
  if (ranksRaw !== void 0) {
    if (!isRecord(ranksRaw)) {
      onWarning("ranks must be an object");
    } else {
      const out = {};
      for (const [key, value] of Object.entries(ranksRaw)) {
        if (typeof value === "string" && value.trim() !== "") {
          out[key] = value.trim().slice(0, VOICE_STAT_MAX);
        } else {
          onWarning("invalid rank name for " + key);
        }
      }
      if (Object.keys(out).length > 0) ranks = out;
    }
  }
  if (overrides.status === void 0 && overrides.tools === void 0 && overrides.toolRemaining === void 0 && overrides.whispers === void 0 && panel === void 0 && remarks === void 0 && ranks === void 0) {
    return void 0;
  }
  return {
    overrides,
    ...panel === void 0 ? {} : { panel },
    ...remarks === void 0 ? {} : { remarks },
    ...ranks === void 0 ? {} : { ranks }
  };
}
function mergeVoicePacks(...layers) {
  const overrides = {};
  const labels = {};
  const stats = {};
  let remarks;
  let ranks;
  let actions;
  let panelSeen = false;
  let any = false;
  for (const layer of layers) {
    if (layer === void 0) continue;
    any = true;
    if (layer.overrides.status !== void 0) {
      overrides.status = { ...overrides.status, ...layer.overrides.status };
    }
    if (layer.overrides.tools !== void 0) {
      overrides.tools = { ...overrides.tools, ...layer.overrides.tools };
    }
    if (layer.overrides.toolRemaining !== void 0) overrides.toolRemaining = layer.overrides.toolRemaining;
    if (layer.overrides.whispers !== void 0) {
      overrides.whispers = { ...overrides.whispers, ...layer.overrides.whispers };
    }
    if (layer.panel !== void 0) {
      panelSeen = true;
      if (layer.panel.labels !== void 0) Object.assign(labels, layer.panel.labels);
      if (layer.panel.stats !== void 0) Object.assign(stats, layer.panel.stats);
      if (layer.panel.actions !== void 0) actions = layer.panel.actions;
    }
    if (layer.remarks !== void 0) {
      remarks = { ...remarks ?? {}, ...layer.remarks };
    }
    if (layer.ranks !== void 0) {
      ranks = { ...ranks ?? {}, ...layer.ranks };
    }
  }
  if (!any) return void 0;
  const panel = {
    ...Object.keys(labels).length > 0 ? { labels } : {},
    ...Object.keys(stats).length > 0 ? { stats } : {},
    ...actions === void 0 ? {} : { actions }
  };
  const panelEmpty = panel.labels === void 0 && panel.stats === void 0 && panel.actions === void 0;
  return {
    overrides,
    ...panelSeen && !panelEmpty ? { panel } : {},
    ...remarks !== void 0 ? { remarks } : {},
    ...ranks !== void 0 ? { ranks } : {}
  };
}

// src/decoration.ts
import { isAbsolute as isAbsolute3 } from "node:path";

// src/manifest-v2.ts
import { isAbsolute as isAbsolute2 } from "node:path";

// src/gameplay.ts
var PET_ROAM_DIRECTIONS = ["up", "down", "left", "right"];
var KEBAB = /^[a-z0-9][a-z0-9-]*$/;
var MAX_STATS = 16;
var MAX_ZONES = 8;
var MAX_BRANCHES = 8;
var MAX_ACTS = 16;
var MAX_SHOP_ITEMS = 32;
var MAX_LOTTERY_TIERS = 16;
var MAX_PHRASES = 64;
var PHRASE_MAX_LENGTH = 120;
var MAX_MODES = 8;
var MODE_LABEL_MAX_LENGTH = 40;
var STAT_VALUE_MAX = 1e6;
var CURRENCY_MAX = 9999999;
var KNOWN_GAMEPLAY = /* @__PURE__ */ new Set(["idleDirector", "stats", "hitBox", "touch", "work", "sleep", "modes", "roam", "passiveIncome", "shop", "dragState", "dragEndState"]);
var KNOWN_STAT = /* @__PURE__ */ new Set(["max", "initial", "decayPerMinute", "workingDecayPerMinute", "idleDecayPerMinute"]);
var KNOWN_ZONE = /* @__PURE__ */ new Set(["name", "y0", "y1", "branches"]);
var KNOWN_TOUCH = /* @__PURE__ */ new Set(["zones", "clickBoost"]);
var KNOWN_BRANCH = /* @__PURE__ */ new Set(["probability", "effects", "state", "stateMs", "phrases"]);
var KNOWN_EFFECT = /* @__PURE__ */ new Set(["stat", "currency", "amount"]);
var KNOWN_WORK = /* @__PURE__ */ new Set(["state", "successState", "failState", "tickMs", "resultMs", "successProbability", "success", "fail"]);
var KNOWN_SLEEP = /* @__PURE__ */ new Set(["state", "wakeState", "restore"]);
var KNOWN_MODE = /* @__PURE__ */ new Set(["state", "label", "activeLabel", "restore"]);
var KNOWN_ROAM = /* @__PURE__ */ new Set(["state", "intervalMs", "probability", "distanceMin", "distanceMax", "speed", "directions"]);
var KNOWN_RESTORE = /* @__PURE__ */ new Set(["stat", "amount", "intervalMs"]);
var KNOWN_SHOP_ITEM = /* @__PURE__ */ new Set(["id", "label", "image", "price", "currency", "effects", "lottery"]);
var KNOWN_LOTTERY = /* @__PURE__ */ new Set(["effects", "currency", "tiers"]);
var KNOWN_IDLE_DIRECTOR = /* @__PURE__ */ new Set(["intervalMs", "maxMiss", "idleWeight", "acts"]);
var KNOWN_ACT = /* @__PURE__ */ new Set(["track", "weight", "phrases"]);
function isRecord2(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function unknownKeys(source, known) {
  return Object.keys(source).filter((key) => !known.has(key));
}
function validName(name2, max = 32) {
  return typeof name2 === "string" && name2.length <= max && KEBAB.test(name2);
}
function intIn(value, min, max) {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}
function numIn(value, min, max) {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}
function parseEffects(raw, field, stats, hooks) {
  if (raw === void 0) return void 0;
  if (!Array.isArray(raw) || raw.length === 0) {
    hooks.error(field + " must be a non-empty array of effects");
    return void 0;
  }
  const effects = [];
  for (const entry of raw) {
    if (!isRecord2(entry)) {
      hooks.error(field + ": every effect must be an object");
      continue;
    }
    const extra = unknownKeys(entry, KNOWN_EFFECT);
    if (extra.length > 0) hooks.error(field + ": unknown effect field(s) " + extra.map((k) => JSON.stringify(k)).join(", "));
    const hasStat = typeof entry.stat === "string";
    const hasCurrency = typeof entry.currency === "string";
    if (hasStat === hasCurrency) {
      hooks.error(field + ": an effect needs exactly one of stat or currency");
      continue;
    }
    if (!intIn(entry.amount, -STAT_VALUE_MAX, STAT_VALUE_MAX) || entry.amount === 0) {
      hooks.error(field + ": effect amount must be a non-zero integer within \xB1" + STAT_VALUE_MAX);
      continue;
    }
    if (hasStat && stats[entry.stat] === void 0) {
      hooks.error(field + ": effect references undeclared stat " + JSON.stringify(entry.stat));
      continue;
    }
    if (hasCurrency && !validName(entry.currency, 24)) {
      hooks.error(field + ": effect currency must be a kebab id");
      continue;
    }
    effects.push({
      ...hasStat ? { stat: entry.stat } : {},
      ...hasCurrency ? { currency: entry.currency } : {},
      amount: entry.amount
    });
  }
  return effects.length === 0 ? void 0 : effects;
}
function parsePhrases(raw, field, hooks) {
  if (raw === void 0) return void 0;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_PHRASES || raw.some((line) => typeof line !== "string" || line.trim() === "" || line.length > PHRASE_MAX_LENGTH)) {
    hooks.error(field + " must be 1.." + MAX_PHRASES + " non-empty lines of at most " + PHRASE_MAX_LENGTH + " chars");
    return void 0;
  }
  return raw;
}
function parseStateRef(raw, field, hooks) {
  if (raw === void 0) return void 0;
  if (typeof raw !== "string" || !hooks.stateNames.has(raw)) {
    hooks.error(field + " must name a declared frames2d track");
    return void 0;
  }
  return raw;
}
function parseModeRestore(raw, field, stats, fail) {
  if (!isRecord2(raw)) {
    fail(field + " must be an object { stat, amount, intervalMs }");
    return void 0;
  }
  const extra = unknownKeys(raw, KNOWN_RESTORE);
  if (extra.length > 0) fail(field + ": unknown field(s) " + extra.map((k) => JSON.stringify(k)).join(", "));
  const stat = typeof raw.stat === "string" && stats[raw.stat] !== void 0 ? raw.stat : void 0;
  if (stat === void 0) fail(field + ".stat must reference a declared stat");
  if (!intIn(raw.amount, 1, 1e3)) fail(field + ".amount must be an integer in [1, 1000]");
  if (!intIn(raw.intervalMs, 1e3, 6e5)) fail(field + ".intervalMs must be an integer in [1000, 600000]");
  if (stat === void 0 || !intIn(raw.amount, 1, 1e3) || !intIn(raw.intervalMs, 1e3, 6e5)) return void 0;
  return { stat, amount: raw.amount, intervalMs: raw.intervalMs };
}
function parseGameplayManifest(raw, hooks) {
  const error = (message) => hooks.error(message);
  if (!isRecord2(raw)) {
    error("gameplay must be an object");
    return void 0;
  }
  const extra = unknownKeys(raw, KNOWN_GAMEPLAY);
  if (extra.length > 0) error("gameplay: unknown field(s) " + extra.map((k) => JSON.stringify(k)).join(", "));
  let failed = false;
  const fail = (message) => {
    failed = true;
    error(message);
  };
  const stats = {};
  if (raw.stats !== void 0) {
    if (!isRecord2(raw.stats)) fail("gameplay.stats must be an object keyed by stat id");
    else {
      const entries = Object.entries(raw.stats);
      if (entries.length > MAX_STATS) fail("gameplay.stats declares too many stats (max " + MAX_STATS + ")");
      for (const [name2, value] of entries) {
        if (!validName(name2, 24)) {
          fail("gameplay.stats: invalid stat id " + JSON.stringify(name2));
          continue;
        }
        if (!isRecord2(value)) {
          fail("gameplay.stats." + name2 + " must be an object");
          continue;
        }
        const statExtra = unknownKeys(value, KNOWN_STAT);
        if (statExtra.length > 0) fail("gameplay.stats." + name2 + ": unknown field(s) " + statExtra.map((k) => JSON.stringify(k)).join(", "));
        if (!intIn(value.max, 1, STAT_VALUE_MAX)) {
          fail("gameplay.stats." + name2 + ".max must be an integer in [1, " + STAT_VALUE_MAX + "]");
          continue;
        }
        const def = { max: value.max };
        if (value.initial !== void 0) {
          if (!numIn(value.initial, 0, value.max)) fail("gameplay.stats." + name2 + ".initial must be within [0, max]");
          else def.initial = value.initial;
        }
        for (const key of ["decayPerMinute", "workingDecayPerMinute", "idleDecayPerMinute"]) {
          if (value[key] !== void 0) {
            if (!numIn(value[key], 0, 1e3)) fail("gameplay.stats." + name2 + "." + key + " must be a number in [0, 1000]");
            else def[key] = value[key];
          }
        }
        stats[name2] = def;
      }
    }
  }
  const block = {};
  if (Object.keys(stats).length > 0) block.stats = stats;
  if (raw.idleDirector !== void 0) {
    if (!isRecord2(raw.idleDirector) || !Array.isArray(raw.idleDirector.acts)) {
      fail("gameplay.idleDirector must be an object with an acts array");
    } else {
      const d = raw.idleDirector;
      const dExtra = unknownKeys(d, KNOWN_IDLE_DIRECTOR);
      if (dExtra.length > 0) fail("gameplay.idleDirector: unknown field(s) " + dExtra.map((k) => JSON.stringify(k)).join(", "));
      if (d.intervalMs !== void 0 && !intIn(d.intervalMs, 1e3, 6e4)) fail("gameplay.idleDirector.intervalMs must be an integer in [1000, 60000]");
      if (d.maxMiss !== void 0 && !intIn(d.maxMiss, 0, 10)) fail("gameplay.idleDirector.maxMiss must be an integer in [0, 10]");
      if (d.idleWeight !== void 0 && !intIn(d.idleWeight, 0, 1e4)) fail("gameplay.idleDirector.idleWeight must be an integer in [0, 10000]");
      if (d.acts.length === 0 || d.acts.length > MAX_ACTS) fail("gameplay.idleDirector.acts must declare 1.." + MAX_ACTS + " acts");
      const acts = [];
      for (const act of d.acts) {
        if (!isRecord2(act) || !intIn(act.weight, 1, 1e4)) {
          fail("gameplay.idleDirector.acts entries need a weight integer in [1, 10000]");
          continue;
        }
        const aExtra = unknownKeys(act, KNOWN_ACT);
        if (aExtra.length > 0) fail("gameplay.idleDirector.acts: unknown field(s) " + aExtra.map((k) => JSON.stringify(k)).join(", "));
        const track = parseStateRef(act.track, "gameplay.idleDirector.acts.track", hooks);
        if (track === void 0) continue;
        const entry = { track, weight: act.weight };
        const phrases = parsePhrases(act.phrases, "gameplay.idleDirector.acts.phrases", hooks);
        if (phrases !== void 0) entry.phrases = phrases;
        acts.push(entry);
      }
      if (acts.length > 0) {
        block.idleDirector = {
          intervalMs: intIn(d.intervalMs, 1e3, 6e4) ? d.intervalMs : 5e3,
          maxMiss: intIn(d.maxMiss, 0, 10) ? d.maxMiss : 2,
          idleWeight: intIn(d.idleWeight, 0, 1e4) ? d.idleWeight : 0,
          acts
        };
      }
    }
  }
  if (raw.hitBox !== void 0) {
    const b = raw.hitBox;
    if (!isRecord2(b) || !numIn(b.x0, 0, 1) || !numIn(b.x1, 0, 1) || !numIn(b.y0, 0, 1) || !numIn(b.y1, 0, 1) || !(b.x0 < b.x1) || !(b.y0 < b.y1)) {
      fail("gameplay.hitBox must be { x0, y0, x1, y1 } fractions with x0 < x1 and y0 < y1");
    } else {
      block.hitBox = { x0: b.x0, y0: b.y0, x1: b.x1, y1: b.y1 };
    }
  }
  if (raw.touch !== void 0) {
    if (!isRecord2(raw.touch) || !Array.isArray(raw.touch.zones)) {
      fail("gameplay.touch must be an object with a zones array");
    } else {
      const tExtra = unknownKeys(raw.touch, KNOWN_TOUCH);
      if (tExtra.length > 0) fail("gameplay.touch: unknown field(s) " + tExtra.map((k) => JSON.stringify(k)).join(", "));
      let clickBoost;
      if (raw.touch.clickBoost !== void 0) {
        const cb = raw.touch.clickBoost;
        if (!isRecord2(cb) || typeof cb.stat !== "string" || stats[cb.stat] === void 0 || !intIn(cb.min, 0, 1e3) || !intIn(cb.max, 0, 1e3) || cb.min > cb.max) {
          fail("gameplay.touch.clickBoost must be { stat (declared), min, max } integers with 0 <= min <= max <= 1000");
        } else clickBoost = { stat: cb.stat, min: cb.min, max: cb.max };
      }
      const zones = [];
      if (raw.touch.zones.length === 0 || raw.touch.zones.length > MAX_ZONES) fail("gameplay.touch.zones must declare 1.." + MAX_ZONES + " zones");
      for (const zoneRaw of raw.touch.zones) {
        if (!isRecord2(zoneRaw) || !validName(zoneRaw.name) || !numIn(zoneRaw.y0, 0, 1) || !numIn(zoneRaw.y1, 0, 1) || !(zoneRaw.y0 < zoneRaw.y1)) {
          fail("gameplay.touch.zones entries need a kebab name and 0 <= y0 < y1 <= 1");
          continue;
        }
        const zExtra = unknownKeys(zoneRaw, KNOWN_ZONE);
        if (zExtra.length > 0) fail("gameplay.touch." + zoneRaw.name + ": unknown field(s) " + zExtra.map((k) => JSON.stringify(k)).join(", "));
        if (!Array.isArray(zoneRaw.branches) || zoneRaw.branches.length === 0 || zoneRaw.branches.length > MAX_BRANCHES) {
          fail("gameplay.touch." + zoneRaw.name + ".branches must declare 1.." + MAX_BRANCHES + " branches");
          continue;
        }
        let probabilitySum = 0;
        const branches = [];
        for (const branchRaw of zoneRaw.branches) {
          if (!isRecord2(branchRaw) || !numIn(branchRaw.probability, 0, 1) || branchRaw.probability === 0) {
            fail("gameplay.touch." + zoneRaw.name + ".branches entries need a probability in (0, 1]");
            continue;
          }
          const bExtra = unknownKeys(branchRaw, KNOWN_BRANCH);
          if (bExtra.length > 0) fail("gameplay.touch." + zoneRaw.name + ": unknown branch field(s) " + bExtra.map((k) => JSON.stringify(k)).join(", "));
          probabilitySum += branchRaw.probability;
          const branch = { probability: branchRaw.probability };
          const effects = parseEffects(branchRaw.effects, "gameplay.touch." + zoneRaw.name + ".effects", stats, hooks);
          if (effects !== void 0) branch.effects = effects;
          const state = parseStateRef(branchRaw.state, "gameplay.touch." + zoneRaw.name + ".state", hooks);
          if (state !== void 0) branch.state = state;
          if (branchRaw.stateMs !== void 0) {
            if (!intIn(branchRaw.stateMs, 200, 1e4)) fail("gameplay.touch." + zoneRaw.name + ".stateMs must be an integer in [200, 10000]");
            else branch.stateMs = branchRaw.stateMs;
          }
          const phrases = parsePhrases(branchRaw.phrases, "gameplay.touch." + zoneRaw.name + ".phrases", hooks);
          if (phrases !== void 0) branch.phrases = phrases;
          branches.push(branch);
        }
        if (probabilitySum > 1 + 1e-9) fail("gameplay.touch." + zoneRaw.name + ": branch probabilities must sum to at most 1");
        if (branches.length > 0) zones.push({ name: zoneRaw.name, y0: zoneRaw.y0, y1: zoneRaw.y1, branches });
      }
      if (zones.length > 0 || clickBoost !== void 0) block.touch = { zones, ...clickBoost === void 0 ? {} : { clickBoost } };
    }
  }
  if (raw.work !== void 0) {
    const w = raw.work;
    if (!isRecord2(w)) fail("gameplay.work must be an object");
    else {
      const wExtra = unknownKeys(w, KNOWN_WORK);
      if (wExtra.length > 0) fail("gameplay.work: unknown field(s) " + wExtra.map((k) => JSON.stringify(k)).join(", "));
      const state = parseStateRef(w.state, "gameplay.work.state", hooks);
      const successState = parseStateRef(w.successState, "gameplay.work.successState", hooks);
      const failState = parseStateRef(w.failState, "gameplay.work.failState", hooks);
      if (!intIn(w.tickMs, 1e3, 6e4)) fail("gameplay.work.tickMs must be an integer in [1000, 60000]");
      if (!numIn(w.successProbability, 0, 1)) fail("gameplay.work.successProbability must be a number in [0, 1]");
      if (state !== void 0 && successState !== void 0 && failState !== void 0 && intIn(w.tickMs, 1e3, 6e4) && numIn(w.successProbability, 0, 1)) {
        const work = {
          state,
          successState,
          failState,
          tickMs: w.tickMs,
          successProbability: w.successProbability
        };
        if (w.resultMs !== void 0) {
          if (!isRecord2(w.resultMs) || !intIn(w.resultMs.success, 200, 1e4) || !intIn(w.resultMs.fail, 200, 1e4)) {
            fail("gameplay.work.resultMs must be { success, fail } integers in [200, 10000]");
          } else work.resultMs = { success: w.resultMs.success, fail: w.resultMs.fail };
        }
        for (const key of ["success", "fail"]) {
          if (w[key] !== void 0) {
            if (!isRecord2(w[key])) fail("gameplay.work." + key + " must be an object { effects }");
            else {
              const effects = parseEffects(w[key].effects, "gameplay.work." + key + ".effects", stats, hooks);
              if (effects !== void 0) work[key] = { effects };
            }
          }
        }
        block.work = work;
      }
    }
  }
  if (raw.sleep !== void 0) {
    const s = raw.sleep;
    if (!isRecord2(s) || !isRecord2(s.restore)) fail("gameplay.sleep must be an object with a restore block");
    else {
      const sExtra = unknownKeys(s, KNOWN_SLEEP);
      if (sExtra.length > 0) fail("gameplay.sleep: unknown field(s) " + sExtra.map((k) => JSON.stringify(k)).join(", "));
      const state = parseStateRef(s.state, "gameplay.sleep.state", hooks);
      const wakeState = parseStateRef(s.wakeState, "gameplay.sleep.wakeState", hooks);
      const restore = parseModeRestore(s.restore, "gameplay.sleep.restore", stats, fail);
      if (state !== void 0 && restore !== void 0) {
        block.sleep = {
          state,
          ...wakeState === void 0 ? {} : { wakeState },
          restore
        };
      }
    }
  }
  if (raw.modes !== void 0) {
    if (!isRecord2(raw.modes)) fail("gameplay.modes must be an object keyed by mode id");
    else {
      const entries = Object.entries(raw.modes);
      if (entries.length > MAX_MODES) fail("gameplay.modes declares too many modes (max " + MAX_MODES + ")");
      const modes = {};
      for (const [name2, value] of entries) {
        if (!validName(name2, 24) || name2 === "work" || name2 === "sleep") {
          fail("gameplay.modes: invalid mode id " + JSON.stringify(name2) + " (kebab, and not the reserved work/sleep)");
          continue;
        }
        if (!isRecord2(value)) {
          fail("gameplay.modes." + name2 + " must be an object");
          continue;
        }
        const mExtra = unknownKeys(value, KNOWN_MODE);
        if (mExtra.length > 0) fail("gameplay.modes." + name2 + ": unknown field(s) " + mExtra.map((k) => JSON.stringify(k)).join(", "));
        const state = parseStateRef(value.state, "gameplay.modes." + name2 + ".state", hooks);
        let usable = state !== void 0;
        let label;
        if (value.label !== void 0) {
          if (typeof value.label !== "string" || value.label.trim() === "" || value.label.length > MODE_LABEL_MAX_LENGTH) {
            fail("gameplay.modes." + name2 + ".label must be a non-empty string of at most " + MODE_LABEL_MAX_LENGTH + " chars");
            usable = false;
          } else label = value.label.trim();
        }
        let activeLabel;
        if (value.activeLabel !== void 0) {
          if (typeof value.activeLabel !== "string" || value.activeLabel.trim() === "" || value.activeLabel.length > MODE_LABEL_MAX_LENGTH) {
            fail("gameplay.modes." + name2 + ".activeLabel must be a non-empty string of at most " + MODE_LABEL_MAX_LENGTH + " chars");
            usable = false;
          } else activeLabel = value.activeLabel.trim();
        }
        const restore = value.restore === void 0 ? void 0 : parseModeRestore(value.restore, "gameplay.modes." + name2 + ".restore", stats, fail);
        if (value.restore !== void 0 && restore === void 0) usable = false;
        if (usable && state !== void 0) {
          modes[name2] = {
            state,
            ...label === void 0 ? {} : { label },
            ...activeLabel === void 0 ? {} : { activeLabel },
            ...restore === void 0 ? {} : { restore }
          };
        }
      }
      if (Object.keys(modes).length > 0) block.modes = modes;
    }
  }
  if (raw.roam !== void 0) {
    const rm = raw.roam;
    if (!isRecord2(rm)) fail("gameplay.roam must be an object");
    else {
      const rExtra = unknownKeys(rm, KNOWN_ROAM);
      if (rExtra.length > 0) fail("gameplay.roam: unknown field(s) " + rExtra.map((k) => JSON.stringify(k)).join(", "));
      const state = parseStateRef(rm.state, "gameplay.roam.state", hooks);
      if (!intIn(rm.intervalMs, 1e3, 36e5)) fail("gameplay.roam.intervalMs must be an integer in [1000, 3600000]");
      if (!numIn(rm.probability, 0, 1) || rm.probability === 0) fail("gameplay.roam.probability must be a number in (0, 1]");
      if (!intIn(rm.distanceMin, 1, 2e3)) fail("gameplay.roam.distanceMin must be an integer in [1, 2000]");
      if (!intIn(rm.distanceMax, 1, 2e3)) fail("gameplay.roam.distanceMax must be an integer in [1, 2000]");
      if (intIn(rm.distanceMin, 1, 2e3) && intIn(rm.distanceMax, 1, 2e3) && rm.distanceMin > rm.distanceMax) {
        fail("gameplay.roam.distanceMin must not exceed distanceMax");
      }
      if (!intIn(rm.speed, 1, 2e3)) fail("gameplay.roam.speed must be an integer in [1, 2000] (px per second)");
      let directions;
      if (rm.directions !== void 0) {
        if (!Array.isArray(rm.directions) || rm.directions.length === 0) {
          fail("gameplay.roam.directions must be a non-empty array of up, down, left, right");
        } else {
          const picked = [];
          for (const entry of rm.directions) {
            if (typeof entry !== "string" || !PET_ROAM_DIRECTIONS.includes(entry)) {
              fail("gameplay.roam.directions entries must be up, down, left or right");
              picked.length = 0;
              break;
            }
            if (picked.includes(entry)) {
              fail("gameplay.roam.directions must not repeat " + entry);
              picked.length = 0;
              break;
            }
            picked.push(entry);
          }
          if (picked.length > 0) directions = picked;
        }
      }
      if (state !== void 0 && intIn(rm.intervalMs, 1e3, 36e5) && numIn(rm.probability, 0, 1) && rm.probability !== 0 && intIn(rm.distanceMin, 1, 2e3) && intIn(rm.distanceMax, 1, 2e3) && rm.distanceMin <= rm.distanceMax && intIn(rm.speed, 1, 2e3)) {
        block.roam = {
          state,
          intervalMs: rm.intervalMs,
          probability: rm.probability,
          distanceMin: rm.distanceMin,
          distanceMax: rm.distanceMax,
          speed: rm.speed,
          ...directions === void 0 ? {} : { directions }
        };
      }
    }
  }
  if (raw.passiveIncome !== void 0) {
    const p = raw.passiveIncome;
    if (!isRecord2(p) || !validName(p.currency, 24) || !intIn(p.amount, 1, 1e4) || !intIn(p.intervalMs, 1e3, 864e5)) {
      fail("gameplay.passiveIncome must be { currency (kebab), amount 1..10000, intervalMs 1000..86400000 }");
    } else {
      block.passiveIncome = { currency: p.currency, amount: p.amount, intervalMs: p.intervalMs };
    }
  }
  if (raw.shop !== void 0) {
    const s = raw.shop;
    if (!isRecord2(s) || !Array.isArray(s.items) || s.items.length === 0 || s.items.length > MAX_SHOP_ITEMS) {
      fail("gameplay.shop must be an object with 1.." + MAX_SHOP_ITEMS + " items");
    } else {
      const shopState = parseStateRef(s.state, "gameplay.shop.state", hooks);
      const items = [];
      const seen = /* @__PURE__ */ new Set();
      for (const itemRaw of s.items) {
        if (!isRecord2(itemRaw) || !validName(itemRaw.id, 24)) {
          fail("gameplay.shop.items entries need a kebab id");
          continue;
        }
        if (seen.has(itemRaw.id)) {
          fail("gameplay.shop: duplicate item id " + JSON.stringify(itemRaw.id));
          continue;
        }
        seen.add(itemRaw.id);
        const iExtra = unknownKeys(itemRaw, KNOWN_SHOP_ITEM);
        if (iExtra.length > 0) fail("gameplay.shop." + itemRaw.id + ": unknown field(s) " + iExtra.map((k) => JSON.stringify(k)).join(", "));
        if (typeof itemRaw.label !== "string" || itemRaw.label.trim() === "" || itemRaw.label.length > 80) {
          fail("gameplay.shop." + itemRaw.id + ".label must be a non-empty string of at most 80 chars");
          continue;
        }
        if (!intIn(itemRaw.price, 1, 1e6)) {
          fail("gameplay.shop." + itemRaw.id + ".price must be an integer in [1, 1000000]");
          continue;
        }
        if (!validName(itemRaw.currency, 24)) {
          fail("gameplay.shop." + itemRaw.id + ".currency must be a kebab id");
          continue;
        }
        const item = {
          id: itemRaw.id,
          label: itemRaw.label.trim(),
          price: itemRaw.price,
          currency: itemRaw.currency
        };
        if (itemRaw.image !== void 0) {
          if (typeof itemRaw.image !== "string" || itemRaw.image.includes("..") || itemRaw.image.includes("\\") || itemRaw.image.startsWith("/")) {
            fail("gameplay.shop." + itemRaw.id + ".image must be a safe manifest-relative frame path");
          } else item.image = itemRaw.image;
        }
        const effects = parseEffects(itemRaw.effects, "gameplay.shop." + itemRaw.id + ".effects", stats, hooks);
        if (effects !== void 0) item.effects = effects;
        if (itemRaw.lottery !== void 0) {
          const l = itemRaw.lottery;
          if (!isRecord2(l) || !Array.isArray(l.tiers) || l.tiers.length === 0 || l.tiers.length > MAX_LOTTERY_TIERS) {
            fail("gameplay.shop." + itemRaw.id + ".lottery needs 1.." + MAX_LOTTERY_TIERS + " tiers");
          } else {
            const lExtra = unknownKeys(l, KNOWN_LOTTERY);
            if (lExtra.length > 0) fail("gameplay.shop." + itemRaw.id + ".lottery: unknown field(s) " + lExtra.map((k) => JSON.stringify(k)).join(", "));
            if (l.currency !== void 0 && !validName(l.currency, 24)) fail("gameplay.shop." + itemRaw.id + ".lottery.currency must be a kebab id");
            let tierSum = 0;
            const tiers = [];
            for (const tierRaw of l.tiers) {
              if (!isRecord2(tierRaw) || !numIn(tierRaw.probability, 0, 1) || tierRaw.probability === 0 || !intIn(tierRaw.prize, 0, 1e9)) {
                fail("gameplay.shop." + itemRaw.id + ".lottery.tiers entries need probability (0,1] and prize 0..1e9");
                continue;
              }
              tierSum += tierRaw.probability;
              const tier = {
                probability: tierRaw.probability,
                prize: tierRaw.prize
              };
              if (tierRaw.currency !== void 0) {
                if (!validName(tierRaw.currency, 24)) fail("gameplay.shop." + itemRaw.id + ".lottery tier currency must be a kebab id");
                else tier.currency = tierRaw.currency;
              }
              tiers.push(tier);
            }
            if (tierSum > 1 + 1e-9) fail("gameplay.shop." + itemRaw.id + ".lottery tier probabilities must sum to at most 1");
            if (tiers.length > 0) {
              const lotteryEffects = parseEffects(l.effects, "gameplay.shop." + itemRaw.id + ".lottery.effects", stats, hooks);
              item.lottery = {
                tiers,
                ...lotteryEffects === void 0 ? {} : { effects: lotteryEffects },
                ...validName(l.currency, 24) ? { currency: l.currency } : {}
              };
            }
          }
        }
        if (item.effects === void 0 && item.lottery === void 0) {
          fail("gameplay.shop." + itemRaw.id + " needs effects or a lottery");
          continue;
        }
        items.push(item);
      }
      if (items.length > 0) block.shop = { ...shopState === void 0 ? {} : { state: shopState }, items };
    }
  }
  if (raw.dragState !== void 0) {
    const state = parseStateRef(raw.dragState, "gameplay.dragState", hooks);
    if (state !== void 0) block.dragState = state;
  }
  if (raw.dragEndState !== void 0) {
    const state = parseStateRef(raw.dragEndState, "gameplay.dragEndState", hooks);
    if (state !== void 0) block.dragEndState = state;
  }
  return failed ? void 0 : block;
}
function declaredModeOf(manifest, mode) {
  const modes = manifest.modes;
  if (modes === void 0 || !Object.prototype.hasOwnProperty.call(modes, mode)) return void 0;
  return modes[mode];
}
function modeRestoreOf(manifest, mode) {
  if (mode === null) return void 0;
  if (mode === "sleep") return manifest.sleep?.restore;
  if (mode === "work") return void 0;
  return declaredModeOf(manifest, mode)?.restore;
}
function isDeclaredMode(manifest, mode) {
  if (mode === "work") return manifest.work !== void 0;
  if (mode === "sleep") return manifest.sleep !== void 0;
  return declaredModeOf(manifest, mode) !== void 0;
}
function initialGameplayState(manifest, now) {
  const stats = {};
  for (const [name2, def] of Object.entries(manifest.stats ?? {})) {
    stats[name2] = def.initial ?? def.max;
  }
  return { stats, currencies: {}, mode: null, settledAt: now };
}
function clampGameplay(state, manifest) {
  for (const [name2, def] of Object.entries(manifest.stats ?? {})) {
    const value = state.stats[name2];
    if (value === void 0) state.stats[name2] = def.initial ?? def.max;
    else state.stats[name2] = Math.min(def.max, Math.max(0, value));
  }
  for (const [name2, value] of Object.entries(state.currencies)) {
    state.currencies[name2] = Math.min(CURRENCY_MAX, Math.max(0, Math.floor(value)));
  }
}
function settleGameplay(state, manifest, now, options) {
  const elapsedMs = now - state.settledAt;
  if (elapsedMs <= 0) return false;
  const minutes = elapsedMs / 6e4;
  let changed = false;
  for (const [name2, def] of Object.entries(manifest.stats ?? {})) {
    const current = state.stats[name2];
    if (current === void 0 || current <= 0) continue;
    let rate = def.decayPerMinute ?? 0;
    if (state.mode === "work" && def.workingDecayPerMinute !== void 0) rate = def.workingDecayPerMinute;
    if (!options.sessionActive) rate += def.idleDecayPerMinute ?? 0;
    if (rate <= 0) continue;
    const next = Math.max(0, current - rate * minutes);
    if (next !== current) {
      state.stats[name2] = next;
      changed = true;
    }
  }
  if (manifest.passiveIncome !== void 0) {
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
  if (restore !== void 0) {
    const restoreElapsed = elapsedMs + (state.restoreCarryMs ?? 0);
    const interval = restore.intervalMs;
    const ticks = Math.floor(restoreElapsed / interval);
    state.restoreCarryMs = restoreElapsed % interval;
    if (ticks > 0) {
      state.stats[restore.stat] = (state.stats[restore.stat] ?? 0) + ticks * restore.amount;
      changed = true;
    }
  } else {
    state.restoreCarryMs = 0;
  }
  state.settledAt = now;
  clampGameplay(state, manifest);
  return changed;
}
function applyGameplayEffects(state, manifest, effects) {
  for (const effect of effects) {
    if (effect.stat !== void 0) {
      state.stats[effect.stat] = (state.stats[effect.stat] ?? 0) + effect.amount;
    } else if (effect.currency !== void 0) {
      state.currencies[effect.currency] = (state.currencies[effect.currency] ?? 0) + effect.amount;
    }
  }
  clampGameplay(state, manifest);
}
function rollTouchBranch(zone, rng) {
  const roll = rng();
  let acc = 0;
  for (const branch of zone.branches) {
    acc += branch.probability;
    if (roll < acc) return branch;
  }
  return void 0;
}
function rollWorkOutcome(work, rng) {
  return rng() < work.successProbability ? "success" : "fail";
}
function drawLotteryTier(lottery, rng) {
  const roll = rng();
  let acc = 0;
  for (const tier of lottery.tiers) {
    acc += tier.probability;
    if (roll < acc) return tier;
  }
  return lottery.tiers[lottery.tiers.length - 1];
}

// src/manifest-v2.ts
var PET_MANIFEST_V2 = 2;
var PET_RENDERER_KINDS = ["sprite2d", "live2d", "frames2d"];
var PET_ACTIVITY_PHASES = [
  "idle",
  "waiting",
  "thinking",
  "tool",
  "review",
  "done",
  "failed"
];
var PET_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
var PATH_SEGMENT_PATTERN = /^[A-Za-z0-9._-]+$/;
var SEMVER_PATTERN = /^\d+\.\d+\.\d+$/;
var KNOWN_TOP_LEVEL = /* @__PURE__ */ new Set([
  "$schema",
  "petManifestVersion",
  "id",
  "displayName",
  "description",
  "version",
  "author",
  "license",
  "homepage",
  "renderer",
  "sprite2d",
  "live2d",
  "frames2d",
  "sequences",
  "remarks",
  "gameplay",
  "frameDensity"
]);
var KNOWN_SPRITE2D = /* @__PURE__ */ new Set(["spritesheetPath", "cell", "columns", "atlasRows", "frames", "tracks"]);
var KNOWN_LIVE2D = /* @__PURE__ */ new Set(["model", "scale", "translate", "motions", "expressions", "hitAreas", "lipSync"]);
var KNOWN_FRAMES2D = /* @__PURE__ */ new Set(["dir", "defaultFrameMs", "tracks", "phases", "skins"]);
var KNOWN_FRAMES2D_TRACK = /* @__PURE__ */ new Set(["frames", "frameMs", "loop", "fallback"]);
var KNOWN_SKIN = /* @__PURE__ */ new Set(["id", "label", "idleTrack", "clickActions", "gameplayTracks"]);
var KNOWN_SKIN_CLICK = /* @__PURE__ */ new Set(["track", "probability", "phrases"]);
var FRAMES2D_MAX_SKINS = 16;
var FRAMES2D_MAX_SKIN_CLICKS = 8;
var FRAMES2D_MAX_SKIN_GAMEPLAY = 8;
var SKIN_CLICK_MAX_PHRASES = 5;
var SKIN_CLICK_PHRASE_MAX_LENGTH = 120;
function parseSkinPhrases(raw, field, diag) {
  if (raw === void 0) return void 0;
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > SKIN_CLICK_MAX_PHRASES || raw.some((line) => typeof line !== "string" || line.trim() === "" || line.length > SKIN_CLICK_PHRASE_MAX_LENGTH)) {
    diag.error(field + " must be 1.." + SKIN_CLICK_MAX_PHRASES + " non-empty lines of at most " + SKIN_CLICK_PHRASE_MAX_LENGTH + " chars");
    return void 0;
  }
  return raw;
}
var Diagnostics = class {
  list = [];
  source;
  constructor(source) {
    this.source = source;
  }
  error(message) {
    this.list.push({ level: "error", message: this.source + ": " + message });
  }
  warn(message) {
    this.list.push({ level: "warning", message: this.source + ": " + message });
  }
  get hasErrors() {
    return this.list.some((d) => d.level === "error");
  }
};
function isRecord3(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function unknownKeys2(source, known) {
  return Object.keys(source).filter((key) => !known.has(key));
}
function safeManifestPath(raw) {
  if (typeof raw !== "string" || raw.trim() === "") return void 0;
  const value = raw.trim();
  if (isAbsolute2(value) || value.includes("\\") || /^[a-z][a-z0-9+.-]*:/i.test(value)) return void 0;
  const segments = value.split("/").filter((segment) => segment !== "");
  if (segments.length === 0) return void 0;
  if (segments.some((segment) => segment === "." || segment === ".." || !PATH_SEGMENT_PATTERN.test(segment))) return void 0;
  return segments.join("/");
}
function parseStringBlock(record, key, diag, required) {
  const value = record[key];
  if (value === void 0) {
    if (required) diag.error("missing required field " + JSON.stringify(key));
    return void 0;
  }
  if (typeof value !== "string" || value.trim() === "") {
    diag.error("field " + JSON.stringify(key) + " must be a non-empty string");
    return void 0;
  }
  return value.trim();
}
function parsePhaseStringMap(raw, field, diag) {
  if (raw === void 0) return void 0;
  if (!isRecord3(raw)) {
    diag.error("field " + JSON.stringify(field) + " must be an object keyed by activity phase");
    return void 0;
  }
  const result = {};
  for (const [phase, value] of Object.entries(raw)) {
    if (!PET_ACTIVITY_PHASES.includes(phase)) {
      diag.error(field + ": unknown activity phase " + JSON.stringify(phase));
      continue;
    }
    if (typeof value !== "string" || value.trim() === "") {
      diag.error(field + "." + phase + " must be a non-empty string");
      continue;
    }
    result[phase] = value.trim();
  }
  return result;
}
function parseSequences(raw, diag) {
  if (raw === void 0) return void 0;
  if (!isRecord3(raw)) {
    diag.warn("sequences must be an object keyed by activity phase; ignoring");
    return void 0;
  }
  const sequences = {};
  for (const [phase, value] of Object.entries(raw)) {
    if (!PET_ACTIVITY_PHASES.includes(phase)) {
      diag.warn("sequences: unknown activity phase " + JSON.stringify(phase) + "; entry dropped");
      continue;
    }
    if (!Array.isArray(value) || value.length < 5 || value.some((item) => typeof item !== "string")) {
      diag.warn("sequences." + phase + " must be an array of at least 5 animation names; entry dropped");
      continue;
    }
    sequences[phase] = value;
  }
  return Object.keys(sequences).length === 0 ? void 0 : sequences;
}
function parseSprite2dBlock(raw, diag) {
  if (!isRecord3(raw)) {
    diag.error('renderer sprite2d requires a "sprite2d" block object');
    return void 0;
  }
  const extra = unknownKeys2(raw, KNOWN_SPRITE2D);
  if (extra.length > 0) diag.error("sprite2d: unknown field(s) " + extra.map((k) => JSON.stringify(k)).join(", "));
  const spritesheetPath = safeManifestPath(raw.spritesheetPath);
  if (spritesheetPath === void 0) {
    diag.error("sprite2d.spritesheetPath must be a safe manifest-relative path");
  }
  const block = { spritesheetPath: spritesheetPath ?? "" };
  if (raw.cell !== void 0) {
    if (!isRecord3(raw.cell)) diag.error("sprite2d.cell must be an object { width?, height? }");
    else block.cell = raw.cell;
  }
  if (raw.columns !== void 0) {
    if (typeof raw.columns !== "number" || !Number.isInteger(raw.columns) || raw.columns < 1) diag.error("sprite2d.columns must be a positive integer");
    else block.columns = raw.columns;
  }
  if (raw.atlasRows !== void 0) {
    if (typeof raw.atlasRows !== "number" || !Number.isInteger(raw.atlasRows) || raw.atlasRows < 1) diag.error("sprite2d.atlasRows must be a positive integer");
    else block.atlasRows = raw.atlasRows;
  }
  if (raw.frames !== void 0) {
    if (!Array.isArray(raw.frames) || raw.frames.some((v) => typeof v !== "number" || !Number.isInteger(v) || v < 0)) {
      diag.error("sprite2d.frames must be an array of non-negative integers");
    } else block.frames = raw.frames;
  }
  if (raw.tracks !== void 0) {
    if (!isRecord3(raw.tracks)) diag.error("sprite2d.tracks must be an object keyed by animation");
    else block.tracks = raw.tracks;
  }
  return diag.hasErrors ? void 0 : block;
}
function parseLive2dBlock(raw, diag) {
  if (!isRecord3(raw)) {
    diag.error('renderer live2d requires a "live2d" block object');
    return void 0;
  }
  const extra = unknownKeys2(raw, KNOWN_LIVE2D);
  if (extra.length > 0) diag.error("live2d: unknown field(s) " + extra.map((k) => JSON.stringify(k)).join(", "));
  const model = safeManifestPath(raw.model);
  if (model === void 0) {
    diag.error("live2d.model must be a safe manifest-relative path to a .model3.json");
  } else if (!model.endsWith(".model3.json")) {
    diag.error("live2d.model must point at a .model3.json file");
  }
  const motions = parsePhaseStringMap(raw.motions, "live2d.motions", diag);
  if (raw.motions === void 0) diag.error('live2d.motions is required (at least an "idle" group)');
  else if (motions !== void 0 && motions.idle === void 0) diag.error("live2d.motions.idle is required (unmapped phases fall back to it)");
  const block = {
    model: model ?? "",
    motions: motions ?? { idle: "" }
  };
  if (raw.scale !== void 0) {
    if (typeof raw.scale !== "number" || !Number.isFinite(raw.scale) || raw.scale <= 0 || raw.scale > 10) {
      diag.error("live2d.scale must be a number in (0, 10]");
    } else block.scale = raw.scale;
  }
  if (raw.translate !== void 0) {
    if (!isRecord3(raw.translate) || raw.translate.x !== void 0 && typeof raw.translate.x !== "number" || raw.translate.y !== void 0 && typeof raw.translate.y !== "number") {
      diag.error("live2d.translate must be an object { x?: number, y?: number }");
    } else block.translate = raw.translate;
  }
  const expressions = parsePhaseStringMap(raw.expressions, "live2d.expressions", diag);
  if (expressions !== void 0) block.expressions = expressions;
  if (raw.hitAreas !== void 0) {
    if (!Array.isArray(raw.hitAreas) || raw.hitAreas.some((v) => typeof v !== "string" || v.trim() === "")) {
      diag.error("live2d.hitAreas must be an array of non-empty strings");
    } else block.hitAreas = raw.hitAreas;
  }
  if (raw.lipSync !== void 0) {
    if (typeof raw.lipSync !== "boolean") diag.error("live2d.lipSync must be a boolean");
    else block.lipSync = raw.lipSync;
  }
  return diag.hasErrors ? void 0 : block;
}
var FRAMES2D_TRACK_NAME = /^[a-z0-9][a-z0-9-]*$/;
var FRAMES2D_MAX_TRACKS = 64;
var FRAMES2D_MAX_FRAMES = 64;
var FRAMES2D_MIN_FRAME_MS = 16;
var FRAMES2D_MAX_FRAME_MS = 5e3;
var FRAMES2D_IMAGE_EXTENSIONS = /* @__PURE__ */ new Set([".webp", ".png", ".gif", ".jpg", ".jpeg"]);
function validTrackName(name2) {
  return name2.length <= 32 && FRAMES2D_TRACK_NAME.test(name2);
}
function safeFrameName(raw) {
  if (typeof raw !== "string" || raw.trim() === "") return void 0;
  const value = raw.trim();
  if (value.includes("/") || value.includes("\\") || !PATH_SEGMENT_PATTERN.test(value)) return void 0;
  const dot = value.lastIndexOf(".");
  if (dot <= 0) return void 0;
  if (!FRAMES2D_IMAGE_EXTENSIONS.has(value.slice(dot).toLowerCase())) return void 0;
  return value;
}
function parseFrames2dTrack(raw, field, diag) {
  if (!isRecord3(raw)) {
    diag.error(field + " must be an object");
    return void 0;
  }
  const extra = unknownKeys2(raw, KNOWN_FRAMES2D_TRACK);
  if (extra.length > 0) diag.error(field + ": unknown field(s) " + extra.map((k) => JSON.stringify(k)).join(", "));
  const track = {};
  if (raw.frames !== void 0) {
    if (!Array.isArray(raw.frames) || raw.frames.length === 0) {
      diag.error(field + ".frames must be a non-empty array of frame file names");
    } else if (raw.frames.length > FRAMES2D_MAX_FRAMES) {
      diag.error(field + ".frames declares too many frames (" + raw.frames.length + ", max " + FRAMES2D_MAX_FRAMES + ")");
    } else {
      const frames = [];
      for (const entry of raw.frames) {
        const safe = safeFrameName(entry);
        if (safe === void 0) diag.error(field + ".frames entry " + JSON.stringify(String(entry)) + " is not a safe image file name");
        else frames.push(safe);
      }
      if (frames.length === raw.frames.length) track.frames = frames;
    }
  }
  if (raw.frameMs !== void 0) {
    if (!Array.isArray(raw.frameMs) || raw.frameMs.length === 0 || raw.frameMs.some((v) => typeof v !== "number" || !Number.isInteger(v) || v < FRAMES2D_MIN_FRAME_MS || v > FRAMES2D_MAX_FRAME_MS)) {
      diag.error(field + ".frameMs must be a non-empty array of integer ms in [" + FRAMES2D_MIN_FRAME_MS + ", " + FRAMES2D_MAX_FRAME_MS + "]");
    } else if (track.frames === void 0) {
      diag.error(field + ".frameMs requires a valid explicit frames list (directory tracks use filename-encoded ms or defaultFrameMs)");
    } else if (raw.frameMs.length !== track.frames.length) {
      diag.error(field + ".frameMs must have the same length as frames");
    } else {
      track.frameMs = raw.frameMs;
    }
  }
  if (raw.loop !== void 0) {
    if (typeof raw.loop !== "boolean") diag.error(field + ".loop must be a boolean");
    else track.loop = raw.loop;
  }
  if (raw.fallback !== void 0) {
    if (typeof raw.fallback !== "string" || !validTrackName(raw.fallback)) diag.error(field + ".fallback must be a track name");
    else track.fallback = raw.fallback;
  }
  return diag.hasErrors ? void 0 : track;
}
function parseFrames2dBlock(raw, diag) {
  if (!isRecord3(raw)) {
    diag.error('renderer frames2d requires a "frames2d" block object');
    return void 0;
  }
  const extra = unknownKeys2(raw, KNOWN_FRAMES2D);
  if (extra.length > 0) diag.error("frames2d: unknown field(s) " + extra.map((k) => JSON.stringify(k)).join(", "));
  const block = { tracks: {}, phases: { idle: "" } };
  if (raw.dir !== void 0) {
    const dir = safeManifestPath(raw.dir);
    if (dir === void 0) diag.error("frames2d.dir must be a safe manifest-relative directory");
    else block.dir = dir;
  }
  if (raw.defaultFrameMs !== void 0) {
    if (typeof raw.defaultFrameMs !== "number" || !Number.isInteger(raw.defaultFrameMs) || raw.defaultFrameMs < FRAMES2D_MIN_FRAME_MS || raw.defaultFrameMs > FRAMES2D_MAX_FRAME_MS) {
      diag.error("frames2d.defaultFrameMs must be an integer in [" + FRAMES2D_MIN_FRAME_MS + ", " + FRAMES2D_MAX_FRAME_MS + "]");
    } else block.defaultFrameMs = raw.defaultFrameMs;
  }
  const tracks = {};
  if (!isRecord3(raw.tracks)) {
    diag.error("frames2d.tracks is required and must be an object keyed by track name");
  } else {
    const entries = Object.entries(raw.tracks);
    if (entries.length === 0) diag.error("frames2d.tracks must declare at least one track");
    if (entries.length > FRAMES2D_MAX_TRACKS) diag.error("frames2d.tracks declares too many tracks (" + entries.length + ", max " + FRAMES2D_MAX_TRACKS + ")");
    for (const [name2, value] of entries) {
      if (!validTrackName(name2)) {
        diag.error("frames2d.tracks: invalid track name " + JSON.stringify(name2) + " (lowercase kebab, at most 32 chars)");
        continue;
      }
      const track = parseFrames2dTrack(value, "frames2d.tracks." + name2, diag);
      if (track !== void 0) tracks[name2] = track;
    }
  }
  block.tracks = tracks;
  const phases = parsePhaseStringMap(raw.phases, "frames2d.phases", diag);
  if (raw.phases === void 0) diag.error('frames2d.phases is required (at least an "idle" mapping)');
  else if (phases !== void 0 && phases.idle === void 0) diag.error("frames2d.phases.idle is required (unmapped phases fall back to it)");
  const phasesValid = phases !== void 0 && phases.idle !== void 0;
  if (phasesValid) block.phases = phases;
  if (phasesValid) {
    for (const [phase, target] of Object.entries(block.phases)) {
      if (target !== void 0 && tracks[target] === void 0) diag.error("frames2d.phases." + phase + " references unknown track " + JSON.stringify(target));
    }
  }
  for (const [name2, track] of Object.entries(tracks)) {
    if (track.fallback !== void 0 && tracks[track.fallback] === void 0) {
      diag.error("frames2d.tracks." + name2 + ".fallback references unknown track " + JSON.stringify(track.fallback));
    }
  }
  if (raw.skins !== void 0) {
    if (!Array.isArray(raw.skins) || raw.skins.length === 0 || raw.skins.length > FRAMES2D_MAX_SKINS) {
      diag.error("frames2d.skins must be an array of 1.." + FRAMES2D_MAX_SKINS + " skins");
    } else {
      const skins = [];
      const seen = /* @__PURE__ */ new Set();
      for (const [index, entry] of raw.skins.entries()) {
        const field = "frames2d.skins[" + index + "]";
        if (!isRecord3(entry)) {
          diag.error(field + " must be an object");
          continue;
        }
        const extra2 = unknownKeys2(entry, KNOWN_SKIN);
        if (extra2.length > 0) diag.error(field + ": unknown field(s) " + extra2.map((k) => JSON.stringify(k)).join(", "));
        const id = typeof entry.id === "string" ? entry.id.trim() : "";
        if (id === "" || id.length > 24 || !FRAMES2D_TRACK_NAME.test(id)) {
          diag.error(field + ".id must be a lowercase kebab id of at most 24 chars");
          continue;
        }
        if (seen.has(id)) {
          diag.error(field + ": duplicate skin id " + JSON.stringify(id));
          continue;
        }
        seen.add(id);
        const label = typeof entry.label === "string" ? entry.label.trim() : "";
        if (label === "" || label.length > 40) {
          diag.error(field + ".label must be a non-empty string of at most 40 chars");
          continue;
        }
        const idleTrack = typeof entry.idleTrack === "string" ? entry.idleTrack : "";
        if (!validTrackName(idleTrack) || tracks[idleTrack] === void 0) {
          diag.error(field + ".idleTrack must name a declared frames2d track");
          continue;
        }
        let clickActions;
        if (entry.clickActions !== void 0) {
          if (!Array.isArray(entry.clickActions) || entry.clickActions.length === 0 || entry.clickActions.length > FRAMES2D_MAX_SKIN_CLICKS) {
            diag.error(field + ".clickActions must be an array of 1.." + FRAMES2D_MAX_SKIN_CLICKS + " actions");
          } else {
            const resolved = [];
            for (const [cIndex, action] of entry.clickActions.entries()) {
              const cField = field + ".clickActions[" + cIndex + "]";
              if (!isRecord3(action)) {
                diag.error(cField + " must be an object");
                continue;
              }
              const cExtra = unknownKeys2(action, KNOWN_SKIN_CLICK);
              if (cExtra.length > 0) diag.error(cField + ": unknown field(s) " + cExtra.map((k) => JSON.stringify(k)).join(", "));
              const trackName = typeof action.track === "string" ? action.track : "";
              if (!validTrackName(trackName) || tracks[trackName] === void 0) {
                diag.error(cField + ".track must name a declared frames2d track");
                continue;
              }
              if (typeof action.probability !== "number" || !Number.isFinite(action.probability) || action.probability <= 0 || action.probability > 1) {
                diag.error(cField + ".probability must be a number in (0, 1]");
                continue;
              }
              const phrases = parseSkinPhrases(action.phrases, cField + ".phrases", diag);
              resolved.push({ track: trackName, probability: action.probability, ...phrases === void 0 ? {} : { phrases } });
            }
            if (resolved.length > 0) clickActions = resolved;
          }
        }
        let gameplayTracks;
        if (entry.gameplayTracks !== void 0) {
          if (!isRecord3(entry.gameplayTracks)) {
            diag.error(field + ".gameplayTracks must be an object mapping gameplay state names to tracks");
          } else {
            const states = Object.keys(entry.gameplayTracks);
            if (states.length === 0 || states.length > FRAMES2D_MAX_SKIN_GAMEPLAY) {
              diag.error(field + ".gameplayTracks must map 1.." + FRAMES2D_MAX_SKIN_GAMEPLAY + " gameplay states");
            } else {
              const resolvedTracks = {};
              for (const state of states) {
                if (!/^[a-z0-9][a-z0-9-]*$/.test(state)) {
                  diag.error(field + ".gameplayTracks key " + JSON.stringify(state) + " must be a lowercase kebab state name");
                  continue;
                }
                const gTrack = entry.gameplayTracks[state];
                if (typeof gTrack !== "string" || !validTrackName(gTrack) || tracks[gTrack] === void 0) {
                  diag.error(field + ".gameplayTracks[" + JSON.stringify(state) + "] must name a declared frames2d track");
                  continue;
                }
                resolvedTracks[state] = gTrack;
              }
              if (Object.keys(resolvedTracks).length > 0) gameplayTracks = resolvedTracks;
            }
          }
        }
        skins.push({ id, label, idleTrack, ...clickActions === void 0 ? {} : { clickActions }, ...gameplayTracks === void 0 ? {} : { gameplayTracks } });
      }
      if (skins.length > 0) block.skins = skins;
    }
  }
  return diag.hasErrors ? void 0 : block;
}
function compatV1(source, diag) {
  const id = parseStringBlock(source, "id", diag, true);
  if (id !== void 0 && !PET_ID_PATTERN.test(id)) {
    diag.error("id " + JSON.stringify(id) + " is not a lowercase kebab id");
  }
  const displayName = typeof source.displayName === "string" && source.displayName.trim() !== "" ? source.displayName.trim() : id;
  const spritesheetRaw = source.spritesheetPath === void 0 ? "spritesheet.webp" : source.spritesheetPath;
  const spritesheetPath = safeManifestPath(spritesheetRaw);
  if (spritesheetPath === void 0) {
    diag.error("spritesheetPath " + JSON.stringify(String(source.spritesheetPath)) + " is not a safe relative path");
  }
  if (source.license === void 0) {
    diag.warn("v1 compat read: no license field; run scripts/dsh-pet-migrate-v2 to migrate this pet");
  }
  const sprite2d = { spritesheetPath: spritesheetPath ?? "spritesheet.webp" };
  if (isRecord3(source.cell)) sprite2d.cell = source.cell;
  if (typeof source.columns === "number") sprite2d.columns = source.columns;
  if (Array.isArray(source.frames)) sprite2d.frames = source.frames;
  if (isRecord3(source.tracks)) sprite2d.tracks = source.tracks;
  if (source.spriteVersionNumber === 2) sprite2d.atlasRows = 11;
  const manifest = {
    petManifestVersion: PET_MANIFEST_V2,
    id: id ?? "",
    displayName: displayName ?? "",
    renderer: "sprite2d",
    sprite2d
  };
  if (typeof source.description === "string" && source.description.trim() !== "") manifest.description = source.description.trim();
  if (typeof source.license === "string" && source.license.trim() !== "") manifest.license = source.license.trim();
  const sequences = parseSequences(source.sequences, diag);
  if (sequences !== void 0) manifest.sequences = sequences;
  if (source.remarks !== void 0) manifest.remarks = source.remarks;
  return diag.hasErrors ? void 0 : manifest;
}
function parseV2(source, diag) {
  const extra = unknownKeys2(source, KNOWN_TOP_LEVEL);
  if (extra.length > 0) diag.error("unknown top-level field(s) " + extra.map((k) => JSON.stringify(k)).join(", "));
  if (source.petManifestVersion !== PET_MANIFEST_V2) {
    diag.error("petManifestVersion must be 2 (got " + JSON.stringify(source.petManifestVersion) + ")");
  }
  const id = parseStringBlock(source, "id", diag, true);
  if (id !== void 0 && (!PET_ID_PATTERN.test(id) || id.length > 64)) {
    diag.error("id " + JSON.stringify(id) + " must be a lowercase kebab id of at most 64 chars");
  }
  const displayName = parseStringBlock(source, "displayName", diag, true);
  const license = parseStringBlock(source, "license", diag, true);
  const rendererRaw = source.renderer === void 0 ? "sprite2d" : source.renderer;
  if (!PET_RENDERER_KINDS.includes(rendererRaw)) {
    diag.error("unknown renderer " + JSON.stringify(rendererRaw) + "; expected one of " + PET_RENDERER_KINDS.join(", "));
  }
  const renderer = rendererRaw;
  const manifest = {
    petManifestVersion: PET_MANIFEST_V2,
    id: id ?? "",
    displayName: displayName ?? "",
    renderer
  };
  if (license !== void 0) manifest.license = license;
  if (source.description !== void 0) {
    if (typeof source.description !== "string" || source.description.length > 500) diag.error("description must be a string of at most 500 chars");
    else manifest.description = source.description;
  }
  if (source.version !== void 0) {
    if (typeof source.version !== "string" || !SEMVER_PATTERN.test(source.version)) diag.error("version must be a semver string (x.y.z)");
    else manifest.version = source.version;
  }
  if (source.frameDensity !== void 0) {
    if (!Number.isInteger(source.frameDensity) || source.frameDensity < 1 || source.frameDensity > 4) {
      diag.error("frameDensity must be an integer from 1 to 4");
    } else manifest.frameDensity = source.frameDensity;
  }
  if (source.author !== void 0) {
    if (typeof source.author !== "string" || source.author.length > 128) diag.error("author must be a string of at most 128 chars");
    else manifest.author = source.author;
  }
  if (source.homepage !== void 0) {
    if (typeof source.homepage !== "string") diag.error("homepage must be a string URL");
    else manifest.homepage = source.homepage;
  }
  if (renderer === "sprite2d") {
    const block = parseSprite2dBlock(source.sprite2d, diag);
    if (block !== void 0) manifest.sprite2d = block;
    if (source.live2d !== void 0) diag.error("renderer sprite2d must not declare a live2d block");
    if (source.frames2d !== void 0) diag.error("renderer sprite2d must not declare a frames2d block");
  } else if (renderer === "live2d") {
    const block = parseLive2dBlock(source.live2d, diag);
    if (block !== void 0) manifest.live2d = block;
    if (source.sprite2d !== void 0) diag.error("renderer live2d must not declare a sprite2d block");
    if (source.frames2d !== void 0) diag.error("renderer live2d must not declare a frames2d block");
  } else if (renderer === "frames2d") {
    const block = parseFrames2dBlock(source.frames2d, diag);
    if (block !== void 0) manifest.frames2d = block;
    if (source.sprite2d !== void 0) diag.error("renderer frames2d must not declare a sprite2d block");
    if (source.live2d !== void 0) diag.error("renderer frames2d must not declare a live2d block");
  }
  if (source.gameplay !== void 0) {
    if (renderer !== "frames2d") {
      diag.error("gameplay currently requires renderer frames2d (its state references name frames2d tracks)");
    } else {
      const gameplay = parseGameplayManifest(source.gameplay, {
        stateNames: new Set(Object.keys(manifest.frames2d?.tracks ?? {})),
        error: (message) => diag.error("gameplay: " + message)
      });
      if (gameplay !== void 0) manifest.gameplay = gameplay;
    }
  }
  const sequences = parseSequences(source.sequences, diag);
  if (sequences !== void 0) manifest.sequences = sequences;
  if (source.remarks !== void 0 && !isRecord3(source.remarks)) diag.error("remarks must be an object of remark pools");
  else if (source.remarks !== void 0) manifest.remarks = source.remarks;
  return diag.hasErrors ? void 0 : manifest;
}
function parsePetManifest(raw, sourceLabel) {
  const diag = new Diagnostics(sourceLabel);
  if (!isRecord3(raw)) {
    diag.error("manifest is not an object");
    return { ok: false, diagnostics: diag.list };
  }
  if (raw.petManifestVersion === void 0) {
    const manifest2 = compatV1(raw, diag);
    if (manifest2 === void 0) return { ok: false, diagnostics: diag.list };
    diag.warn('v1 compat read: manifest treated as renderer "sprite2d"; run scripts/dsh-pet-migrate-v2 to migrate');
    return { ok: true, manifest: manifest2, migrated: "v1-compat", diagnostics: diag.list };
  }
  const manifest = parseV2(raw, diag);
  if (manifest === void 0) return { ok: false, diagnostics: diag.list };
  return { ok: true, manifest, migrated: void 0, diagnostics: diag.list };
}

// src/decoration.ts
var DECORATION_CELL_MAX = 256;
var DECORATION_COLUMNS_MAX = 16;
var DECORATION_DURATION_MAX_MS = 2e3;
var DECORATION_ENTRY_EXTENSIONS = [".webp", ".png"];
var DECORATION_DISPLAY_NAME_MAX = 64;
var KNOWN_DECORATION_TOP_LEVEL = /* @__PURE__ */ new Set([
  "$schema",
  "decorationManifestVersion",
  "id",
  "displayName",
  "license",
  "entry",
  "cell",
  "columns",
  "frameMs",
  "durations",
  "loop",
  "phases"
]);
var PET_ID_PATTERN2 = /^[a-z0-9][a-z0-9-]*$/;
var PATH_SEGMENT_PATTERN2 = /^[A-Za-z0-9._-]+$/;
var Diagnostics2 = class {
  list = [];
  source;
  constructor(source) {
    this.source = source;
  }
  error(message) {
    this.list.push({ level: "error", message: this.source + ": " + message });
  }
  warn(message) {
    this.list.push({ level: "warning", message: this.source + ": " + message });
  }
  get hasErrors() {
    return this.list.some((d) => d.level === "error");
  }
};
function isRecord4(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function unknownKeys3(source, known) {
  return Object.keys(source).filter((key) => !known.has(key));
}
function finiteInt(value, min, max) {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max ? value : void 0;
}
function safeDecorationEntry(raw) {
  if (typeof raw !== "string" || raw.trim() === "") return void 0;
  const value = raw.trim();
  if (value.length > 256) return void 0;
  if (isAbsolute3(value) || value.includes("\\") || /^[a-z][a-z0-9+.-]*:/i.test(value)) return void 0;
  const segments = value.split("/").filter((segment) => segment !== "");
  if (segments.length === 0) return void 0;
  if (segments.some((segment) => segment === "." || segment === ".." || !PATH_SEGMENT_PATTERN2.test(segment))) return void 0;
  const last = segments[segments.length - 1];
  const dot = last.lastIndexOf(".");
  if (dot <= 0 || !DECORATION_ENTRY_EXTENSIONS.includes(last.slice(dot))) return void 0;
  return segments.join("/");
}
function normalizeSegment(raw, columns, diag) {
  if (raw === "hide") return "hide";
  if (!isRecord4(raw)) {
    diag.warn('phase binding must be "hide" or { from, to }; binding dropped');
    return void 0;
  }
  const from = finiteInt(raw.from, 0, columns - 1);
  const to = finiteInt(raw.to, 0, columns - 1);
  if (from === void 0 || to === void 0 || from > to) {
    diag.warn("phase frame segment out of range; binding dropped");
    return void 0;
  }
  return { from, to };
}
function parseDecorationManifest(raw, source = "decoration.json") {
  const diag = new Diagnostics2(source);
  if (!isRecord4(raw)) {
    diag.error("descriptor must be a JSON object");
    return { ok: false, diagnostics: diag.list };
  }
  for (const key of unknownKeys3(raw, KNOWN_DECORATION_TOP_LEVEL)) {
    diag.error("unknown top-level field " + JSON.stringify(key));
  }
  if (raw.decorationManifestVersion !== 1) {
    diag.error("decorationManifestVersion must be 1");
  }
  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  if (!PET_ID_PATTERN2.test(id)) {
    diag.error("id must be a lowercase kebab id");
  }
  if (id.length > 64) {
    diag.error("id must be at most 64 characters");
  }
  const license = typeof raw.license === "string" ? raw.license.trim() : "";
  if (license === "") diag.error("license is required (asset provenance)");
  if (license.length > 128) {
    diag.error("license must be at most 128 characters");
  }
  const entry = safeDecorationEntry(raw.entry);
  if (entry === void 0) {
    diag.error("entry must be a safe relative PNG/WebP path");
  }
  const rawCell = isRecord4(raw.cell) ? raw.cell : {};
  for (const key of Object.keys(rawCell)) {
    if (key !== "width" && key !== "height") diag.warn("unknown cell field " + JSON.stringify(key) + " ignored");
  }
  const cellWidth = finiteInt(rawCell.width, 1, DECORATION_CELL_MAX);
  const cellHeight = finiteInt(rawCell.height, 1, DECORATION_CELL_MAX);
  if (cellWidth === void 0 || cellHeight === void 0) {
    diag.error("cell width/height must be integers in [1, " + DECORATION_CELL_MAX + "]");
  }
  const columns = finiteInt(raw.columns, 1, DECORATION_COLUMNS_MAX);
  if (columns === void 0) {
    diag.error("columns must be an integer in [1, " + DECORATION_COLUMNS_MAX + "]");
  }
  if (diag.hasErrors || id === "" || entry === void 0 || columns === void 0) {
    return { ok: false, diagnostics: diag.list };
  }
  const displayName = typeof raw.displayName === "string" && raw.displayName.trim() !== "" ? raw.displayName.trim().slice(0, DECORATION_DISPLAY_NAME_MAX) : id;
  let loop;
  if (raw.loop === void 0 || typeof raw.loop === "boolean") {
    loop = raw.loop ?? true;
  } else {
    diag.warn("loop must be a boolean; defaulting to true");
    loop = true;
  }
  const rawDurations = raw.durations;
  let durations;
  if (Array.isArray(rawDurations)) {
    const usable = rawDurations.filter((v) => typeof v === "number" && Number.isInteger(v) && v >= 1 && v <= DECORATION_DURATION_MAX_MS);
    if (usable.length !== columns) {
      diag.warn("durations length must equal columns; using the constant frameMs instead");
      durations = [];
    } else {
      durations = usable;
    }
  } else if (rawDurations !== void 0) {
    diag.warn("durations must be an array; using the constant frameMs instead");
    durations = [];
  } else {
    durations = [];
  }
  if (durations.length === 0) {
    const frameMs = finiteInt(raw.frameMs, 1, DECORATION_DURATION_MAX_MS) ?? 120;
    durations = Array.from({ length: columns }, () => frameMs);
  }
  const phases = {};
  const rawPhases = raw.phases;
  if (isRecord4(rawPhases)) {
    for (const [key, value] of Object.entries(rawPhases)) {
      if (!PET_ACTIVITY_PHASES.includes(key)) {
        diag.warn("unknown phase " + JSON.stringify(key) + "; binding ignored");
        continue;
      }
      const segment = normalizeSegment(value, columns, diag);
      if (segment !== void 0) phases[key] = segment;
    }
  } else if (rawPhases !== void 0) {
    diag.warn("phases must be an object; all phases hide");
  }
  const visible = Object.values(phases).some((segment) => segment !== "hide");
  if (!visible) diag.warn("no phase shows the ornament; the decoration stays hidden");
  const manifest = {
    decorationManifestVersion: 1,
    id,
    displayName,
    license,
    entry,
    cell: { width: cellWidth, height: cellHeight },
    columns,
    durations,
    loop,
    phases
  };
  return { ok: true, manifest, diagnostics: diag.list };
}

// src/image-dimensions.ts
var PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
function pngDimensions(buf) {
  if (buf.length < 24) return void 0;
  if (!buf.subarray(0, 8).equals(PNG_SIGNATURE)) return void 0;
  if (buf.toString("ascii", 12, 16) !== "IHDR") return void 0;
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}
function webpDimensions(buf) {
  if (buf.length < 21) return void 0;
  if (buf.toString("ascii", 0, 4) !== "RIFF") return void 0;
  if (buf.toString("ascii", 8, 12) !== "WEBP") return void 0;
  const fourcc = buf.toString("ascii", 12, 16);
  if (fourcc === "VP8X") {
    if (buf.length < 30) return void 0;
    return {
      width: 1 + buf.readUIntLE(24, 3),
      height: 1 + buf.readUIntLE(27, 3)
    };
  }
  if (fourcc === "VP8L") {
    if (buf.length < 25) return void 0;
    const bits = buf.readUInt32LE(21);
    return {
      width: 1 + (bits & 16383),
      height: 1 + (bits >>> 14 & 16383)
    };
  }
  if (fourcc === "VP8 ") {
    if (buf.length < 30) return void 0;
    return {
      width: buf.readUInt16LE(26) & 16383,
      height: buf.readUInt16LE(28) & 16383
    };
  }
  return void 0;
}
function imageDimensions(buf) {
  if (buf.length >= 12 && buf.toString("ascii", 0, 4) === "RIFF") return webpDimensions(buf);
  return pngDimensions(buf);
}

// src/contracts/status-decoration.ts
var PET_DECORATION_API_VERSION = "x-org.linxin666.pet-center/status-decoration-v1";

// src/model3.ts
function collectModel3References(model3) {
  const errors = [];
  if (typeof model3 !== "object" || model3 === null) {
    return { references: [], errors: ["model3.json is not an object"] };
  }
  const fileReferences = model3.FileReferences;
  if (typeof fileReferences !== "object" || fileReferences === null) {
    return { references: [], errors: ["model3.json has no FileReferences"] };
  }
  const refs = fileReferences;
  const collected = /* @__PURE__ */ new Set();
  const push = (raw, field) => {
    const safe = safeManifestPath(raw);
    if (safe === void 0) {
      errors.push(field + " is not a safe relative path: " + JSON.stringify(String(raw)));
      return;
    }
    collected.add(safe);
  };
  if (refs.Moc !== void 0) push(refs.Moc, "FileReferences.Moc");
  if (Array.isArray(refs.Textures)) {
    refs.Textures.forEach((texture, index) => push(texture, "FileReferences.Textures[" + index + "]"));
  }
  for (const scalar of ["Physics", "Pose", "DisplayInfo", "UserData"]) {
    if (refs[scalar] !== void 0) push(refs[scalar], "FileReferences." + scalar);
  }
  if (Array.isArray(refs.Expressions)) {
    refs.Expressions.forEach((expression, index) => {
      const file = typeof expression === "object" && expression !== null ? expression.File : void 0;
      if (file !== void 0) push(file, "FileReferences.Expressions[" + index + "].File");
    });
  }
  if (typeof refs.Motions === "object" && refs.Motions !== null) {
    for (const [group, motions] of Object.entries(refs.Motions)) {
      if (!Array.isArray(motions)) {
        errors.push("FileReferences.Motions." + group + " is not an array");
        continue;
      }
      motions.forEach((motion, index) => {
        const file = typeof motion === "object" && motion !== null ? motion.File : void 0;
        if (file !== void 0) push(file, "FileReferences.Motions." + group + "[" + index + "].File");
      });
    }
  }
  return { references: [...collected].sort(), errors };
}

// src/registry.ts
var PET_ROW_ORDER = [
  "idle",
  "running-right",
  "running-left",
  "waving",
  "jumping",
  "failed",
  "waiting",
  "running",
  "review"
];
var DEFAULT_PET_CELL = { width: 192, height: 208 };
var DEFAULT_PET_COLUMNS = 8;
var DEFAULT_PET_ROW_COUNT = 9;
var DEFAULT_FRAME_COUNTS = [6, 8, 8, 4, 5, 8, 6, 6, 6];
function petPackageRoot(importMetaUrl) {
  return fileURLToPath(new URL("../", importMetaUrl));
}
function codexPetsDir(env = process.env, home = homedir2()) {
  const raw = env.CODEX_HOME !== void 0 && env.CODEX_HOME.trim() !== "" ? env.CODEX_HOME.trim() : join3(home, ".codex");
  const expanded = raw === "~" ? home : raw.startsWith("~/") || raw.startsWith("~\\") ? join3(home, raw.slice(2)) : raw;
  return join3(expanded, "pets");
}
function finiteInt2(value, fallback, max) {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= max ? value : fallback;
}
function assetUrl(prefix, id, file) {
  const path = file.split("/").filter((segment) => segment !== "").join("/");
  return prefix + "/" + encodeURIComponent(id) + "/" + path;
}
var DEFAULT_TRACK_PATTERNS = {
  idle: { durations: [500, 500, 600, 500, 500, 600], loop: true },
  "running-right": { durations: [300, 300, 300, 300, 300, 300, 300, 400], loop: true },
  "running-left": { durations: [300, 300, 300, 300, 300, 300, 300, 400], loop: true },
  waving: { durations: [450, 450, 450, 450], loop: true },
  jumping: { durations: [400, 400, 400, 450, 450], loop: false, fallback: "idle" },
  failed: { durations: [550, 550, 550, 600, 650, 700, 550, 550], loop: false, fallback: "idle" },
  waiting: { durations: [550, 550, 600, 550, 550, 600], loop: true },
  running: { durations: [330, 330, 330, 330, 330, 400], loop: true },
  review: { durations: [650, 650, 650, 650, 650, 650], loop: true }
};
var PET_ID_PATTERN3 = /^[a-z0-9][a-z0-9-]*$/;
var PATH_SEGMENT_PATTERN3 = /^[A-Za-z0-9._-]+$/;
var PET_NAME_MAX_LENGTH2 = 80;
var PET_PHASES = ["idle", "waiting", "thinking", "tool", "review", "done", "failed"];
function normalizeSequences(raw, id, warn) {
  if (raw === void 0) return void 0;
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    warn("manifest " + id + ": sequences must be an object keyed by activity phase");
    return void 0;
  }
  const sequences = {};
  for (const [phase, value] of Object.entries(raw)) {
    if (!PET_PHASES.includes(phase)) {
      warn("manifest " + id + ": unknown sequence phase " + JSON.stringify(phase));
      continue;
    }
    if (!Array.isArray(value) || value.length < 5) {
      warn("manifest " + id + ": sequence " + phase + " must contain at least 5 animations");
      continue;
    }
    const unknownIndex = value.findIndex((animation) => typeof animation !== "string" || !PET_ROW_ORDER.includes(animation));
    if (unknownIndex !== -1) {
      const unknown = value[unknownIndex];
      warn("manifest " + id + ": sequence " + phase + " contains unknown animation " + JSON.stringify(unknown));
      continue;
    }
    sequences[phase] = value;
  }
  return Object.keys(sequences).length === 0 ? void 0 : sequences;
}
function buildTracks(rows, columns, trackOverrides, warn) {
  const tracks = {};
  for (const [row, animation] of PET_ROW_ORDER.entries()) {
    const pattern = DEFAULT_TRACK_PATTERNS[animation];
    const override = trackOverrides[animation];
    const durations = Array.isArray(override?.durations) && override.durations.length > 0 ? override.durations.filter((value) => typeof value === "number" && Number.isFinite(value) && value > 0) : pattern.durations;
    if (durations.length === 0) {
      warn("track " + animation + " carries no usable durations");
      return void 0;
    }
    const rowFrames = Math.max(1, Math.min(rows[row], columns));
    if (override?.frames !== void 0 && (!Array.isArray(override.frames) || override.frames.length === 0 || override.frames.length > rowFrames || override.frames.some((frame) => !Number.isInteger(frame) || frame < 0 || frame >= rowFrames))) {
      warn("track " + animation + " carries invalid atlas frame indices");
      return void 0;
    }
    const frames = override?.frames ?? Array.from({ length: rowFrames }, (_, index) => index);
    const frameCount = frames.length;
    const sized = durations.length >= frameCount ? durations.slice(0, frameCount) : Array.from({ length: frameCount }, (_, index) => durations[index % durations.length]);
    tracks[animation] = {
      frames: [...frames],
      durations: sized,
      loop: typeof override?.loop === "boolean" ? override.loop : pattern.loop,
      ...override?.fallback === void 0 ? pattern.fallback === void 0 ? {} : { fallback: pattern.fallback } : PET_ROW_ORDER.includes(override.fallback) ? { fallback: override.fallback } : pattern.fallback === void 0 ? {} : { fallback: pattern.fallback }
    };
  }
  return tracks;
}
function resolvePetManifest(raw, dir, options = {}) {
  const { assetPrefix = "/pet", warnings = [] } = options;
  const warn = (message) => {
    warnings.push(message);
  };
  if (typeof raw !== "object" || raw === null) {
    warn("manifest is not an object");
    return void 0;
  }
  const source = raw;
  const id = typeof source.id === "string" ? source.id.trim() : "";
  if (!PET_ID_PATTERN3.test(id)) {
    warn("manifest id " + JSON.stringify(String(source.id)) + " is not a lowercase kebab id");
    return void 0;
  }
  const displayName = typeof source.displayName === "string" && source.displayName.trim() !== "" ? source.displayName.trim().slice(0, PET_NAME_MAX_LENGTH2) : id;
  const description = typeof source.description === "string" ? source.description.trim() : "";
  const spritesheet = typeof source.spritesheetPath === "string" && source.spritesheetPath.trim() !== "" ? source.spritesheetPath.trim() : "spritesheet.webp";
  const spritesheetPath = spritesheet.split("/").filter((segment) => segment !== "");
  if (spritesheetPath.length === 0 || isAbsolute4(spritesheet) || spritesheet.includes("\\") || spritesheetPath.some((segment) => segment === ".." || !PATH_SEGMENT_PATTERN3.test(segment))) {
    warn("manifest spritesheetPath " + JSON.stringify(spritesheet) + " is not a safe relative path");
    return void 0;
  }
  const rawCell = typeof source.cell === "object" && source.cell !== null ? source.cell : {};
  const cell = {
    width: finiteInt2(rawCell.width, DEFAULT_PET_CELL.width, 2048),
    height: finiteInt2(rawCell.height, DEFAULT_PET_CELL.height, 2048)
  };
  const columns = finiteInt2(source.columns, DEFAULT_PET_COLUMNS, 32);
  const atlasRowCount = source.spriteVersionNumber === 2 ? 11 : DEFAULT_PET_ROW_COUNT;
  const rows = DEFAULT_FRAME_COUNTS.map((fallback, index) => {
    const value = Array.isArray(source.frames) ? source.frames[index] : void 0;
    return finiteInt2(value, fallback, columns);
  });
  const remarks = normalizePetRemarks(source.remarks, (message) => warn("manifest " + id + ": " + message));
  const sequences = normalizeSequences(source.sequences, id, warn);
  const trackOverrides = typeof source.tracks === "object" && source.tracks !== null ? source.tracks : {};
  const tracks = buildTracks(rows, columns, trackOverrides, (message) => warn("manifest " + id + ": " + message));
  if (tracks === void 0) return void 0;
  const sheet = spritesheetPath.join("/");
  return {
    id,
    displayName,
    description,
    renderer: "sprite2d",
    cell,
    columns,
    rows,
    atlasRows: atlasRowCount,
    tracks,
    ...sequences === void 0 ? {} : { sequences },
    atlasUrl: assetUrl(assetPrefix, id, spritesheet),
    manifestUrl: assetUrl(assetPrefix, id, "pet.json"),
    dir,
    spritesheetPath: sheet,
    servable: [sheet, ...["whale-girl-refined", "blue-whale-business"].includes(id) ? ["ds", "gpt", "claude", "kimi", "glm"].map((palette) => "palettes/" + palette + ".png").filter((file) => existsSync(join3(dir, file))) : []],
    ...remarks === void 0 ? {} : { remarks }
  };
}
function flattenV2Sprite2d(manifest) {
  const block = manifest.sprite2d;
  if (block === void 0) return void 0;
  const legacy = {
    id: manifest.id,
    displayName: manifest.displayName,
    spritesheetPath: block.spritesheetPath
  };
  if (manifest.description !== void 0) legacy.description = manifest.description;
  if (block.cell !== void 0) legacy.cell = block.cell;
  if (block.columns !== void 0) legacy.columns = block.columns;
  if (block.frames !== void 0) legacy.frames = block.frames;
  if (block.tracks !== void 0) legacy.tracks = block.tracks;
  if (block.atlasRows !== void 0) {
    if (block.atlasRows === 11) legacy.spriteVersionNumber = 2;
    else if (block.atlasRows !== DEFAULT_PET_ROW_COUNT) return void 0;
  }
  if (manifest.sequences !== void 0) legacy.sequences = manifest.sequences;
  if (manifest.remarks !== void 0) legacy.remarks = manifest.remarks;
  return legacy;
}
function resolveLive2dEntry(manifest, dir, options) {
  const assetPrefix = options.assetPrefix ?? "/pet";
  const record = (level, message) => {
    options.diagnostics?.push({ level, source: dir, message });
    options.warnings?.push(message);
  };
  const block = manifest.live2d;
  if (block === void 0) {
    record("error", "pet " + manifest.id + ": renderer live2d requires a live2d block");
    return void 0;
  }
  const modelFile = join3(dir, block.model);
  let model3;
  try {
    if (guardedScannedJsonStat(modelFile, options, "live2d model " + block.model, PET_SCAN_LIVE2D_MODEL_CAP) === void 0) {
      statSync(modelFile);
      return void 0;
    }
    model3 = JSON.parse(readFileSync2(modelFile, "utf8"));
  } catch (error) {
    record("error", "pet " + manifest.id + ": live2d model " + block.model + " is not readable: " + (error instanceof Error ? error.message : String(error)));
    return void 0;
  }
  const { references, errors } = collectModel3References(model3);
  if (errors.length > 0) {
    for (const message of errors) {
      record("error", "pet " + manifest.id + ": live2d model " + block.model + ": " + message);
    }
    return void 0;
  }
  for (const reference of references) {
    if (!existsSync(join3(dir, reference))) {
      record("warning", "pet " + manifest.id + ": live2d closure file missing: " + reference);
    }
  }
  const tracks = buildTracks(DEFAULT_FRAME_COUNTS, DEFAULT_PET_COLUMNS, {}, (message) => record("warning", "pet " + manifest.id + ": " + message));
  if (tracks === void 0) return void 0;
  const remarks = normalizePetRemarks(manifest.remarks, (message) => record("warning", "pet " + manifest.id + ": " + message));
  const modelUrl = assetUrl(assetPrefix, manifest.id, block.model);
  const live2d = {
    modelUrl,
    modelPath: block.model,
    ...block.scale === void 0 ? {} : { scale: block.scale },
    ...block.translate === void 0 ? {} : { translate: block.translate },
    motions: block.motions,
    ...block.expressions === void 0 ? {} : { expressions: block.expressions },
    ...block.hitAreas === void 0 ? {} : { hitAreas: block.hitAreas }
  };
  return {
    id: manifest.id,
    displayName: manifest.displayName,
    description: manifest.description ?? "",
    renderer: "live2d",
    live2d,
    cell: { ...DEFAULT_PET_CELL },
    columns: DEFAULT_PET_COLUMNS,
    rows: [...DEFAULT_FRAME_COUNTS],
    atlasRows: DEFAULT_PET_ROW_COUNT,
    tracks,
    atlasUrl: modelUrl,
    manifestUrl: assetUrl(assetPrefix, manifest.id, "pet.json"),
    dir,
    spritesheetPath: block.model,
    servable: [block.model, ...references],
    ...remarks === void 0 ? {} : { remarks }
  };
}
var FRAMES2D_FILENAME_MS = /_(\d+)\.[^.]+$/;
var FRAMES2D_FRAME_INDEX = /(\d+)(?:_\d+)?\.[^.]+$/;
var FRAMES2D_DEFAULT_FRAME_MS = 200;
var FRAMES2D_IMAGE_EXTENSIONS2 = /* @__PURE__ */ new Set([".webp", ".png", ".gif", ".jpg", ".jpeg"]);
function resolveFrames2dEntry(manifest, dir, options) {
  const assetPrefix = options.assetPrefix ?? "/pet";
  const record = (level, message) => {
    options.diagnostics?.push({ level, source: dir, message });
    options.warnings?.push(message);
  };
  const block = manifest.frames2d;
  if (block === void 0) {
    record("error", "pet " + manifest.id + ": renderer frames2d requires a frames2d block");
    return void 0;
  }
  const root = block.dir ?? ".";
  const defaultMs = block.defaultFrameMs ?? FRAMES2D_DEFAULT_FRAME_MS;
  const idleTrack = block.phases.idle;
  const tracks = {};
  const servable = [];
  const firstFrameRel = {};
  for (const [name2, track] of Object.entries(block.tracks)) {
    const trackDir = root === "." ? name2 : root + "/" + name2;
    let relFrames = [];
    if (track.frames !== void 0) {
      for (const frame of track.frames) {
        const rel = trackDir + "/" + frame;
        if (!existsSync(join3(dir, rel))) {
          record("warning", "pet " + manifest.id + ": frames2d frame missing: " + rel);
          continue;
        }
        relFrames.push(rel);
      }
    } else {
      let files = [];
      try {
        files = readdirSync(join3(dir, trackDir)).filter((file) => {
          if (file.startsWith(".")) return false;
          const dot = file.lastIndexOf(".");
          return dot > 0 && FRAMES2D_IMAGE_EXTENSIONS2.has(file.slice(dot).toLowerCase());
        });
      } catch {
        files = [];
      }
      files.sort((a, b) => {
        const ia = FRAMES2D_FRAME_INDEX.exec(a)?.[1];
        const ib = FRAMES2D_FRAME_INDEX.exec(b)?.[1];
        if (ia !== void 0 && ib !== void 0 && ia !== ib) return Number(ia) - Number(ib);
        return a < b ? -1 : a > b ? 1 : 0;
      });
      relFrames = files.map((file) => trackDir + "/" + file);
    }
    if (relFrames.length === 0) {
      record("warning", "pet " + manifest.id + ": frames2d track " + JSON.stringify(name2) + " has no frames on disk; dropped");
      continue;
    }
    const durations = relFrames.map((rel, index) => {
      if (track.frameMs !== void 0) return track.frameMs[index] ?? defaultMs;
      const match = FRAMES2D_FILENAME_MS.exec(rel);
      if (match !== null) {
        const ms = Number(match[1]);
        if (Number.isInteger(ms) && ms >= 16 && ms <= 5e3) return ms;
      }
      return defaultMs;
    });
    const loop = track.loop ?? true;
    const view = {
      frames: relFrames.map((rel) => assetUrl(assetPrefix, manifest.id, rel)),
      durations,
      loop,
      ...loop ? {} : { fallback: track.fallback ?? idleTrack }
    };
    tracks[name2] = view;
    firstFrameRel[name2] = relFrames[0];
    servable.push(...relFrames);
  }
  if (tracks[idleTrack] === void 0) {
    record("error", "pet " + manifest.id + ": frames2d idle track " + JSON.stringify(idleTrack) + " has no frames on disk");
    return void 0;
  }
  const phases = { ...block.phases };
  for (const [phase, target] of Object.entries(phases)) {
    if (target !== void 0 && tracks[target] === void 0) {
      record("warning", "pet " + manifest.id + ": frames2d phase " + phase + " maps to dropped track " + JSON.stringify(target) + "; using idle");
      phases[phase] = idleTrack;
    }
  }
  let skins;
  if (block.skins !== void 0) {
    const resolved = [];
    for (const skin of block.skins) {
      if (tracks[skin.idleTrack] === void 0) {
        record("warning", "pet " + manifest.id + ": frames2d skin " + JSON.stringify(skin.id) + " idleTrack dropped; skipping");
        continue;
      }
      let clickActions;
      if (skin.clickActions !== void 0) {
        const kept = [];
        for (const action of skin.clickActions) {
          if (tracks[action.track] === void 0) {
            record("warning", "pet " + manifest.id + ": frames2d skin " + JSON.stringify(skin.id) + " click action track " + JSON.stringify(action.track) + " dropped");
            continue;
          }
          kept.push(action);
        }
        if (kept.length > 0) clickActions = kept;
      }
      let gameplayTracks;
      if (skin.gameplayTracks !== void 0) {
        const kept = {};
        for (const [state, gTrack] of Object.entries(skin.gameplayTracks)) {
          if (tracks[gTrack] === void 0) {
            record("warning", "pet " + manifest.id + ": frames2d skin " + JSON.stringify(skin.id) + " gameplay track override " + JSON.stringify(state) + " -> " + JSON.stringify(gTrack) + " dropped");
            continue;
          }
          kept[state] = gTrack;
        }
        if (Object.keys(kept).length > 0) gameplayTracks = kept;
      }
      resolved.push({ ...skin, ...clickActions === void 0 ? {} : { clickActions }, ...gameplayTracks === void 0 ? {} : { gameplayTracks } });
    }
    if (resolved.length > 0) skins = resolved;
  }
  const remarks = normalizePetRemarks(manifest.remarks, (message) => record("warning", "pet " + manifest.id + ": " + message));
  let gameplay;
  if (manifest.gameplay !== void 0) {
    gameplay = manifest.gameplay;
    if (gameplay.shop !== void 0) {
      const items = [];
      for (const item of gameplay.shop.items) {
        if (item.image === void 0) {
          items.push(item);
          continue;
        }
        if (!existsSync(join3(dir, item.image))) {
          record("warning", "pet " + manifest.id + ": gameplay shop item " + item.id + " image missing: " + item.image);
          const { image, ...rest } = item;
          items.push(rest);
          continue;
        }
        servable.push(item.image);
        items.push({ ...item, image: assetUrl(assetPrefix, manifest.id, item.image) });
      }
      gameplay = { ...gameplay, shop: { ...gameplay.shop, items } };
    }
  }
  const flatTracks = buildTracks(DEFAULT_FRAME_COUNTS, DEFAULT_PET_COLUMNS, {}, (message) => record("warning", "pet " + manifest.id + ": " + message));
  if (flatTracks === void 0) return void 0;
  const firstAbs = join3(dir, firstFrameRel[idleTrack]);
  const dims = existsSync(firstAbs) ? readImageDimensions(firstAbs) : void 0;
  const cell = dims !== void 0 && dims.width >= 1 && dims.height >= 1 ? dims : { ...DEFAULT_PET_CELL };
  if (manifest.id === "miku") {
    for (const file of [...new Set(servable)]) {
      for (const palette of ["gpt", "claude", "kimi", "glm"]) {
        const sibling = "palettes/" + palette + "/" + file;
        if (existsSync(join3(dir, sibling))) servable.push(sibling);
      }
    }
  }
  return {
    id: manifest.id,
    displayName: manifest.displayName,
    description: manifest.description ?? "",
    renderer: "frames2d",
    frames2d: { tracks, phases, ...skins === void 0 ? {} : { skins } },
    ...gameplay === void 0 ? {} : { gameplay },
    cell,
    columns: DEFAULT_PET_COLUMNS,
    rows: [...DEFAULT_FRAME_COUNTS],
    atlasRows: DEFAULT_PET_ROW_COUNT,
    tracks: flatTracks,
    atlasUrl: tracks[idleTrack].frames[0],
    manifestUrl: assetUrl(assetPrefix, manifest.id, "pet.json"),
    dir,
    spritesheetPath: firstFrameRel[idleTrack],
    servable,
    ...remarks === void 0 ? {} : { remarks }
  };
}
function scanPetDir(dir, options) {
  if (!existsSync(dir)) return [];
  let names = [];
  try {
    names = [...options.names ?? readdirSync(dir)].filter((name2) => !name2.startsWith("."));
  } catch {
    return [];
  }
  names.sort();
  const entries = [];
  for (const name2 of names) {
    const manifestFile = join3(dir, name2, "pet.json");
    if (!existsSync(manifestFile)) continue;
    const parsed = readPetJson(manifestFile, options);
    if (parsed === void 0) continue;
    const entryDir = join3(dir, name2);
    const verdict = parsePetManifest(parsed, entryDir);
    for (const diagnostic of verdict.diagnostics) {
      options.diagnostics?.push({ level: diagnostic.level, source: entryDir, message: diagnostic.message });
      options.warnings?.push(diagnostic.message);
    }
    if (!verdict.ok) continue;
    let entry;
    if (verdict.manifest.renderer === "live2d") {
      entry = resolveLive2dEntry(verdict.manifest, entryDir, options);
    } else if (verdict.manifest.renderer === "frames2d") {
      entry = resolveFrames2dEntry(verdict.manifest, entryDir, options);
    } else {
      const legacy = flattenV2Sprite2d(verdict.manifest);
      if (legacy === void 0) {
        const note = "pet " + verdict.manifest.id + ": sprite2d.atlasRows only supports 9 or 11 under the v1 compat resolver";
        options.diagnostics?.push({ level: "error", source: entryDir, message: note });
        options.warnings?.push(note);
        continue;
      }
      entry = resolvePetManifest(legacy, entryDir, options);
    }
    if (entry === void 0) continue;
    const voice = loadVoicePackFile(join3(entryDir, "voice.json"), options);
    entries.push({
      ...entry,
      ...verdict.manifest.frameDensity === void 0 ? {} : { frameDensity: verdict.manifest.frameDensity },
      ...voice === void 0 ? {} : { voice }
    });
  }
  return entries;
}
function readPetJson(file, options) {
  if (guardedScannedJsonStat(file, options, "pet manifest") === void 0) return void 0;
  try {
    return JSON.parse(readFileSync2(file, "utf8"));
  } catch (error) {
    options.warnings?.push("skipping " + file + ": " + (error instanceof Error ? error.message : String(error)));
    return void 0;
  }
}
var PET_SCAN_JSON_CAP = 64 * 1024;
var PET_SCAN_LIVE2D_MODEL_CAP = 32 * 1024 * 1024;
function guardedScannedJsonStat(file, options, what, cap2 = PET_SCAN_JSON_CAP) {
  let st;
  try {
    st = statSync(file);
  } catch {
    return void 0;
  }
  const warn = (message) => {
    options.warnings?.push(file + ": " + message);
    options.diagnostics?.push({ level: "warning", source: file, message: file + ": " + message });
  };
  if (!st.isFile()) {
    warn(what + " is not a regular file; ignored");
    return void 0;
  }
  if (st.size > cap2) {
    warn(what + " exceeds the " + cap2 + "-byte scan ceiling; ignored");
    return void 0;
  }
  return st;
}
function loadVoicePackFile(file, options) {
  if (!existsSync(file)) return void 0;
  if (guardedScannedJsonStat(file, options, "voice pack") === void 0) return void 0;
  const warn = (message) => {
    options.warnings?.push(file + ": " + message);
    options.diagnostics?.push({ level: "warning", source: file, message: file + ": " + message });
  };
  let raw;
  try {
    raw = JSON.parse(readFileSync2(file, "utf8"));
  } catch (error) {
    warn("voice pack is not valid JSON; ignored: " + (error instanceof Error ? error.message : String(error)));
    return void 0;
  }
  return normalizeVoicePack(raw, warn);
}
var DECORATION_ASSET_PREFIX = "/api/pet/decoration";
function readImageDimensions(file) {
  let header;
  try {
    const fd = openSync(file, "r");
    try {
      header = Buffer.alloc(64);
      const read = readSync(fd, header, 0, header.length, 0);
      if (read < 0) return void 0;
      header = header.subarray(0, read);
    } finally {
      closeSync(fd);
    }
  } catch {
    return void 0;
  }
  return imageDimensions(header);
}
function scanDecorationDir(dir, options) {
  if (!existsSync(dir)) return [];
  let names = [];
  try {
    names = readdirSync(dir).filter((name2) => !name2.startsWith("."));
  } catch {
    return [];
  }
  names.sort();
  const entries = [];
  for (const name2 of names) {
    const entryDir = join3(dir, name2);
    const manifestFile = join3(entryDir, "decoration.json");
    if (!existsSync(manifestFile)) continue;
    if (guardedScannedJsonStat(manifestFile, options, "decoration descriptor") === void 0) continue;
    let raw;
    try {
      raw = JSON.parse(readFileSync2(manifestFile, "utf8"));
    } catch (error) {
      const message = "skipping " + manifestFile + ": " + (error instanceof Error ? error.message : String(error));
      options.warnings?.push(message);
      options.diagnostics?.push({ level: "error", source: entryDir, message });
      continue;
    }
    const verdict = parseDecorationManifest(raw, manifestFile);
    for (const diagnostic of verdict.diagnostics) {
      options.diagnostics?.push({ level: diagnostic.level, source: entryDir, message: diagnostic.message });
      options.warnings?.push(diagnostic.message);
    }
    if (!verdict.ok) continue;
    const manifest = verdict.manifest;
    if (!existsSync(join3(entryDir, manifest.entry))) {
      const message = "decoration " + manifest.id + ": strip file missing: " + manifest.entry;
      options.warnings?.push(message);
      options.diagnostics?.push({ level: "warning", source: entryDir, message });
    } else {
      const actual = readImageDimensions(join3(entryDir, manifest.entry));
      if (actual !== void 0) {
        const expectedWidth = manifest.cell.width * manifest.columns;
        if (actual.width !== expectedWidth || actual.height !== manifest.cell.height) {
          const message = "decoration " + manifest.id + ": strip " + actual.width + "x" + actual.height + " does not match cell " + manifest.cell.width + "x" + manifest.cell.height + " x " + manifest.columns + " columns (expected " + expectedWidth + "x" + manifest.cell.height + "); frames will render wrong";
          options.warnings?.push(message);
          options.diagnostics?.push({ level: "warning", source: entryDir, message });
        }
      }
    }
    entries.push({
      apiVersion: PET_DECORATION_API_VERSION,
      id: manifest.id,
      dir: entryDir,
      entryPath: manifest.entry,
      servable: ["decoration.json", manifest.entry],
      license: manifest.license,
      assetBase: DECORATION_ASSET_PREFIX + "/" + encodeURIComponent(manifest.id),
      entryUrl: DECORATION_ASSET_PREFIX + "/" + encodeURIComponent(manifest.id) + "/" + manifest.entry,
      cell: manifest.cell,
      columns: manifest.columns,
      durations: manifest.durations,
      loop: manifest.loop,
      phases: manifest.phases
    });
  }
  return entries;
}
function loadPetRegistry(options) {
  const { packageRoot, assetPrefix = "/pet" } = options;
  const warnings = [];
  const diagnostics = [];
  const byId = /* @__PURE__ */ new Map();
  const builtinIds = /* @__PURE__ */ new Set();
  for (const entry of scanPetDir(join3(packageRoot, "assets"), { assetPrefix, warnings, diagnostics, ...options.singlePet ? { names: ["whale-refined", "miku", "blue-whale-business"] } : {} })) {
    if (byId.has(entry.id)) {
      warnings.push("duplicate built-in pet id " + entry.id + "; the first one wins");
      continue;
    }
    byId.set(entry.id, entry);
    builtinIds.add(entry.id);
  }
  const petsDir = options.singlePet ? "" : options.petsDir ?? codexPetsDir();
  if (petsDir !== "") {
    for (const entry of scanPetDir(petsDir, { assetPrefix, warnings, diagnostics })) {
      if (byId.has(entry.id)) warnings.push("custom pet " + entry.id + " overrides the built-in one");
      byId.set(entry.id, entry);
    }
  }
  const dshPetsDir = options.dshPetsDir ?? join3(dshHome(), "pets");
  let globalVoice;
  if (dshPetsDir !== "") {
    for (const entry of options.singlePet ? [] : scanPetDir(dshPetsDir, { assetPrefix, warnings, diagnostics })) {
      if (byId.has(entry.id)) warnings.push("user pet " + entry.id + " overrides an earlier registration");
      byId.set(entry.id, entry);
    }
    globalVoice = loadVoicePackFile(join3(dshPetsDir, ".voice.json"), { warnings, diagnostics });
  }
  for (const manifest of options.singlePet ? [] : options.extra ?? []) {
    const raw = manifest.spritesheetPath;
    const dir = raw === void 0 || isAbsolute4(raw) ? join3(packageRoot, "assets", "extra") : dirname(resolve(packageRoot, raw));
    const source = raw === void 0 || isAbsolute4(raw) ? manifest : { ...manifest, spritesheetPath: basename(raw) };
    const entry = resolvePetManifest(source, dir, { assetPrefix, warnings });
    if (entry === void 0) continue;
    if (byId.has(entry.id)) warnings.push("composed pet " + entry.id + " overrides an earlier registration");
    byId.set(entry.id, entry);
  }
  const decorationById = /* @__PURE__ */ new Map();
  for (const entry of scanDecorationDir(join3(packageRoot, "assets", "decorations"), { warnings, diagnostics })) {
    decorationById.set(entry.id, entry);
  }
  if (dshPetsDir !== "") {
    for (const entry of scanDecorationDir(join3(dshPetsDir, "decorations"), { warnings, diagnostics })) {
      if (decorationById.has(entry.id)) {
        warnings.push("user decoration " + entry.id + " overrides the built-in one");
      }
      decorationById.set(entry.id, entry);
    }
  }
  const entries = [...byId.values()];
  const decorations = [...decorationById.values()];
  return {
    entries,
    warnings,
    diagnostics,
    byId: (id) => byId.get(id),
    defaultEntry: () => (options.singlePet ? entries.find((entry) => entry.id === "whale-girl-refined") : void 0) ?? entries.find((entry) => entry.id === DEFAULT_PET_ID && builtinIds.has(entry.id)) ?? entries.find((entry) => builtinIds.has(entry.id)) ?? entries[0],
    ...globalVoice === void 0 ? {} : { globalVoice },
    decorations,
    decorationById: (id) => decorationById.get(id)
  };
}
var DEFAULT_DECORATION_ID = "whale";
function decorationView(entry) {
  return {
    apiVersion: PET_DECORATION_API_VERSION,
    id: entry.id,
    assetBase: entry.assetBase,
    entryUrl: entry.entryUrl,
    cell: entry.cell,
    columns: entry.columns,
    durations: entry.durations,
    loop: entry.loop,
    phases: entry.phases
  };
}
function petEntryView(entry, globalVoice) {
  const panel = globalVoice === void 0 ? entry.voice?.panel : mergeVoicePacks(globalVoice, entry.voice)?.panel;
  return {
    id: entry.id,
    displayName: entry.displayName,
    description: entry.description,
    renderer: entry.renderer,
    ...entry.frameDensity === void 0 ? {} : { frameDensity: entry.frameDensity },
    ...entry.live2d === void 0 ? {} : { live2d: entry.live2d },
    ...entry.frames2d === void 0 ? {} : { frames2d: entry.frames2d },
    ...entry.gameplay === void 0 ? {} : { gameplay: entry.gameplay },
    cell: entry.cell,
    columns: entry.columns,
    rows: entry.rows,
    atlasRows: entry.atlasRows,
    tracks: entry.tracks,
    ...entry.sequences === void 0 ? {} : { sequences: entry.sequences },
    atlasUrl: entry.atlasUrl,
    manifestUrl: entry.manifestUrl,
    ...panel === void 0 ? {} : { panel }
  };
}

// src/state.ts
var defaultPetStateConfig = { celebrateMs: 2400, failureMs: 2400 };
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
var PetStateMachine = class {
  constructor(config = defaultPetStateConfig, now = Date.now) {
    this.now = now;
    this.config = { ...defaultPetStateConfig, ...config };
  }
  phase = "idle";
  line;
  phrase;
  toolKind;
  motion = {};
  sessionActive = false;
  doneAt;
  failedAt;
  config;
  /** Consume one projected activity update. */
  onActivityStatus(input) {
    this.phase = input.phase;
    this.line = input.line;
    this.phrase = input.phrase;
    this.toolKind = input.phase === "tool" || input.phase === "thinking" ? input.toolKind : void 0;
    this.motion = { generation: input.generation, toolCategory: input.toolCategory, waveKey: input.waveKey };
    this.doneAt = input.phase === "done" ? this.now() : void 0;
    this.failedAt = input.phase === "failed" ? this.now() : void 0;
  }
  /** A session became the active one (or a fresh session started). */
  onSessionActive() {
    this.sessionActive = true;
  }
  /** The active session was disposed (or none left). */
  onSessionDisposed() {
    this.sessionActive = false;
    this.phase = "idle";
    this.line = void 0;
    this.phrase = void 0;
    this.toolKind = void 0;
    this.motion = {};
    this.doneAt = void 0;
    this.failedAt = void 0;
  }
  /** Render the current animation decision. */
  render() {
    const nowMs = this.now();
    let animation = animationForPhase(this.phase);
    const doneSettled = this.phase === "done" && this.doneAt !== void 0 && nowMs - this.doneAt >= this.config.celebrateMs;
    const failedSettled = this.phase === "failed" && this.failedAt !== void 0 && nowMs - this.failedAt >= this.config.failureMs;
    if (doneSettled || failedSettled) animation = "idle";
    const settled = this.phase === "idle" || doneSettled || failedSettled;
    const bubble = settled ? void 0 : this.phrase ?? this.line;
    return {
      ...this.motion,
      animation,
      ...this.toolKind === void 0 ? {} : { toolKind: this.toolKind },
      ...bubble === void 0 ? {} : { bubble },
      animationStartedAt: nowMs,
      phase: this.phase,
      sessionActive: this.sessionActive
    };
  }
};

// src/service.ts
var GAMEPLAY_TREATS_CURRENCY = "treats";
var PET_SETTINGS_NAMESPACE = "pet";
var MAX_SESSION_BUBBLES = 12;
var PetService = class extends Service {
  static inject = [];
  machine;
  stateConfig;
  ledger;
  registry;
  persistDir;
  enabled;
  /** Status-decoration master switch (M5, #567); mirrored from settings. */
  decorationEnabled;
  /** The freshest plugin-authored announcement (dsh-usage linkage). */
  announcement;
  disposeActivity;
  /** Session whose most recent meaningful event currently drives the global pet. */
  displaySession;
  /**
   * Effective voice-pack overrides for the currently selected pet (M4,
   * #677). Cached per pet id; the registry is an immutable snapshot, so the
   * global pack and each entry's pack cannot change behind the cache.
   */
  voiceCache;
  /**
   * Per-session activity, most recent last (Map insertion order). Settled
   * records are pruned above 128; live conversations are never evicted by
   * the legacy bubble-stack cap. Disposed sessions are removed immediately.
   */
  sessionActivity = /* @__PURE__ */ new Map();
  activityRevision = 0;
  /**
   * Sessions whose reward source is the official event stream. This metadata
   * outlives transient visual resets so a derived legacy `done` cannot reward
   * the same turn again after the pet is disabled and re-enabled.
   */
  officialEventSessions = /* @__PURE__ */ new WeakSet();
  /**
   * Resolve the settings namespace this plugin's own config is served as, when
   * the caller can read it off the composition. A plugin's settings ARE its own
   * config, so the namespace is the row's id — and an aggregate bundle renames
   * child rows (`pet` becomes `web-ui-pet`), which is why it cannot be assumed
   * to be {@link PET_SETTINGS_NAMESPACE}. `apply` sets this; absent means the
   * plugin runs outside a Loader and the package's own id stands.
   */
  settingsNamespaceProvider = void 0;
  constructor(ctx, config = {}) {
    super(ctx, "pet");
    this.persistDir = config.persistDir ?? petHomeDir();
    this.registry = config.registry ?? loadPetRegistry({
      packageRoot: petPackageRoot(import.meta.url),
      ...config.pets === void 0 ? {} : { extra: config.pets }
    });
    if (this.registry.entries.length === 0) {
      throw new Error("[dsh-pet] no valid pet manifests found; nothing to render");
    }
    let persist = loadPetPersist(this.persistDir);
    if (this.registry.byId(persist.petId) === void 0) {
      persist = { ...persist, petId: this.registry.defaultEntry().id };
    }
    const selected = this.registry.byId(persist.petId) ?? this.registry.defaultEntry();
    const voiceRemarks = mergeVoicePacks(this.registry.globalVoice, selected.voice)?.remarks;
    const ledgerConfig = {
      affinity: config.affinity,
      treats: config.treats,
      remarks: selected.remarks,
      voiceRemarks
    };
    this.ledger = new PetLedger(persist, ledgerConfig);
    this.stateConfig = { ...defaultPetStateConfig, ...config.state ?? {} };
    this.machine = new PetStateMachine(this.stateConfig);
    this.enabled = config.enabled ?? true;
    this.decorationEnabled = config.decorationEnabled ?? true;
    this.syncActivity();
  }
  /**
   * The draw-time voice-pool provider handed to every projection runtime.
   * It re-resolves when the selected pet changes, so live engines re-voice
   * on the next draw without being rebuilt (M4, #677).
   */
  voicePools() {
    return () => {
      const entry = this.activeEntry();
      if (this.voiceCache !== void 0 && this.voiceCache.petId === entry.id) {
        return this.voiceCache.overrides;
      }
      const overrides = mergeVoicePacks(this.registry.globalVoice, entry.voice)?.overrides ?? {};
      this.voiceCache = { petId: entry.id, overrides };
      return overrides;
    };
  }
  /** Whether the pet service consumes session activity while enabled. */
  isEnabled() {
    return this.enabled;
  }
  /** RPC: current pet state snapshot. */
  async state(currentSessionId) {
    return this.view(currentSessionId);
  }
  /** A foreground conversation was viewed; polling alone never acknowledges it. */
  async markSessionViewed(sessionId, revision) {
    if (typeof sessionId !== "string" || !sessionId || sessionId.length > 200 || !Number.isSafeInteger(revision) || revision < 1) throw new Error("invalid-viewed-session");
    for (const [session, activity] of this.sessionActivity) {
      if (String(session.id) === sessionId && this.awaitingView(activity) === revision) {
        activity.retainUntilViewed = false;
      }
    }
    return { ok: true };
  }
  awaitingView(activity) {
    return activity?.retainUntilViewed && ["idle", "done", "failed"].includes(activity.lastInput?.phase ?? "") ? activity.revision : void 0;
  }
  /**
   * RPC: one plugin-authored announcement bubble (dsh-usage linkage). The
   * payload is validated into a bounded PetAnnouncement; a malformed one is
   * dropped silently — a sibling plugin's bug must never surface as pet
   * breakage. The announcement is in-memory only.
   */
  announce(input) {
    const parsed = parseAnnouncement(input, Date.now());
    if (parsed === void 0) return { ok: false };
    this.announcement = parsed;
    return { ok: true };
  }
  /** Current persisted display config (read-only view). */
  display() {
    return { ...this.ledger.snapshot.display };
  }
  /** RPC: the registry entries the browser half renders and selects from. */
  async pets() {
    return this.registry.entries.map((entry) => petEntryView(entry, this.registry.globalVoice));
  }
  /** The loaded registry (the asset routes serve its entries). */
  registrySnapshot() {
    return this.registry;
  }
  /** RPC: structured registry diagnostics (pet-center M2, issue #623). */
  async diagnostics() {
    return { diagnostics: this.registry.diagnostics };
  }
  /**
   * The active status decoration view (M5, #567): the default 'whale' entry
   * (user directories override built-ins by id), gated by the master switch.
   */
  activeDecoration() {
    if (!this.decorationEnabled) return void 0;
    const entry = this.registry.decorationById?.(DEFAULT_DECORATION_ID);
    return entry === void 0 ? void 0 : decorationView(entry);
  }
  /** The selected pet's registry entry. */
  activeEntry() {
    return this.registry.byId(this.selectedPetId()) ?? this.registry.defaultEntry();
  }
  /** Currently selected pet id (persisted). */
  selectedPetId() {
    return this.ledger.snapshot.petId;
  }
  /** The display name of one pet (user rename or manifest displayName). */
  petName(petId = this.selectedPetId()) {
    const stored = this.ledger.snapshot.names[petId];
    if (stored !== void 0 && stored.trim() !== "") return stored;
    return this.registry.byId(petId)?.displayName ?? DEFAULT_PET_NAME;
  }
  /** RPC: switch the selected pet (persisted, settings document mirrored). */
  async setPetId(petId) {
    const entry = this.registry.byId(petId);
    if (entry === void 0) return { ok: false, error: "unknown-pet" };
    this.ledger.setPetId(entry.id);
    const voiceRemarks = mergeVoicePacks(this.registry.globalVoice, entry.voice)?.remarks;
    this.ledger.setRemarks(entry.remarks, voiceRemarks);
    this.flush();
    this.syncSettingsFromPet();
    return { ok: true, petId: entry.id };
  }
  /** Start or stop the session-activity listeners that drive the pet. */
  setEnabled(enabled) {
    this.enabled = enabled;
    this.syncActivity();
    if (!enabled) this.resetActivity();
  }
  syncActivity() {
    if (this.disposeActivity !== void 0) {
      this.disposeActivity();
      this.disposeActivity = void 0;
    }
    if (!this.enabled) return;
    this.disposeActivity = (() => {
      const disposers = [
        this.ctx.on("session/event", (session, event) => {
          const runtime = this.activityOf(session).runtime;
          if (event.type === "activity/status") {
            if (runtime.stream?.input !== void 0) return;
            const payload = event.data ?? {};
            if (typeof payload.phase !== "string" || !isActivityPhase(payload.phase)) return;
            this.applyActivity(session, {
              phase: payload.phase,
              ...typeof payload.line === "string" ? { line: payload.line } : {},
              ...typeof payload.phrase === "string" ? { phrase: payload.phrase } : {}
            });
            if (payload.phase === "done" && !runtime.officialEventsSeen) {
              this.rewardLegacyTurn();
            }
            return;
          }
          if (event.type === "request/context") this.assignSessionColor(session);
          const transition = projectOfficialEvent(event, runtime);
          if (transition === void 0) return;
          runtime.officialEventsSeen = true;
          this.officialEventSessions.add(session);
          this.applyActivity(session, transition.input, transition.whisper);
          if (transition.completedTurn !== void 0) {
            this.rewardTurn(String(session.id), transition.completedTurn);
          }
        }),
        this.ctx.on("agent/assistant-stream", ({ agent, frame }) => {
          const session = agent.session;
          const runtime = this.activityOf(session).runtime;
          const transition = projectAssistantStreamFrame(frame, runtime);
          if (transition === void 0) return;
          runtime.officialEventsSeen = true;
          this.officialEventSessions.add(session);
          this.applyActivity(session, transition.input, transition.whisper);
        }),
        this.ctx.on("session/disposed", (session) => {
          this.ledger.forgetSession(String(session.id));
          this.officialEventSessions.delete(session);
          this.sessionActivity.delete(session);
          if (session !== this.displaySession) return;
          this.displaySession = void 0;
          const remaining = [...this.sessionActivity.entries()].at(-1);
          if (remaining !== void 0) {
            const [nextSession, activity] = remaining;
            this.displaySession = nextSession;
            if (activity.lastInput !== void 0) this.machine.onActivityStatus(activity.lastInput);
            this.machine.onSessionActive();
          } else {
            this.machine.onSessionDisposed();
          }
        })
      ];
      return () => {
        for (const dispose of disposers) dispose();
      };
    })();
  }
  /** Drop transient activity because terminal events missed while disabled cannot be replayed safely. */
  resetActivity() {
    this.displaySession = void 0;
    this.sessionActivity.clear();
    this.machine.onSessionDisposed();
  }
  /** Return the per-session activity record, creating it on first sight. */
  activityOf(session) {
    let activity = this.sessionActivity.get(session);
    if (activity === void 0) {
      const runtime = emptyProjectionRuntime(this.voicePools());
      runtime.officialEventsSeen = this.officialEventSessions.has(session);
      activity = {
        runtime,
        machine: new PetStateMachine(this.stateConfig),
        revision: 0
      };
      this.sessionActivity.set(session, activity);
    }
    return activity;
  }
  /**
   * Commit one activity: the session's own machine renders its bubble, and
   * the session becomes the host-global display session (most recent
   * meaningful event wins the sprite animation).
   */
  applyActivity(session, input, whisper) {
    const activity = this.activityOf(session);
    this.assignSessionColor(session);
    activity.revision = ++this.activityRevision;
    if (!["idle", "done", "failed"].includes(input.phase)) activity.retainUntilViewed = true;
    activity.lastInput = input;
    if (whisper !== void 0) activity.whisper = { text: whisper, at: Date.now() };
    activity.machine.onActivityStatus(input);
    activity.machine.onSessionActive();
    this.sessionActivity.delete(session);
    this.sessionActivity.set(session, activity);
    if (this.sessionActivity.size > 128) {
      for (const [candidate, record] of this.sessionActivity) {
        if (candidate !== session && !record.retainUntilViewed && record.machine.render().animation === "idle") this.sessionActivity.delete(candidate);
        if (this.sessionActivity.size <= 128) break;
      }
    }
    this.displaySession = session;
    this.machine.onActivityStatus(input);
    this.machine.onSessionActive();
  }
  /** RPC: pet or feed the pet. */
  async interact(kind) {
    const nowMs = Date.now();
    const result = this.ledger.interact(kind, nowMs);
    if (this.ledger.takeDirty()) this.flush();
    return result;
  }
  /* ---------------------------------------------------------------- *
   * Gameplay verbs (miku-pet generalization). The manifest block lives
   * on the registry entry; dynamic state persists per pet id. Verbs
   * settle and persist; the state view projects without writing.
   * ---------------------------------------------------------------- */
  /** The active pet's gameplay block, if it declares one. */
  gameplayDef() {
    return this.activeEntry().gameplay;
  }
  /** The persisted (or fresh) gameplay state of the selected pet. */
  gameplayState(def, now) {
    const petId = this.selectedPetId();
    const stored = this.ledger.snapshot.gameplay[petId];
    return {
      petId,
      state: stored === void 0 ? initialGameplayState(def, now) : { ...stored, stats: { ...stored.stats }, currencies: { ...stored.currencies } }
    };
  }
  /** Display view of one gameplay state (rounded stats; treats ride the shared treat ledger). */
  gameplayViewOf(state) {
    const stats = {};
    for (const [name2, value] of Object.entries(state.stats)) stats[name2] = Math.round(value);
    const def = this.gameplayDef();
    const mode = state.mode !== null && def !== void 0 && !isDeclaredMode(def, state.mode) ? null : state.mode;
    return { stats, mode };
  }
  /**
   * Move gameplay 'treats' currency (the unified post-wallet currency) from
   * the engine's settle work area into the shared treat ledger, capped by
   * the stock cap. The engine keeps its generic currency record for settle
   * math; this drain is the only bridge to the wallet-free economy.
   */
  drainGameplayTreats(state) {
    const pending = Math.floor(state.currencies[GAMEPLAY_TREATS_CURRENCY] ?? 0);
    delete state.currencies[GAMEPLAY_TREATS_CURRENCY];
    if (pending > 0) this.ledger.grantTreats(pending);
  }
  /** Persist the mutated gameplay state of one verb call. */
  commitGameplay(petId, state) {
    this.ledger.setGameplay(petId, state);
    if (this.ledger.takeDirty()) this.flush();
  }
  /**
   * RPC: a touch on the pet. 'zone' names a touch zone (roll a branch);
   * omitted means a plain click while a touch animation holds (clickBoost).
   */
  async gameplayTouch(zone) {
    const def = this.gameplayDef();
    if (def === void 0) return { ok: false, error: "no-gameplay" };
    const now = Date.now();
    const { petId, state } = this.gameplayState(def, now);
    settleGameplay(state, def, now, { sessionActive: this.machine.render().sessionActive });
    if (zone === void 0) {
      const boost = def.touch?.clickBoost;
      if (boost === void 0) return { ok: false, error: "no-touch" };
      const amount = boost.min + Math.floor(Math.random() * (boost.max - boost.min + 1));
      if (amount > 0) applyGameplayEffects(state, def, [{ stat: boost.stat, amount }]);
      this.drainGameplayTreats(state);
      this.commitGameplay(petId, state);
      return { ok: true, hit: false, view: this.gameplayViewOf(state) };
    }
    const target = def.touch?.zones.find((entry) => entry.name === zone);
    if (target === void 0) return { ok: false, error: "unknown-zone" };
    const branch = rollTouchBranch(target, Math.random);
    if (branch === void 0) {
      this.drainGameplayTreats(state);
      this.commitGameplay(petId, state);
      return { ok: true, hit: false, view: this.gameplayViewOf(state) };
    }
    if (branch.effects !== void 0) applyGameplayEffects(state, def, branch.effects);
    const phrase = branch.phrases !== void 0 && branch.phrases.length > 0 ? branch.phrases[Math.floor(Math.random() * branch.phrases.length)] : void 0;
    this.drainGameplayTreats(state);
    this.commitGameplay(petId, state);
    return {
      ok: true,
      hit: true,
      ...branch.state === void 0 ? {} : { state: branch.state },
      ...branch.stateMs === void 0 ? {} : { stateMs: branch.stateMs },
      ...phrase === void 0 ? {} : { phrase },
      view: this.gameplayViewOf(state)
    };
  }
  /**
   * RPC: enter or leave a gameplay mode (null clears it). Every mode the
   * manifest declares is accepted: 'work', 'sleep', or one of the extra
   * 'modes' entries (a bath, a play session…).
   */
  async gameplaySetMode(mode) {
    const def = this.gameplayDef();
    if (def === void 0) return { ok: false, error: "no-gameplay" };
    if (mode === "work" && def.work === void 0) return { ok: false, error: "no-work" };
    if (mode === "sleep" && def.sleep === void 0) return { ok: false, error: "no-sleep" };
    if (mode !== null && !isDeclaredMode(def, mode)) return { ok: false, error: "unknown-mode" };
    const now = Date.now();
    const { petId, state } = this.gameplayState(def, now);
    settleGameplay(state, def, now, { sessionActive: this.machine.render().sessionActive });
    if (state.mode !== mode) state.restoreCarryMs = 0;
    state.mode = mode;
    this.drainGameplayTreats(state);
    this.commitGameplay(petId, state);
    return { ok: true, view: this.gameplayViewOf(state) };
  }
  /** RPC: one work-round adjudication (only while the work mode holds). */
  async gameplayWorkTick() {
    const def = this.gameplayDef();
    if (def?.work === void 0) return { ok: false, error: "no-work" };
    const now = Date.now();
    const { petId, state } = this.gameplayState(def, now);
    if (state.mode !== "work") return { ok: false, error: "not-working" };
    settleGameplay(state, def, now, { sessionActive: this.machine.render().sessionActive });
    const outcome = rollWorkOutcome(def.work, Math.random);
    const effects = outcome === "success" ? def.work.success?.effects : def.work.fail?.effects;
    if (effects !== void 0) applyGameplayEffects(state, def, effects);
    this.drainGameplayTreats(state);
    this.commitGameplay(petId, state);
    return { ok: true, outcome, view: this.gameplayViewOf(state) };
  }
  /** RPC: buy one shop item (effects, currency swap, or a lottery draw). */
  async gameplayBuy(itemId) {
    const def = this.gameplayDef();
    if (def === void 0) return { ok: false, error: "no-gameplay" };
    const item = def.shop?.items.find((entry) => entry.id === itemId);
    if (item === void 0) return { ok: false, error: "unknown-item" };
    const now = Date.now();
    const { petId, state } = this.gameplayState(def, now);
    settleGameplay(state, def, now, { sessionActive: this.machine.render().sessionActive });
    const treats = item.currency === GAMEPLAY_TREATS_CURRENCY;
    const balance = treats ? this.ledger.snapshot.treats.treats : state.currencies[item.currency] ?? 0;
    if (balance < item.price) {
      return { ok: false, error: "insufficient-funds", view: this.gameplayViewOf(state) };
    }
    if (treats) this.ledger.spendTreats(item.price);
    else state.currencies[item.currency] = balance - item.price;
    if (item.effects !== void 0) applyGameplayEffects(state, def, item.effects);
    let prize;
    if (item.lottery !== void 0) {
      if (item.lottery.effects !== void 0) applyGameplayEffects(state, def, item.lottery.effects);
      const tier = drawLotteryTier(item.lottery, Math.random);
      const prizeCurrency = tier.currency ?? item.lottery.currency ?? item.currency;
      if (prizeCurrency === GAMEPLAY_TREATS_CURRENCY) this.ledger.grantTreats(tier.prize);
      else state.currencies[prizeCurrency] = (state.currencies[prizeCurrency] ?? 0) + tier.prize;
      prize = { amount: tier.prize, currency: prizeCurrency };
    }
    this.drainGameplayTreats(state);
    this.commitGameplay(petId, state);
    return { ok: true, ...prize === void 0 ? {} : { prize }, view: this.gameplayViewOf(state) };
  }
  /** RPC: show or hide the pet. */
  async setVisible(visible) {
    this.ledger.setDisplay({ ...this.ledger.snapshot.display, visible });
    this.flush();
    this.syncSettingsFromPet();
    return { ok: true, display: this.ledger.snapshot.display };
  }
  /**
   * The persisted skin for one entry, when the manifest still declares it: a
   * stale id (skin removed from the manifest, pet swapped) reads as "default"
   * rather than pinning a track the browser half cannot resolve.
   */
  persistedSkin(entry) {
    const stored = this.ledger.petSkin(entry.id);
    if (stored === void 0) return void 0;
    return entry.frames2d?.skins?.some((skin) => skin.id === stored) === true ? stored : void 0;
  }
  /**
   * RPC: select the current pet's frames2d skin (`undefined` restores the
   * pet's default look). The choice is stored per pet, so every later state
   * view (reload, client restart, pet re-selection) serves it back.
   */
  async setSkin(skin) {
    const entry = this.activeEntry();
    const declared = entry.frames2d?.skins ?? [];
    if (skin === void 0) {
      this.ledger.setPetSkin(entry.id, void 0);
      this.flush();
      return { ok: true };
    }
    if (!declared.some((candidate) => candidate.id === skin)) return { ok: false, error: "unknown-skin" };
    this.ledger.setPetSkin(entry.id, skin);
    this.flush();
    return { ok: true, skin };
  }
  /** RPC: update display config (size / position / bubble scale). Pixel values are clamped to whole pixels. */
  async setConfig(patch, expectedPetId) {
    if (expectedPetId !== void 0 && expectedPetId !== this.selectedPetId()) throw new Error("pet-changed-reopen-settings");
    for (const [key, value] of Object.entries(patch)) {
      if (["size", "right", "bottom", "bubbleScale", "animationFps", "animationRunFpsLimit", "animationActionFps", "animationTickSlope", "animationTickIntercept"].includes(key) && (typeof value !== "number" || !Number.isFinite(value))) throw new Error("invalid-" + key);
      if (["animationRunFpsLimit", "animationActionFps"].includes(key) && value !== 0 && value < 1) throw new Error("invalid-" + key);
      if (key === "animationTickSlope" && (value < MIN_TICK_SLOPE || value > MAX_TICK_SLOPE)) throw new Error("invalid-animationTickSlope");
      if (key === "animationTickIntercept" && (value < MIN_TICK_INTERCEPT || value > MAX_TICK_INTERCEPT)) throw new Error("invalid-animationTickIntercept");
      if (["visible", "desktopEnabled", "multiPetEnabled", "bubbleOnly", "hoverPanelEnabled"].includes(key) && typeof value !== "boolean") throw new Error("invalid-" + key);
      if (key === "animationMode" && !["fixed", "native", "tick"].includes(value)) throw new Error("invalid-animationMode");
    }
    const next = { ...this.ledger.snapshot.display, ...patch };
    next.animationRunFpsLimit = optionalFps(next.animationRunFpsLimit);
    next.animationActionFps = optionalFps(next.animationActionFps);
    next.animationFps = animationFps(next.animationFps);
    next.animationMode = animationMode(next.animationMode);
    next.animationTickSlope = tickSlope(next.animationTickSlope);
    next.animationTickIntercept = tickIntercept(next.animationTickIntercept);
    next.size = Math.round(Math.min(DISPLAY_SIZE_MAX, Math.max(DISPLAY_SIZE_MIN, next.size)));
    next.right = Math.round(Math.min(DISPLAY_INSET_MAX, Math.max(0, next.right)));
    next.bottom = Math.round(Math.min(DISPLAY_INSET_MAX, Math.max(0, next.bottom)));
    next.bubbleScale = Math.min(BUBBLE_SCALE_MAX, Math.max(BUBBLE_SCALE_MIN, next.bubbleScale));
    this.ledger.setDisplay(next);
    this.flush();
    this.syncSettingsFromPet();
    return { ok: true, display: this.ledger.snapshot.display };
  }
  /** RPC: rename the selected pet (trimmed, 1–20 chars, per-pet storage). */
  async setName(name2) {
    const trimmed = name2.trim();
    if (trimmed === "") return { ok: false, error: "name-empty" };
    if (trimmed.length > PET_NAME_MAX_LENGTH) return { ok: false, error: "name-too-long" };
    this.ledger.setPetName(this.selectedPetId(), trimmed);
    this.flush();
    return { ok: true, name: trimmed };
  }
  /**
   * Apply a committed settings section to the persisted selection and display
   * config. Called by the settings surface on every change; values are
   * clamped exactly like the setConfig RPC so both write paths converge.
   * @param section - the resolved settings section.
   */
  applySettingsSection(section) {
    this.decorationEnabled = section.decorationEnabled ?? true;
    const selected = typeof section.petId === "string" ? this.registry.byId(section.petId) : void 0;
    const selectionChanged = selected !== void 0 && selected.id !== this.selectedPetId();
    if (selected !== void 0) {
      this.ledger.setPetId(selected.id);
      this.ledger.setRemarks(selected.remarks);
    } else if (section.petId !== void 0) {
      this.syncSettingsFromPet();
    }
    const next = { ...this.ledger.snapshot.display };
    if (!selectionChanged) {
      next.animationRunFpsLimit = optionalFps(section.animationRunFpsLimit ?? next.animationRunFpsLimit);
      next.animationActionFps = optionalFps(section.animationActionFps ?? next.animationActionFps);
      next.animationFps = animationFps(section.animationFps ?? next.animationFps);
      next.animationMode = animationMode(section.animationMode ?? next.animationMode);
      next.animationTickSlope = tickSlope(section.animationTickSlope ?? next.animationTickSlope);
      next.animationTickIntercept = tickIntercept(section.animationTickIntercept ?? next.animationTickIntercept);
    }
    next.desktopEnabled = section.desktopEnabled ?? next.desktopEnabled ?? true;
    next.multiPetEnabled = section.multiPetEnabled ?? next.multiPetEnabled ?? false;
    next.bubbleOnly = section.bubbleOnly ?? next.bubbleOnly ?? false;
    next.hoverPanelEnabled = section.hoverPanelEnabled ?? next.hoverPanelEnabled ?? false;
    next.visible = section.visible;
    next.size = Math.round(Math.min(DISPLAY_SIZE_MAX, Math.max(DISPLAY_SIZE_MIN, section.size)));
    next.right = Math.round(Math.min(DISPLAY_INSET_MAX, Math.max(0, section.right)));
    next.bottom = Math.round(Math.min(DISPLAY_INSET_MAX, Math.max(0, section.bottom)));
    next.bubbleScale = Math.min(BUBBLE_SCALE_MAX, Math.max(BUBBLE_SCALE_MIN, section.bubbleScale ?? next.bubbleScale));
    this.ledger.setDisplay(next);
    this.flush();
    if (selectionChanged) this.syncSettingsFromPet();
  }
  /** Mirror the persisted display config into the settings document (best-effort). */
  syncSettingsFromPet() {
    const settings = this.ctx.get("settings", false);
    if (settings === void 0) return;
    const ns = this.settingsNamespaceProvider?.() ?? PET_SETTINGS_NAMESPACE;
    const snapshot = this.ledger.snapshot;
    void settings.update(ns, {
      visible: snapshot.display.visible,
      size: snapshot.display.size,
      right: snapshot.display.right,
      bottom: snapshot.display.bottom,
      bubbleScale: snapshot.display.bubbleScale,
      animationFps: snapshot.display.animationFps,
      animationRunFpsLimit: snapshot.display.animationRunFpsLimit,
      animationActionFps: snapshot.display.animationActionFps,
      animationMode: snapshot.display.animationMode,
      animationTickSlope: snapshot.display.animationTickSlope,
      animationTickIntercept: snapshot.display.animationTickIntercept,
      desktopEnabled: snapshot.display.desktopEnabled,
      multiPetEnabled: snapshot.display.multiPetEnabled,
      bubbleOnly: snapshot.display.bubbleOnly,
      hoverPanelEnabled: snapshot.display.hoverPanelEnabled,
      petId: snapshot.petId
    }).catch(() => {
    });
  }
  /** Award the turn reward once per completed turn (idempotent per session + turn). */
  rewardTurn(sessionId, turn) {
    if (this.ledger.rewardTurn(sessionId, turn, Date.now())) this.flush();
  }
  /** Preserve turn rewards for installations that only emit legacy activity. */
  rewardLegacyTurn() {
    if (this.ledger.rewardLegacyTurn(Date.now())) this.flush();
  }
  view(currentSessionId) {
    const selected = currentSessionId === void 0 ? this.displaySession : [...this.sessionActivity.keys()].find((s) => String(s.id) === currentSessionId);
    const snapshot = currentSessionId === void 0 ? this.machine.render() : (selected && this.sessionActivity.get(selected)?.machine.render()) ?? new PetStateMachine(this.stateConfig).render();
    const entry = this.activeEntry();
    const companions = [];
    if (this.ledger.snapshot.display.multiPetEnabled) {
      for (const [session, activity] of this.sessionActivity) {
        const id = String(session.id);
        if (session.header?.origin === "subagent" && id !== currentSessionId) continue;
        const state = activity.machine.render();
        if (state.animation === "idle" && !activity.retainUntilViewed) continue;
        const whisper = (entry.id !== "whale-girl-refined" || state.phase !== "failed" && state.phase !== "waiting" && state.toolCategory !== "ask") && activity.whisper && Date.now() - activity.whisper.at < WHISPER_TTL_MS ? activity.whisper.text : void 0;
        companions.push({
          sessionId: id,
          primary: id === currentSessionId,
          generation: state.generation,
          waveKey: state.waveKey,
          toolCategory: state.toolCategory,
          awaitingView: this.awaitingView(activity),
          animation: boundAnimation(entry.id, state),
          phase: state.phase,
          sessionActive: true,
          bubble: state.bubble,
          whisper,
          performance: this.footerPerformance(id),
          color: this.sessionColor(id)
        });
      }
      if (!companions.some((c) => c.primary)) companions.unshift({
        sessionId: currentSessionId ?? "",
        primary: true,
        animation: boundAnimation(entry.id, snapshot),
        phase: snapshot.phase,
        generation: snapshot.generation,
        waveKey: snapshot.waveKey,
        toolCategory: snapshot.toolCategory,
        bubble: snapshot.bubble,
        performance: this.footerPerformance(currentSessionId),
        sessionActive: snapshot.sessionActive,
        color: this.sessionColor(currentSessionId ?? "")
      });
    }
    const sessions = [];
    for (const [session, activity] of [...this.sessionActivity.entries()].reverse()) {
      if (currentSessionId !== void 0 && String(session.id) !== currentSessionId) continue;
      if (sessions.length >= MAX_SESSION_BUBBLES) break;
      if (session.header?.origin === "subagent" && String(session.id) !== currentSessionId) continue;
      const perSession = activity.machine.render();
      if (perSession.bubble === void 0) continue;
      const whisper = activity.whisper;
      const freshWhisper = (entry.id !== "whale-girl-refined" || perSession.phase !== "failed" && perSession.phase !== "waiting" && perSession.toolCategory !== "ask") && whisper !== void 0 && Date.now() - whisper.at < WHISPER_TTL_MS ? whisper.text : void 0;
      sessions.push({
        sessionId: String(session.id),
        animation: boundAnimation(entry.id, perSession),
        bubble: perSession.bubble,
        phase: perSession.phase,
        ...freshWhisper === void 0 ? {} : { whisper: freshWhisper }
      });
    }
    if (currentSessionId !== void 0) {
      const index = sessions.findIndex((session) => session.sessionId === currentSessionId);
      if (index > 0) sessions.unshift(sessions.splice(index, 1)[0]);
    }
    const decoration = this.activeDecoration();
    const gameplayDef = this.gameplayDef();
    let gameplay;
    if (gameplayDef !== void 0) {
      const { state } = this.gameplayState(gameplayDef, Date.now());
      settleGameplay(state, gameplayDef, Date.now(), { sessionActive: snapshot.sessionActive });
      gameplay = this.gameplayViewOf(state);
    }
    const announcement = this.announcement !== void 0 && announcementFresh(this.announcement, Date.now()) ? this.announcement : void 0;
    const skin = this.persistedSkin(entry);
    return {
      animation: boundAnimation(entry.id, snapshot),
      generation: snapshot.generation,
      waveKey: snapshot.waveKey,
      toolCategory: snapshot.toolCategory,
      ...snapshot.bubble === void 0 ? {} : { bubble: snapshot.bubble },
      phase: snapshot.phase,
      sessionActive: snapshot.sessionActive,
      sessions: currentSessionId === void 0 ? sessions : sessions.filter((s) => s.sessionId === currentSessionId),
      currentSessionId,
      awaitingView: selected ? this.awaitingView(this.sessionActivity.get(selected)) : void 0,
      companions,
      color: { palette: "ds" },
      ...decoration === void 0 ? {} : { decoration },
      ...announcement === void 0 ? {} : { announcement },
      affinity: this.ledger.affinityView(Date.now()),
      performance: this.footerPerformance(currentSessionId),
      display: { ...this.ledger.snapshot.display, visible: this.isEnabled() && this.ledger.snapshot.display.visible },
      pet: {
        id: entry.id,
        displayName: entry.displayName,
        description: entry.description
      },
      name: this.petName(),
      ...skin === void 0 ? {} : { skin },
      treats: {
        stocked: this.ledger.snapshot.treats.treats,
        max: this.ledger.treatMax
      },
      ...gameplay === void 0 ? {} : { gameplay }
    };
  }
  /** Reads the SAME durable projection as the footer. Never estimates tokens. */
  footerPerformance(currentSessionId) {
    try {
      const sessions = this.ctx.get("sessions", false);
      const session = currentSessionId === void 0 ? this.displaySession : [...this.sessionActivity.keys()].find((s) => String(s.id) === currentSessionId) ?? sessions?.get(currentSessionId);
      if (session === void 0) return void 0;
      const projections = this.ctx.get("sessionProjections", false);
      const rate = footerTokensPerSecond(projections?.stateOf(session, "sessionStats"));
      return rate === void 0 ? void 0 : { tokensPerSecond: rate, source: "sessionStats", sessionId: String(session.id) };
    } catch {
      return void 0;
    }
  }
  sessionColor(id) {
    const colors = this.ledger.snapshot.sessionColors;
    return colors && Object.hasOwn(colors, id) ? colors[id] : { palette: "ds" };
  }
  assignSessionColor(session) {
    if (session.header?.origin === "subagent") return;
    const id = String(session.id);
    if (!id || id.length > 200 || Object.hasOwn(this.ledger.snapshot.sessionColors ?? {}, id)) return;
    let config;
    try {
      config = session.requestContext?.() ?? session.requestHeader?.()?.config;
    } catch {
    }
    if (!config || typeof config.model !== "string" || !config.model) return;
    const occupied = [...this.sessionActivity.entries()].filter(([s, a]) => s !== session && s.header?.origin !== "subagent" && (a.retainUntilViewed || a.machine.render().animation !== "idle")).map(([s]) => this.sessionColor(String(s.id)));
    this.ledger.setSessionColor(id, chooseSessionColor(modelPalette(config.model, config.provider) ?? "ds", occupied));
    this.ledger.takeDirty();
    this.flush();
  }
  flush() {
    try {
      savePetPersist(this.ledger.snapshot, this.persistDir);
    } catch {
    }
  }
};

// src/routes.ts
import { existsSync as existsSync2, realpathSync, statSync as statSync2 } from "node:fs";
import { readFile } from "node:fs/promises";
import { join as join4, sep } from "node:path";

// src/loopback.ts
function isIPv4Loopback(v4) {
  const parts = v4.split(".");
  return parts.length === 4 && parts[0] === "127" && parts.every((part) => /^\d{1,3}$/.test(part) && Number(part) <= 255);
}
function isLoopbackAddress(address) {
  if (address === void 0) return false;
  const normalized = address.toLowerCase();
  if (normalized === "::1") return true;
  if (normalized.startsWith("::ffff:")) return isIPv4Loopback(normalized.slice("::ffff:".length));
  return isIPv4Loopback(normalized);
}
function isLoopbackHostname(hostname) {
  if (hostname === "localhost" || hostname === "[::1]") return true;
  return isIPv4Loopback(hostname);
}
function isLoopbackRequest(request) {
  if (!isLoopbackAddress(request.socket.remoteAddress)) return false;
  const host = request.headers.host;
  if (typeof host !== "string") return false;
  let hostUrl;
  try {
    hostUrl = new URL("http://" + host);
  } catch {
    return false;
  }
  if (!isLoopbackHostname(hostUrl.hostname)) return false;
  if (request.headers["sec-fetch-site"] === "cross-site") return false;
  const origin = request.headers.origin;
  if (origin === void 0) return true;
  try {
    return new URL(origin).host === hostUrl.host;
  } catch {
    return false;
  }
}

// src/pair-access.ts
function isPairedOrLoopbackAllowed(ctx, request) {
  if (isLoopbackRequest(request)) return true;
  const fromGet = typeof ctx.get === "function" ? ctx.get("remoteWebUiPairing", false) : void 0;
  const pairing = isPairingAccess(fromGet) ? fromGet : ctx.remoteWebUiPairing;
  return pairing?.isPairedDevice(request) === true;
}
function isPairingAccess(value) {
  return value !== void 0 && value !== null && typeof value.isPairedDevice === "function";
}

// src/access.ts
function isPetAllowed(ctx, request) {
  if (request.headers["sec-fetch-site"] === "cross-site" || request.headers["sec-fetch-site"] === "same-site") return false;
  const origin = request.headers.origin;
  if (origin !== void 0) {
    try {
      const parsed = new URL(origin);
      if (!["http:", "https:"].includes(parsed.protocol) || parsed.host !== request.headers.host) return false;
    } catch {
      return false;
    }
  }
  return isPairedOrLoopbackAllowed(ctx, request);
}

// src/http.ts
var DEFAULT_JSON_BODY_MAX_BYTES = 64 * 1024;
var JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "referrer-policy": "no-referrer"
};
async function readJsonBody(req, opts = {}) {
  const maxBytes = opts.maxBytes ?? DEFAULT_JSON_BODY_MAX_BYTES;
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = chunk;
    size += buffer.length;
    if (size > maxBytes) {
      req.destroy();
      return null;
    }
    chunks.push(buffer);
  }
  const text = Buffer.concat(chunks).toString("utf8");
  if (text === "") return null;
  try {
    const parsed = JSON.parse(text);
    if (opts.objectOnly && !isJsonObject(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}
function isJsonObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function writeJson(res, status, body, headers = {}) {
  const payload = JSON.stringify(body);
  res.writeHead(status, { ...JSON_HEADERS, ...headers });
  res.end(payload);
}

// src/routes.ts
var PET_API_PREFIX = "/api/pet";
var PET_ASSET_PREFIX = "/pet";
var MANIFEST_FILE = "pet.json";
var PREVIEW_DIR = "previews";
var PREVIEW_PATTERN = /^[A-Za-z0-9._-]+$/;
var PET_ASSET_CAPS = {
  /** pet.json manifest. */
  manifest: 64 * 1024,
  /** Atlas, preview and Live2D texture imagery. */
  image: 20 * 1024 * 1024,
  /** Live2D model closure files (.moc3, motion/physics/expression JSON; M3). */
  model: 32 * 1024 * 1024
};
var IMAGE_EXTENSIONS = /* @__PURE__ */ new Set([".webp", ".png", ".gif", ".jpg", ".jpeg"]);
function extensionOf(file) {
  const dot = file.lastIndexOf(".");
  return dot < 0 ? "" : file.slice(dot).toLowerCase();
}
var REAL_BASE_CACHE = /* @__PURE__ */ new Map();
function containedRealpath(base, candidate) {
  try {
    let realBase = REAL_BASE_CACHE.get(base);
    if (realBase === void 0) {
      realBase = realpathSync(base);
      REAL_BASE_CACHE.set(base, realBase);
    }
    const realCandidate = realpathSync(candidate);
    return realCandidate === realBase || realCandidate.startsWith(realBase + sep) ? realCandidate : void 0;
  } catch {
    return void 0;
  }
}
var MIME_BY_EXT = {
  ".webp": "image/webp",
  ".png": "image/png",
  ".gif": "image/gif",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".json": "application/json"
};
function mimeFor(file) {
  const dot = file.lastIndexOf(".");
  if (dot < 0) return "application/octet-stream";
  return MIME_BY_EXT[file.slice(dot).toLowerCase()] ?? "application/octet-stream";
}
function weakEtag(stat) {
  return '"' + stat.size.toString(16) + "-" + Math.round(stat.mtimeMs).toString(16) + '"';
}
function revalidated(req, res, etag) {
  if (req.headers["if-none-match"] !== etag) return false;
  res.writeHead(304, { etag, "cache-control": "no-cache" });
  res.end();
  return true;
}
function requireMethod(req, res, method) {
  if (req.method === method) return true;
  writeJson(res, 405, { ok: false, error: "method-not-allowed" });
  return false;
}
function guard(ctx, req, res) {
  if (isPetAllowed(ctx, req)) return true;
  writeJson(res, 403, { ok: false, error: "forbidden: loopback-only" });
  return false;
}
function getRoute(ctx, path, run) {
  return {
    kind: "exact",
    path,
    handler: (req, res) => {
      if (!guard(ctx, req, res)) return;
      if (!requireMethod(req, res, "GET")) return;
      run(req).then((value) => writeJson(res, 200, value), (error) => {
        writeJson(res, 500, { ok: false, error: error instanceof Error ? error.message : String(error) });
      });
    }
  };
}
function postRoute(ctx, path, run) {
  return {
    kind: "exact",
    path,
    handler: (req, res) => {
      if (!guard(ctx, req, res)) return Promise.resolve();
      if (!requireMethod(req, res, "POST")) return Promise.resolve();
      if (req.headers["content-type"]?.split(";")[0]?.trim().toLowerCase() !== "application/json") {
        writeJson(res, 415, { ok: false, error: "application-json-required" });
        return Promise.resolve();
      }
      return readJsonBody(req, { maxBytes: 64 * 1024 }).then((parsed) => {
        if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
          writeJson(res, 400, { ok: false, error: "invalid-json-object" });
          return;
        }
        const payload = parsed;
        const record = typeof payload === "object" && payload !== null ? payload : {};
        return run(record).then(
          (value) => writeJson(res, 200, value),
          (error) => {
            writeJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
          }
        );
      }, (error) => {
        writeJson(res, 400, { ok: false, error: error instanceof Error ? error.message : String(error) });
      });
    }
  };
}
function dirAliases(registry) {
  const aliases = /* @__PURE__ */ new Map();
  for (const entry of registry.entries) {
    const alias = entry.dir.split(/[\\/]/).pop() ?? "";
    if (alias !== "" && !aliases.has(alias)) aliases.set(alias, entry);
  }
  return aliases;
}
function assetHandler(ctx, registry, caps) {
  const aliases = dirAliases(registry);
  const servableById = new Map(
    registry.entries.map((entry) => [entry.id, new Set(entry.servable)])
  );
  return ((req, res) => {
    if (!guard(ctx, req, res)) return;
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405);
      res.end();
      return;
    }
    let pathname;
    try {
      pathname = new URL(req.url ?? "/", "http://pet.local").pathname;
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }
    const segments = pathname.split("/").filter((segment) => segment !== "");
    if (segments[0] !== "pet" || segments[1] === void 0) {
      res.writeHead(404);
      res.end();
      return;
    }
    let id;
    try {
      id = decodeURIComponent(segments[1]);
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }
    const entry = registry.byId(id) ?? aliases.get(id);
    if (entry === void 0) {
      res.writeHead(404);
      res.end();
      return;
    }
    const rest = [];
    for (const segment of segments.slice(2)) {
      let decoded;
      try {
        decoded = decodeURIComponent(segment);
      } catch {
        res.writeHead(400);
        res.end();
        return;
      }
      rest.push(decoded);
    }
    const rel = rest.join("/");
    let file;
    let synthesized = false;
    if (rest.length === 1 && rest[0] === MANIFEST_FILE) {
      const manifestFile = join4(entry.dir, MANIFEST_FILE);
      file = existsSync2(manifestFile) ? manifestFile : void 0;
      if (file === void 0) synthesized = true;
    } else if (rest.length > 0 && servableById.get(entry.id)?.has(rel)) {
      file = join4(entry.dir, rel);
    } else if (rest.length === 2 && rest[0] === PREVIEW_DIR && PREVIEW_PATTERN.test(rest[1])) {
      const preview = join4(entry.dir, PREVIEW_DIR, rest[1]);
      file = existsSync2(preview) ? preview : void 0;
    }
    if (synthesized) {
      const body = Buffer.from(JSON.stringify(petEntryView(entry, registry.globalVoice), null, 2), "utf8");
      res.writeHead(200, {
        "content-type": "application/json; charset=utf-8",
        "content-length": String(body.byteLength),
        "cache-control": "no-cache"
      });
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      res.end(body);
      return;
    }
    if (file === void 0) {
      res.writeHead(404);
      res.end();
      return;
    }
    const resolved = containedRealpath(entry.dir, file);
    if (resolved === void 0) {
      res.writeHead(403);
      res.end();
      return;
    }
    const cap2 = rest.length === 1 && rest[0] === MANIFEST_FILE ? caps.manifest : IMAGE_EXTENSIONS.has(extensionOf(rel)) ? caps.image : caps.model;
    let stat;
    try {
      stat = statSync2(resolved);
      if (stat.size > cap2) {
        res.writeHead(413);
        res.end();
        return;
      }
    } catch {
      res.writeHead(404);
      res.end();
      return;
    }
    const etag = weakEtag(stat);
    if (revalidated(req, res, etag)) return;
    return readFile(resolved).then((body) => {
      res.writeHead(200, {
        "x-content-type-options": "nosniff",
        "content-security-policy": "default-src 'none'; sandbox",
        "content-type": mimeFor(resolved),
        "content-length": String(body.byteLength),
        "cache-control": "no-cache",
        etag
      });
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      res.end(body);
    }, () => {
      res.writeHead(404);
      res.end();
    });
  });
}
var PET_RUNTIME_PREFIX = PET_API_PREFIX + "/runtime";
var RUNTIME_FILES = {
  "live2dcubismcore.min.js": { root: "runtimeDir" },
  "live2d-vendor.js": { root: "vendorDir" },
  "live2d-vendor.js.map": { root: "vendorDir" }
};
var PET_RUNTIME_CAP = 16 * 1024 * 1024;
function runtimeHandler(ctx, roots) {
  return ((req, res) => {
    if (!guard(ctx, req, res)) return;
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405);
      res.end();
      return;
    }
    let pathname;
    try {
      pathname = new URL(req.url ?? "/", "http://pet.local").pathname;
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }
    const rest = pathname.slice(PET_RUNTIME_PREFIX.length).replace(/^\/+/, "");
    let name2;
    try {
      name2 = decodeURIComponent(rest);
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }
    const spec = RUNTIME_FILES[name2];
    if (spec === void 0) {
      res.writeHead(404);
      res.end();
      return;
    }
    const base = spec.root === "runtimeDir" ? roots.runtimeDir : roots.vendorDir;
    const file = join4(base, name2);
    if (!existsSync2(file)) {
      writeJson(res, 404, { ok: false, error: "runtime-file-missing", file: name2 });
      return;
    }
    const resolved = containedRealpath(base, file);
    if (resolved === void 0) {
      res.writeHead(403);
      res.end();
      return;
    }
    let stat;
    try {
      stat = statSync2(resolved);
      if (stat.size > PET_RUNTIME_CAP) {
        res.writeHead(413);
        res.end();
        return;
      }
    } catch {
      res.writeHead(404);
      res.end();
      return;
    }
    const etag = weakEtag(stat);
    if (revalidated(req, res, etag)) return;
    return readFile(resolved).then((body) => {
      res.writeHead(200, {
        "content-type": name2.endsWith(".map") ? "application/json" : "application/javascript; charset=utf-8",
        "content-length": String(body.byteLength),
        "cache-control": "no-cache",
        etag
      });
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      res.end(body);
    }, () => {
      res.writeHead(404);
      res.end();
    });
  });
}
function decorationHandler(ctx, registry, caps) {
  return (req, res) => {
    if (!guard(ctx, req, res)) return;
    if (req.method !== "GET" && req.method !== "HEAD") {
      res.writeHead(405);
      res.end();
      return;
    }
    let pathname;
    try {
      pathname = new URL(req.url ?? "/", "http://pet.local").pathname;
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }
    const segments = pathname.split("/").filter((segment) => segment !== "");
    const prefixSegments = DECORATION_ASSET_PREFIX.split("/").filter((segment) => segment !== "");
    if (segments.length < prefixSegments.length + 2) {
      res.writeHead(404);
      res.end();
      return;
    }
    for (let i = 0; i < prefixSegments.length; i += 1) {
      if (segments[i] !== prefixSegments[i]) {
        res.writeHead(404);
        res.end();
        return;
      }
    }
    let id;
    try {
      id = decodeURIComponent(segments[prefixSegments.length]);
    } catch {
      res.writeHead(400);
      res.end();
      return;
    }
    const entry = registry.decorationById?.(id);
    if (entry === void 0) {
      res.writeHead(404);
      res.end();
      return;
    }
    const rest = [];
    for (const segment of segments.slice(prefixSegments.length + 1)) {
      let decoded;
      try {
        decoded = decodeURIComponent(segment);
      } catch {
        res.writeHead(400);
        res.end();
        return;
      }
      rest.push(decoded);
    }
    const rel = rest.join("/");
    if (!entry.servable.includes(rel)) {
      res.writeHead(404);
      res.end();
      return;
    }
    const file = join4(entry.dir, rel);
    const resolved = containedRealpath(entry.dir, file);
    if (resolved === void 0) {
      res.writeHead(403);
      res.end();
      return;
    }
    const cap2 = rel === "decoration.json" ? caps.manifest : caps.image;
    let stat;
    try {
      stat = statSync2(resolved);
      if (stat.size > cap2) {
        res.writeHead(413);
        res.end();
        return;
      }
    } catch {
      res.writeHead(404);
      res.end();
      return;
    }
    const etag = weakEtag(stat);
    if (revalidated(req, res, etag)) return;
    readFile(resolved).then((body) => {
      res.writeHead(200, {
        "x-content-type-options": "nosniff",
        "content-security-policy": "default-src 'none'; sandbox",
        "content-type": mimeFor(resolved),
        "content-length": String(body.byteLength),
        "cache-control": "no-cache",
        etag
      });
      if (req.method === "HEAD") {
        res.end();
        return;
      }
      res.end(body);
    }, () => {
      res.writeHead(404);
      res.end();
    });
  };
}
function makePetRoutes(deps) {
  const { service, ctx, desktop } = deps;
  const apiRoutes = [
    getRoute(ctx, PET_API_PREFIX + "/state", async (req) => {
      const current = new URL(req.url ?? "/", "http://pet.local").searchParams.get("current");
      const state = await service.state(current === null ? void 0 : current);
      return desktop ? { ...state, desktop: desktop.status() } : state;
    }),
    getRoute(ctx, PET_API_PREFIX + "/pets", () => service.pets()),
    getRoute(ctx, PET_API_PREFIX + "/diagnostics", () => service.diagnostics()),
    postRoute(ctx, PET_API_PREFIX + "/session-viewed", (body) => {
      if (typeof body.sessionId !== "string" || typeof body.revision !== "number") return Promise.reject(new Error("invalid-viewed-session"));
      return service.markSessionViewed(body.sessionId, body.revision);
    }),
    postRoute(ctx, PET_API_PREFIX + "/interact", (body) => {
      const kind = body.kind;
      if (kind !== "pet" && kind !== "feed") return Promise.reject(new Error("invalid-kind"));
      return service.interact(kind);
    }),
    postRoute(ctx, PET_API_PREFIX + "/set-visible", (body) => {
      const visible = body.visible;
      if (typeof visible !== "boolean") return Promise.reject(new Error("invalid-visible"));
      return service.setVisible(visible);
    }),
    postRoute(ctx, PET_API_PREFIX + "/set-config", (body) => service.setConfig({
      ...Object.fromEntries(["size", "right", "bottom", "bubbleScale", "animationFps", "animationRunFpsLimit", "animationActionFps", "animationMode", "animationTickSlope", "animationTickIntercept", "desktopEnabled", "multiPetEnabled", "bubbleOnly", "hoverPanelEnabled", "visible"].filter((key) => Object.hasOwn(body, key)).map((key) => [key, body[key]])),
      ...typeof body.right === "number" ? { right: body.right } : {},
      ...typeof body.bottom === "number" ? { bottom: body.bottom } : {},
      ...typeof body.visible === "boolean" ? { visible: body.visible } : {}
    }, body.petId)),
    postRoute(ctx, PET_API_PREFIX + "/set-name", (body) => {
      const name2 = body.name;
      if (typeof name2 !== "string") return Promise.reject(new Error("invalid-name"));
      return service.setName(name2);
    }),
    postRoute(ctx, PET_API_PREFIX + "/set-skin", (body) => {
      const skin = body.skin;
      if (skin !== void 0 && typeof skin !== "string") return Promise.reject(new Error("invalid-skin"));
      return service.setSkin(skin === void 0 || skin === "" ? void 0 : skin);
    }),
    postRoute(ctx, PET_API_PREFIX + "/set-pet", (body) => {
      const petId = body.petId;
      if (typeof petId !== "string") return Promise.reject(new Error("invalid-pet"));
      return service.setPetId(petId);
    }),
    // Gameplay verbs (miku-pet generalization): touch rolls a named zone's
    // branch; the omitted-zone form is the plain-click boost during a touch
    // animation. Mode/tick/buy drive the work, sleep and shop loops.
    postRoute(ctx, PET_API_PREFIX + "/gameplay/touch", (body) => {
      const zone = body.zone;
      if (zone !== void 0 && typeof zone !== "string") return Promise.reject(new Error("invalid-zone"));
      return service.gameplayTouch(zone);
    }),
    postRoute(ctx, PET_API_PREFIX + "/gameplay/mode", (body) => {
      const mode = body.mode;
      if (mode !== null && typeof mode !== "string") return Promise.reject(new Error("invalid-mode"));
      return service.gameplaySetMode(mode);
    }),
    postRoute(ctx, PET_API_PREFIX + "/gameplay/work-tick", () => service.gameplayWorkTick()),
    postRoute(ctx, PET_API_PREFIX + "/gameplay/buy", (body) => {
      const item = body.item;
      if (typeof item !== "string") return Promise.reject(new Error("invalid-item"));
      return service.gameplayBuy(item);
    })
  ];
  if (desktop) {
    const nativeRoutes = [
      getRoute(ctx, PET_API_PREFIX + "/desktop/status", async () => desktop.status()),
      postRoute(ctx, PET_API_PREFIX + "/desktop/configure", async (body) => desktop.configure(body)),
      postRoute(ctx, PET_API_PREFIX + "/desktop/reset", async () => desktop.resetPosition()),
      postRoute(ctx, PET_API_PREFIX + "/desktop/retry", async () => desktop.retry()),
      postRoute(ctx, PET_API_PREFIX + "/desktop/ack-open", async (body) => desktop.acknowledge(body.revision))
    ];
    for (const route of nativeRoutes) apiRoutes.push({ ...route, handler(req, res) {
      if (!isLoopbackRequest(req)) {
        writeJson(res, 403, { error: "desktop-local-only" });
        return;
      }
      return route.handler(req, res);
    } });
  }
  const assetRoute = {
    kind: "prefix",
    path: PET_ASSET_PREFIX,
    handler: assetHandler(ctx, service.registrySnapshot(), deps.assetCaps ?? PET_ASSET_CAPS)
  };
  const runtimeRoute = {
    kind: "prefix",
    path: PET_RUNTIME_PREFIX,
    handler: runtimeHandler(ctx, {
      runtimeDir: deps.runtimeDir ?? join4(dshHome(), "pets", ".runtime"),
      vendorDir: deps.vendorDir ?? join4(petPackageRoot(import.meta.url), "lib")
    })
  };
  const decorationRoute = {
    kind: "prefix",
    path: DECORATION_ASSET_PREFIX,
    handler: decorationHandler(ctx, service.registrySnapshot(), deps.assetCaps ?? PET_ASSET_CAPS)
  };
  return [...apiRoutes, assetRoute, runtimeRoute, decorationRoute];
}

// src/mount-once.ts
var MOUNTED = Symbol.for("dsh-web.mounted-plugins");
var WAITERS = Symbol.for("dsh-web.mounted-plugins.waiters");
function mountedSet() {
  const registry = globalThis;
  const existing = registry[MOUNTED];
  if (existing instanceof Set) return existing;
  const created = /* @__PURE__ */ new Set();
  registry[MOUNTED] = created;
  return created;
}
function mountWaiters() {
  const registry = globalThis;
  return registry[WAITERS] ??= /* @__PURE__ */ new Map();
}
function mountOnce(packageName, fn) {
  const mount = (...args) => {
    const mounted = mountedSet();
    const ctx = args[0];
    if (mounted.has(packageName)) {
      const waiters = mountWaiters();
      const queue = waiters.get(packageName) ?? [];
      let alive = true;
      const pending = {
        run: () => {
          if (alive) mount(...args);
        }
      };
      ctx?.effect?.(() => () => {
        alive = false;
        const index = queue.indexOf(pending);
        if (index >= 0) queue.splice(index, 1);
      });
      queue.push(pending);
      waiters.set(packageName, queue);
      return;
    }
    mounted.add(packageName);
    ctx?.effect?.(() => () => {
      mounted.delete(packageName);
      const waiters = mountWaiters();
      const queue = waiters.get(packageName);
      if (queue === void 0) return;
      waiters.delete(packageName);
      for (const waiter of queue.splice(0)) queueMicrotask(() => {
        waiter.run();
      });
    });
    return fn(...args);
  };
  return mount;
}

// src/desktop-companion.ts
import { createRequire } from "node:module";
import { join as join5 } from "node:path";
function createDesktopCompanion(options) {
  const root = petPackageRoot(import.meta.url);
  const { createCompanion } = createRequire(import.meta.url)(join5(root, "desktop/companion-host.cjs"));
  const home = dshHome();
  const cacheDir = join5(home, "cache", "pet-desktop");
  return createCompanion({ ...options, pluginDir: root, cacheDir });
}

// src/index.ts
var name = "pet";
var inject = ["webServer"];
var PET_FORM_DEFAULTS = {
  visible: true,
  size: 160,
  right: 24,
  bottom: 20,
  bubbleScale: 1,
  animationFps: 12,
  animationRunFpsLimit: 0,
  animationActionFps: 0,
  animationMode: "fixed",
  animationTickSlope: DEFAULT_TICK_SLOPE,
  animationTickIntercept: DEFAULT_TICK_INTERCEPT,
  desktopEnabled: true,
  multiPetEnabled: false,
  bubbleOnly: false,
  hoverPanelEnabled: false,
  petId: DEFAULT_PET_ID,
  enabled: true,
  decorationEnabled: true
};
var Config = z.object({
  visible: z.boolean().default(PET_FORM_DEFAULTS.visible).volatile(),
  size: z.number().step(1).min(DISPLAY_SIZE_MIN).max(DISPLAY_SIZE_MAX).default(PET_FORM_DEFAULTS.size).volatile(),
  right: z.number().step(1).min(0).max(DISPLAY_INSET_MAX).default(PET_FORM_DEFAULTS.right).volatile(),
  bottom: z.number().step(1).min(0).max(DISPLAY_INSET_MAX).default(PET_FORM_DEFAULTS.bottom).volatile(),
  bubbleScale: z.number().step(BUBBLE_SCALE_STEP).min(BUBBLE_SCALE_MIN).max(BUBBLE_SCALE_MAX).default(PET_FORM_DEFAULTS.bubbleScale).volatile(),
  animationFps: z.number().min(1).default(12).volatile(),
  animationRunFpsLimit: z.number().min(0).default(0).volatile(),
  animationActionFps: z.number().min(0).default(0).volatile(),
  animationMode: z.union(["fixed", "native", "tick"]).default("fixed").volatile(),
  animationTickSlope: z.number().min(MIN_TICK_SLOPE).max(MAX_TICK_SLOPE).default(DEFAULT_TICK_SLOPE).volatile(),
  animationTickIntercept: z.number().min(MIN_TICK_INTERCEPT).max(MAX_TICK_INTERCEPT).default(DEFAULT_TICK_INTERCEPT).volatile(),
  desktopEnabled: z.boolean().default(true).volatile(),
  multiPetEnabled: z.boolean().default(false).volatile(),
  bubbleOnly: z.boolean().default(false).volatile(),
  hoverPanelEnabled: z.boolean().default(false).volatile(),
  // An absent profile choice must leave the selection persisted in pet.json
  // intact across restarts (aggregate rows have no served Host pet form).
  petId: z.string().volatile(),
  enabled: z.boolean().default(PET_FORM_DEFAULTS.enabled).volatile(),
  decorationEnabled: z.boolean().default(PET_FORM_DEFAULTS.decorationEnabled).volatile()
});
function readLive(field, fallback) {
  if (field === void 0) return fallback;
  const ref = field;
  return typeof ref.get === "function" ? ref.get() ?? fallback : field;
}
function displayField(key, live, persisted, committed) {
  const explicit = committed[key];
  if (explicit !== void 0) return explicit;
  const value = readLive(live, PET_FORM_DEFAULTS[key]);
  if (value !== PET_FORM_DEFAULTS[key]) return value;
  const kept = persisted[key];
  return kept === void 0 ? value : kept;
}
function petSettingsSection(config, fallbackPetId, persisted = {}, committed = {}) {
  return {
    visible: displayField("visible", config.visible, persisted, committed),
    size: displayField("size", config.size, persisted, committed),
    right: displayField("right", config.right, persisted, committed),
    bottom: displayField("bottom", config.bottom, persisted, committed),
    bubbleScale: displayField("bubbleScale", config.bubbleScale, persisted, committed),
    animationFps: displayField("animationFps", config.animationFps, persisted, committed),
    animationRunFpsLimit: displayField("animationRunFpsLimit", config.animationRunFpsLimit, persisted, committed),
    animationActionFps: displayField("animationActionFps", config.animationActionFps, persisted, committed),
    animationMode: displayField("animationMode", config.animationMode, persisted, committed),
    animationTickSlope: displayField("animationTickSlope", config.animationTickSlope, persisted, committed),
    animationTickIntercept: displayField("animationTickIntercept", config.animationTickIntercept, persisted, committed),
    desktopEnabled: displayField("desktopEnabled", config.desktopEnabled, persisted, committed),
    multiPetEnabled: displayField("multiPetEnabled", config.multiPetEnabled, persisted, committed),
    bubbleOnly: displayField("bubbleOnly", config.bubbleOnly, persisted, committed),
    hoverPanelEnabled: displayField("hoverPanelEnabled", config.hoverPanelEnabled, persisted, committed),
    petId: readLive(config.petId, fallbackPetId),
    enabled: readLive(config.enabled, PET_FORM_DEFAULTS.enabled),
    decorationEnabled: readLive(config.decorationEnabled, PET_FORM_DEFAULTS.decorationEnabled)
  };
}
var PET_SETTINGS_ROW_IDS = ["web-ui-pet", "ui-pet", PET_SETTINGS_NAMESPACE];
function servedRow(ctx) {
  try {
    const settings = ctx.get("settings", false);
    if (settings === void 0) return void 0;
    const rows = settings.describe();
    for (const id of PET_SETTINGS_ROW_IDS) {
      const row = rows.find((candidate) => candidate.ns === id);
      if (row !== void 0) return row;
    }
    return void 0;
  } catch {
    return void 0;
  }
}
var apply = mountOnce("@ltmroberthk915/dsh-pet", applyImpl);
function applyImpl(ctx, config = {}) {
  const registry = config.registry ?? loadPetRegistry({
    singlePet: true,
    packageRoot: petPackageRoot(import.meta.url),
    ...config.pets === void 0 ? {} : { extra: config.pets }
  });
  const service = new PetService(ctx, {
    ...config,
    enabled: readLive(config.enabled, PET_FORM_DEFAULTS.enabled),
    decorationEnabled: readLive(config.decorationEnabled, PET_FORM_DEFAULTS.decorationEnabled),
    registry
  });
  service.settingsNamespaceProvider = () => servedRow(ctx)?.ns;
  const current = () => petSettingsSection(config, service.selectedPetId(), service.display(), servedRow(ctx)?.user);
  const desktop = createDesktopCompanion({
    routes: () => routes,
    enabled: () => current().enabled !== false && service.display().visible && service.display().desktopEnabled !== false
  });
  const routes = makePetRoutes({ service, ctx, desktop });
  ctx.effect(() => () => desktop.dispose(), "pet: desktop companion");
  let disposeRoutes;
  const syncRoutes = () => {
    const enabled = current().enabled ?? true;
    if (disposeRoutes === void 0 && enabled) {
      disposeRoutes = ctx.effect(
        () => {
          const disposers = routes.map((route) => ctx.webServer.register(route));
          return () => {
            for (const dispose of disposers) dispose();
          };
        },
        "pet: routes"
      );
    } else if (disposeRoutes !== void 0 && !enabled) {
      disposeRoutes();
      disposeRoutes = void 0;
    }
  };
  const syncSettings = () => {
    const section = current();
    service.applySettingsSection(section);
    service.setEnabled(section.enabled ?? true);
    syncRoutes();
    desktop.configure({ enabled: section.enabled !== false && section.visible && section.desktopEnabled !== false });
  };
  ctx.on("loader/volatile-update", () => {
    syncSettings();
  });
  ctx.inject(["settings"], (settingsCtx) => {
    settingsCtx.effect(() => {
      try {
        return settingsCtx.settings.configure({ auto: false }, ctx.fiber);
      } catch {
        return () => {
        };
      }
    }, "pet: settings page policy");
  });
  syncSettings();
}
export {
  AFFINITY_MAX,
  AFFINITY_RANKS,
  BUILTIN_REMARKS,
  Config,
  DEFAULT_FRAME_COUNTS,
  DEFAULT_PET_CELL,
  DEFAULT_PET_COLUMNS,
  DEFAULT_PET_ID,
  DEFAULT_PET_NAME,
  DEFAULT_PET_ROW_COUNT,
  DEFAULT_TRACK_PATTERNS,
  MAX_SESSION_BUBBLES,
  PET_API_PREFIX,
  PET_ASSET_PREFIX,
  PET_FORM_DEFAULTS,
  PET_NAME_MAX_LENGTH,
  PET_ROW_ORDER,
  PetService,
  PetStateMachine,
  REMARK_KINDS,
  REMARK_LINES_MAX,
  REMARK_LINE_MAX,
  RemarkPicker,
  animationForPhase,
  apply,
  applyInteraction,
  applyTurnReward,
  builtinRemark,
  codexPetsDir,
  consumeTreat,
  defaultDisplayConfig,
  defaultTreatConfig,
  emptyAffinity,
  emptyPersist,
  emptyTreatLedger,
  inject,
  loadPetPersist,
  loadPetRegistry,
  makePetRoutes,
  name,
  normalizePetRemarks,
  petEntryView,
  petHomeDir,
  petPackageRoot,
  petSettingsSection,
  rankOf,
  resolvePetManifest,
  rowOf,
  savePetPersist,
  settleTreatGrants
};
