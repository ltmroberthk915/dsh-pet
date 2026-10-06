/**
 * dsh-pet locale dictionaries (zh/en).
 * @module dsh-pet-copilot/client/locales
 */
/** Dictionary namespace this package registers. */
export declare const NS = "pet";
/** Chinese copy. */
export declare const zh: {
    readonly 'pet.feed': "喂食";
    readonly 'pet.hide': "隐藏";
    readonly 'pet.rename': "改名";
    readonly 'pet.confirm': "确定";
    readonly 'pet.namePlaceholder': "输入新名字";
    readonly 'pet.summon': "召唤{name}";
    readonly 'pet.rank': "亲密度 {rank}";
    readonly 'pet.rank.name.\u5E7C\u9CB8': "幼鲸";
    readonly 'pet.rank.name.\u4F19\u4F34': "伙伴";
    readonly 'pet.rank.name.\u631A\u53CB': "挚友";
    readonly 'pet.rank.name.\u6DF1\u6D77\u7F81\u7ECA': "深海羁绊";
    readonly 'pet.rank.name.\u5FC3\u6709\u7075\u7280': "心有灵犀";
    readonly 'pet.rank.name.\u4F20\u8BF4\u7F81\u7ECA': "传说羁绊";
    readonly 'pet.rank.name.\u795E\u8BDD\u7F81\u7ECA': "神话羁绊";
    readonly 'pet.rank.name.\u6C38\u6052\u4E4B\u5951': "永恒之契";
    readonly 'pet.rank.name.\u9CB8\u751F\u5171\u6E21': "鲸生共渡";
    readonly 'pet.points': "{points} 点";
    readonly 'pet.treats': "小鱼干 ×{n}";
    readonly 'pet.state.loading': "宠物正在赶来…";
    readonly 'pet.state.error': "宠物迷路了（连接失败）";
    readonly 'pet.renderer.unavailable': "这只宠物需要的渲染器（{renderer}）在当前版本不可用。";
    readonly 'pet.live2d.core-missing': "Live2D 核心未安装：请把官方 live2dcubismcore.min.js 放入 $DSH_HOME/pets/.runtime/ 后刷新（步骤见宠物插件 README）。";
    readonly 'pet.live2d.vendor-missing': "Live2D 组件缺失，请升级宠物插件。";
    readonly 'pet.live2d.load-failed': "Live2D 模型加载失败，请检查该宠物目录的完整性。";
    readonly 'pet.openSessionHint': "点击跳转到对应会话";
    readonly 'pet.clickHint': "左键唤出 DSH；右键抚摸并展开看板；按住拖动";
    readonly 'pet.ready.idle': "随时就绪";
    readonly 'pet.ready.waiting': "等待响应";
    readonly 'pet.ready.thinking': "正在思考";
    readonly 'pet.ready.tool': "正在执行";
    readonly 'pet.ready.review': "正在整理结果";
    readonly 'pet.ready.done': "处理完成";
    readonly 'pet.ready.failed': "需要关注";
    readonly 'pet.gameplay.menu': "玩法";
    readonly 'pet.gameplay.work': "打工";
    readonly 'pet.gameplay.stopWork': "收工";
    readonly 'pet.gameplay.sleep': "休息";
    readonly 'pet.gameplay.wake': "起床";
    readonly 'pet.gameplay.shop': "商店";
    readonly 'pet.gameplay.skin': "皮肤";
    readonly 'pet.gameplay.skinDefault': "默认";
    readonly 'pet.gameplay.back': "返回";
    readonly 'pet.gameplay.buy': "购买";
    readonly 'pet.gameplay.insufficient': "{currency}不足";
    readonly 'pet.gameplay.prize': "中奖 +{amount} {currency}";
    readonly 'pet.gameplay.working': "打工中";
    readonly 'pet.gameplay.sleeping': "睡觉中";
    readonly 'pet.gameplay.stat.hunger': "饱食";
    readonly 'pet.gameplay.stat.mood': "心情";
    readonly 'pet.gameplay.stat.energy': "精力";
    readonly 'pet.gameplay.stat.affection': "好感";
    readonly 'pet.gameplay.currency.treats': "小鱼干";
    readonly 'pet.moreSessions': "展开其余 {n} 个会话的气泡";
    readonly 'pet.collapseSessions': "收起会话气泡";
    readonly 'settings.title': "宠物";
    readonly 'settings.description': "选择宠物并调整它的显示布局。";
    readonly 'settings.pet': "宠物";
    readonly 'settings.petHint': "选择显示哪只宠物；每只宠物独立命名，可在宠物悬浮面板改名。";
    readonly 'settings.enabled': "启用宠物";
    readonly 'settings.enabledHint': "关闭后隐藏宠物并停止轮询，可在设置里重新启用。";
    readonly 'settings.decoration': "状态装饰";
    readonly 'settings.decorationHint': "在宠物状态气泡里显示喷水鲸鱼等状态装饰；关闭后气泡只剩文字。";
    readonly 'settings.visible': "显示宠物";
    readonly 'settings.visibleHint': "关闭后宠物隐藏，可从聊天输入区重新召唤。";
    readonly 'settings.size': "大小（px）";
    readonly 'settings.sizeHint': "精灵单元高度，范围 32–1024。";
    readonly 'settings.bubbleScale': "气泡字号倍率";
    readonly 'settings.bubbleScaleHint': "状态、碎碎念与用量气泡的字号会随宠物大小自动缩放；这一项是在此基础上再乘一个倍率（0.5–2，默认 1）。字号本身不小于 10px、不大于 24px。";
    readonly 'settings.right': "距右侧（px）";
    readonly 'settings.rightHint': "应用内距右边缘的距离，范围 0–10000px。独立桌面位置请直接拖动宠物。";
    readonly 'settings.bottom': "距底部（px）";
    readonly 'settings.bottomHint': "应用内距底边的距离，范围 0–10000px。独立桌面位置请直接拖动宠物。";
    readonly 'settings.inherit': "继承";
    readonly 'settings.on': "开";
    readonly 'settings.off': "关";
    readonly 'settings.overridden': "已覆盖";
    readonly 'settings.reset': "恢复默认";
    readonly 'settings.notExposed': "宠物设置尚未就绪，正在重新连接。";
    readonly 'settings.serviceLoading': "正在连接宠物宿主…";
    readonly 'settings.serviceUnavailable': "暂时无法连接宠物宿主。若刚安装或更新，请完整退出 DSH 后重新打开；页面会自动重连，无需手改配置文件。";
    readonly 'settings.serviceAuthorization': "宠物连接未获授权（HTTP 401/403）。请完整退出 DSH 后重新打开；网页端请从 DSH 提供的入口重新进入。页面会自动重连。";
    readonly 'settings.readOnly': "当前部署的设置只读。";
    readonly 'settings.expand': "展开设置";
    readonly 'settings.collapse': "收起设置";
    readonly 'settings.save': "保存";
    readonly 'settings.saving': "保存中…";
    readonly 'settings.discard': "放弃";
    readonly 'settings.unsaved': "未保存";
    readonly 'settings.saveFailed': "保存失败：DSH 未能完成写入。输入已保留，请重试。";
    readonly 'settings.invalidDraft': "输入需要调整：请检查标注的字段，当前尚未提交保存。";
    readonly 'settings.invalidSize': "大小需为 32–1024 的整数；留空则恢复默认值。";
    readonly 'settings.invalidInset': "距离需为 0–10000 的整数；留空则恢复默认值。";
    readonly 'settings.invalidBubbleScale': "气泡字号倍率需为 0.5–2，按 0.05 递增（如 0.5、0.75、1）；留空则恢复默认值。";
    readonly 'settings.invalidNumber': "请输入数字，留空则使用默认值。";
};
/** English copy. */
export declare const en: {
    readonly 'pet.feed': "Feed";
    readonly 'pet.hide': "Hide";
    readonly 'pet.rename': "Rename";
    readonly 'pet.confirm': "OK";
    readonly 'pet.namePlaceholder': "Enter a new name";
    readonly 'pet.summon': "Summon {name}";
    readonly 'pet.rank': "Affinity {rank}";
    readonly 'pet.rank.name.\u5E7C\u9CB8': "Baby Whale";
    readonly 'pet.rank.name.\u4F19\u4F34': "Companion";
    readonly 'pet.rank.name.\u631A\u53CB': "Close Friend";
    readonly 'pet.rank.name.\u6DF1\u6D77\u7F81\u7ECA': "Deep Sea Bond";
    readonly 'pet.rank.name.\u5FC3\u6709\u7075\u7280': "Kindred Spirit";
    readonly 'pet.rank.name.\u4F20\u8BF4\u7F81\u7ECA': "Legendary Bond";
    readonly 'pet.rank.name.\u795E\u8BDD\u7F81\u7ECA': "Mythic Bond";
    readonly 'pet.rank.name.\u6C38\u6052\u4E4B\u5951': "Eternal Covenant";
    readonly 'pet.rank.name.\u9CB8\u751F\u5171\u6E21': "Lifelong Companion";
    readonly 'pet.points': "{points} pts";
    readonly 'pet.treats': "Treats ×{n}";
    readonly 'pet.state.loading': "The pet is on its way…";
    readonly 'pet.state.error': "The pet is lost (connection failed)";
    readonly 'pet.renderer.unavailable': "This pet needs a renderer ({renderer}) that is not available in this build.";
    readonly 'pet.live2d.core-missing': "Live2D Cubism Core is not installed: place the official live2dcubismcore.min.js under $DSH_HOME/pets/.runtime/ and refresh (see the pet plugin README).";
    readonly 'pet.live2d.vendor-missing': "The Live2D component is missing; please update the pet plugin.";
    readonly 'pet.live2d.load-failed': "The Live2D model failed to load; check the pet directory is complete.";
    readonly 'pet.openSessionHint': "Click to jump to this session";
    readonly 'pet.clickHint': "Click to open DSH; right-click to pet and open the care panel; hold to drag";
    readonly 'pet.ready.idle': "Ready when you are";
    readonly 'pet.ready.waiting': "Awaiting a response";
    readonly 'pet.ready.thinking': "Thinking";
    readonly 'pet.ready.tool': "Working";
    readonly 'pet.ready.review': "Preparing results";
    readonly 'pet.ready.done': "Complete";
    readonly 'pet.ready.failed': "Needs attention";
    readonly 'pet.gameplay.menu': "Play";
    readonly 'pet.gameplay.work': "Work";
    readonly 'pet.gameplay.stopWork': "Stop work";
    readonly 'pet.gameplay.sleep': "Sleep";
    readonly 'pet.gameplay.wake': "Wake up";
    readonly 'pet.gameplay.shop': "Shop";
    readonly 'pet.gameplay.skin': "Skin";
    readonly 'pet.gameplay.skinDefault': "Default";
    readonly 'pet.gameplay.back': "Back";
    readonly 'pet.gameplay.buy': "Buy";
    readonly 'pet.gameplay.insufficient': "Not enough {currency}";
    readonly 'pet.gameplay.prize': "Prize +{amount} {currency}";
    readonly 'pet.gameplay.working': "Working";
    readonly 'pet.gameplay.sleeping': "Sleeping";
    readonly 'pet.gameplay.stat.hunger': "Hunger";
    readonly 'pet.gameplay.stat.mood': "Mood";
    readonly 'pet.gameplay.stat.energy': "Energy";
    readonly 'pet.gameplay.stat.affection': "Affection";
    readonly 'pet.gameplay.currency.treats': "Treats";
    readonly 'pet.moreSessions': "Expand {n} more session bubbles";
    readonly 'pet.collapseSessions': "Collapse session bubbles";
    readonly 'settings.title': "Pet";
    readonly 'settings.description': "Pick a pet and tune its display layout.";
    readonly 'settings.pet': "Pet";
    readonly 'settings.petHint': "Choose which pet shows. Names are stored per pet; rename from the pet hover panel.";
    readonly 'settings.enabled': "Enable the pet";
    readonly 'settings.enabledHint': "When off, the pet hides and polling stops; re-enable it here.";
    readonly 'settings.decoration': "Status decoration";
    readonly 'settings.decorationHint': "Show ornaments like the spouting whale inside the pet status bubbles; when off, bubbles stay text-only.";
    readonly 'settings.visible': "Show the pet";
    readonly 'settings.visibleHint': "When off, the pet hides; summon it again from the input row.";
    readonly 'settings.size': "Size (px)";
    readonly 'settings.sizeHint': "Sprite cell height, 32–1024.";
    readonly 'settings.bubbleScale': "Bubble text multiplier";
    readonly 'settings.bubbleScaleHint': "Status, whisper, and usage bubbles scale with the pet automatically; this multiplies that result (0.5–2, default 1). The rendered text stays between 10px and 24px.";
    readonly 'settings.right': "Right inset (px)";
    readonly 'settings.rightHint': "In-app right inset, 0–10000px. Drag the independent desktop pet to position it.";
    readonly 'settings.bottom': "Bottom inset (px)";
    readonly 'settings.bottomHint': "In-app bottom inset, 0–10000px. Drag the independent desktop pet to position it.";
    readonly 'settings.inherit': "Inherit";
    readonly 'settings.on': "On";
    readonly 'settings.off': "Off";
    readonly 'settings.overridden': "Overridden";
    readonly 'settings.reset': "Reset to default";
    readonly 'settings.notExposed': "Pet settings are not ready. Reconnecting automatically.";
    readonly 'settings.serviceLoading': "Connecting to the pet service…";
    readonly 'settings.serviceUnavailable': "The pet service cannot be reached. If you just installed or updated it, fully quit and reopen DSH. This page reconnects automatically; no configuration file edits are needed.";
    readonly 'settings.serviceAuthorization': "The pet connection was not authorized (HTTP 401/403). Fully quit and reopen DSH; for the web client, reopen the entry provided by DSH. This page reconnects automatically.";
    readonly 'settings.readOnly': "This deployment stores settings read-only.";
    readonly 'settings.expand': "Show settings";
    readonly 'settings.collapse': "Hide settings";
    readonly 'settings.save': "Save";
    readonly 'settings.saving': "Saving…";
    readonly 'settings.discard': "Discard";
    readonly 'settings.unsaved': "Unsaved";
    readonly 'settings.saveFailed': "Save failed: DSH could not complete the write. Your input is retained; please retry.";
    readonly 'settings.invalidDraft': "Input needs correction: check the marked fields. Nothing has been submitted yet.";
    readonly 'settings.invalidSize': "Size must be an integer from 32 to 1024. Leave blank to restore the default.";
    readonly 'settings.invalidInset': "Inset must be an integer from 0 to 10000. Leave blank to restore the default.";
    readonly 'settings.invalidBubbleScale': "Use 0.5–2 in steps of 0.05 (e.g. 0.5, 0.75, 1). Leave blank to restore the default.";
    readonly 'settings.invalidNumber': "Enter a number, or leave blank to use the default.";
};
/** Key union for this namespace. */
export type PetKey = keyof typeof zh;
/** The settings-card slice of the pet dictionary. */
export type SettingsCardKey = PetKey;
/**
 * Active dictionary, picked by the document language at call time. The pet
 * mounts as a global floating surface (not a session-scoped slot), so it has
 * no framework locale seat and resolves its copy the same tiny way the
 * task-board's DOM-injected surface does.
 */
export declare function dictionary(): Record<PetKey, string>;
/**
 * Translate a key with optional `{name}` template params. Mirrors the slot
 * `Translate` contract `(key, params?) => string` so it can be handed to the
 * same components that used to receive the framework-injected `t` seat. The
 * key is typed loosely (`string`) so the function is assignable to the slot's
 * `TranslateNS<'pet'>` (whose key domain also spans the shared common
 * vocabulary); a missing key degrades to the key itself rather than throwing.
 */
export declare function t(key: string, params?: Record<string, unknown>): string;
declare module '@deepseek-ai/dsh-client-ui-slots' {
    interface LocaleNamespaceMap {
        /** dsh-pet UI copy. */
        pet: PetKey;
    }
}
//# sourceMappingURL=locales.d.ts.map