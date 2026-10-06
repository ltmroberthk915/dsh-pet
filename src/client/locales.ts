/**
 * dsh-pet locale dictionaries (zh/en).
 * @module dsh-pet-copilot/client/locales
 */

/** Dictionary namespace this package registers. */
export const NS = 'pet'

/** Chinese copy. */
export const zh = {
  'pet.feed': '喂食',
  'pet.hide': '隐藏',
  'pet.rename': '改名',
  'pet.confirm': '确定',
  'pet.namePlaceholder': '输入新名字',
  'pet.summon': '召唤{name}',
  'pet.rank': '亲密度 {rank}',
  'pet.rank.name.幼鲸': '幼鲸',
  'pet.rank.name.伙伴': '伙伴',
  'pet.rank.name.挚友': '挚友',
  'pet.rank.name.深海羁绊': '深海羁绊',
  'pet.rank.name.心有灵犀': '心有灵犀',
  'pet.rank.name.传说羁绊': '传说羁绊',
  'pet.rank.name.神话羁绊': '神话羁绊',
  'pet.rank.name.永恒之契': '永恒之契',
  'pet.rank.name.鲸生共渡': '鲸生共渡',
  'pet.points': '{points} 点',
  'pet.treats': '小鱼干 ×{n}',
  'pet.state.loading': '宠物正在赶来…',
  'pet.state.error': '宠物迷路了（连接失败）',
  'pet.renderer.unavailable': '这只宠物需要的渲染器（{renderer}）在当前版本不可用。',
  'pet.live2d.core-missing': 'Live2D 核心未安装：请把官方 live2dcubismcore.min.js 放入 $DSH_HOME/pets/.runtime/ 后刷新（步骤见宠物插件 README）。',
  'pet.live2d.vendor-missing': 'Live2D 组件缺失，请升级宠物插件。',
  'pet.live2d.load-failed': 'Live2D 模型加载失败，请检查该宠物目录的完整性。',
  'pet.openSessionHint': '点击跳转到对应会话',
  'pet.clickHint': '左键唤出 DSH；右键抚摸并展开看板；按住拖动',
  'pet.ready.idle': '随时就绪',
  'pet.ready.waiting': '等待响应',
  'pet.ready.thinking': '正在思考',
  'pet.ready.tool': '正在执行',
  'pet.ready.review': '正在整理结果',
  'pet.ready.done': '处理完成',
  'pet.ready.failed': '需要关注',
  // 玩法 HUD（miku-pet 泛化：属性条 / 打工 / 睡觉 / 商店；统一小鱼干经济）。
  'pet.gameplay.menu': '玩法',
  'pet.gameplay.work': '打工',
  'pet.gameplay.stopWork': '收工',
  'pet.gameplay.sleep': '休息',
  'pet.gameplay.wake': '起床',
  'pet.gameplay.shop': '商店',
  'pet.gameplay.skin': '皮肤',
  'pet.gameplay.skinDefault': '默认',
  'pet.gameplay.back': '返回',
  'pet.gameplay.buy': '购买',
  'pet.gameplay.insufficient': '{currency}不足',
  'pet.gameplay.prize': '中奖 +{amount} {currency}',
  'pet.gameplay.working': '打工中',
  'pet.gameplay.sleeping': '睡觉中',
  'pet.gameplay.stat.hunger': '饱食',
  'pet.gameplay.stat.mood': '心情',
  'pet.gameplay.stat.energy': '精力',
  'pet.gameplay.stat.affection': '好感',
  'pet.gameplay.currency.treats': '小鱼干',
  'pet.moreSessions': '展开其余 {n} 个会话的气泡',
  'pet.collapseSessions': '收起会话气泡',
  // 一级设置页（settings.section 席位）。
  'settings.title': '宠物',
  'settings.description': '选择宠物并调整它的显示布局。',
  'settings.pet': '宠物',
  'settings.petHint': '选择显示哪只宠物；每只宠物独立命名，可在宠物悬浮面板改名。',
  'settings.enabled': '启用宠物',
  'settings.enabledHint': '关闭后隐藏宠物并停止轮询，可在设置里重新启用。',
  'settings.decoration': '状态装饰',
  'settings.decorationHint': '在宠物状态气泡里显示喷水鲸鱼等状态装饰；关闭后气泡只剩文字。',
  'settings.visible': '显示宠物',
  'settings.visibleHint': '关闭后宠物隐藏，可从聊天输入区重新召唤。',
  'settings.size': '大小（px）',
  'settings.sizeHint': '精灵单元高度，范围 32–1024。',
  'settings.bubbleScale': '气泡字号倍率',
  'settings.bubbleScaleHint': '状态、碎碎念与用量气泡的字号会随宠物大小自动缩放；这一项是在此基础上再乘一个倍率（0.5–2，默认 1）。字号本身不小于 10px、不大于 24px。',
  'settings.right': '距右侧（px）',
  'settings.rightHint': '应用内距右边缘的距离，范围 0–10000px。独立桌面位置请直接拖动宠物。',
  'settings.bottom': '距底部（px）',
  'settings.bottomHint': '应用内距底边的距离，范围 0–10000px。独立桌面位置请直接拖动宠物。',
  'settings.inherit': '继承',
  'settings.on': '开',
  'settings.off': '关',
  'settings.overridden': '已覆盖',
  'settings.reset': '恢复默认',
  'settings.notExposed': '宠物设置尚未就绪，正在重新连接。',
  'settings.serviceLoading': '正在连接宠物宿主…',
  'settings.serviceUnavailable': '暂时无法连接宠物宿主。若刚安装或更新，请完整退出 DSH 后重新打开；页面会自动重连，无需手改配置文件。',
  'settings.serviceAuthorization': '宠物连接未获授权（HTTP 401/403）。请完整退出 DSH 后重新打开；网页端请从 DSH 提供的入口重新进入。页面会自动重连。',
  'settings.readOnly': '当前部署的设置只读。',
  'settings.expand': '展开设置',
  'settings.collapse': '收起设置',
  'settings.save': '保存',
  'settings.saving': '保存中…',
  'settings.discard': '放弃',
  'settings.unsaved': '未保存',
  'settings.saveFailed': '保存失败：DSH 未能完成写入。输入已保留，请重试。',
  'settings.invalidDraft': '输入需要调整：请检查标注的字段，当前尚未提交保存。',
  'settings.invalidSize': '大小需为 32–1024 的整数；留空则恢复默认值。',
  'settings.invalidInset': '距离需为 0–10000 的整数；留空则恢复默认值。',
  'settings.invalidBubbleScale': '气泡字号倍率需为 0.5–2，按 0.05 递增（如 0.5、0.75、1）；留空则恢复默认值。',
  'settings.invalidNumber': '请输入数字，留空则使用默认值。',
} as const

/** English copy. */
export const en = {
  'pet.feed': 'Feed',
  'pet.hide': 'Hide',
  'pet.rename': 'Rename',
  'pet.confirm': 'OK',
  'pet.namePlaceholder': 'Enter a new name',
  'pet.summon': 'Summon {name}',
  'pet.rank': 'Affinity {rank}',
  'pet.rank.name.幼鲸': 'Baby Whale',
  'pet.rank.name.伙伴': 'Companion',
  'pet.rank.name.挚友': 'Close Friend',
  'pet.rank.name.深海羁绊': 'Deep Sea Bond',
  'pet.rank.name.心有灵犀': 'Kindred Spirit',
  'pet.rank.name.传说羁绊': 'Legendary Bond',
  'pet.rank.name.神话羁绊': 'Mythic Bond',
  'pet.rank.name.永恒之契': 'Eternal Covenant',
  'pet.rank.name.鲸生共渡': 'Lifelong Companion',
  'pet.points': '{points} pts',
  'pet.treats': 'Treats ×{n}',
  'pet.state.loading': 'The pet is on its way…',
  'pet.state.error': 'The pet is lost (connection failed)',
  'pet.renderer.unavailable': 'This pet needs a renderer ({renderer}) that is not available in this build.',
  'pet.live2d.core-missing': 'Live2D Cubism Core is not installed: place the official live2dcubismcore.min.js under $DSH_HOME/pets/.runtime/ and refresh (see the pet plugin README).',
  'pet.live2d.vendor-missing': 'The Live2D component is missing; please update the pet plugin.',
  'pet.live2d.load-failed': 'The Live2D model failed to load; check the pet directory is complete.',
  'pet.openSessionHint': 'Click to jump to this session',
  'pet.clickHint': 'Click to open DSH; right-click to pet and open the care panel; hold to drag',
  'pet.ready.idle': 'Ready when you are',
  'pet.ready.waiting': 'Awaiting a response',
  'pet.ready.thinking': 'Thinking',
  'pet.ready.tool': 'Working',
  'pet.ready.review': 'Preparing results',
  'pet.ready.done': 'Complete',
  'pet.ready.failed': 'Needs attention',
  // Gameplay HUD (miku-pet generalization: stat bars / work / sleep / shop; unified treats economy).
  'pet.gameplay.menu': 'Play',
  'pet.gameplay.work': 'Work',
  'pet.gameplay.stopWork': 'Stop work',
  'pet.gameplay.sleep': 'Sleep',
  'pet.gameplay.wake': 'Wake up',
  'pet.gameplay.shop': 'Shop',
  'pet.gameplay.skin': 'Skin',
  'pet.gameplay.skinDefault': 'Default',
  'pet.gameplay.back': 'Back',
  'pet.gameplay.buy': 'Buy',
  'pet.gameplay.insufficient': 'Not enough {currency}',
  'pet.gameplay.prize': 'Prize +{amount} {currency}',
  'pet.gameplay.working': 'Working',
  'pet.gameplay.sleeping': 'Sleeping',
  'pet.gameplay.stat.hunger': 'Hunger',
  'pet.gameplay.stat.mood': 'Mood',
  'pet.gameplay.stat.energy': 'Energy',
  'pet.gameplay.stat.affection': 'Affection',
  'pet.gameplay.currency.treats': 'Treats',
  'pet.moreSessions': 'Expand {n} more session bubbles',
  'pet.collapseSessions': 'Collapse session bubbles',
  // First-level settings section (the `settings.section` seat).
  'settings.title': 'Pet',
  'settings.description': 'Pick a pet and tune its display layout.',
  'settings.pet': 'Pet',
  'settings.petHint': 'Choose which pet shows. Names are stored per pet; rename from the pet hover panel.',
  'settings.enabled': 'Enable the pet',
  'settings.enabledHint': 'When off, the pet hides and polling stops; re-enable it here.',
  'settings.decoration': 'Status decoration',
  'settings.decorationHint': 'Show ornaments like the spouting whale inside the pet status bubbles; when off, bubbles stay text-only.',
  'settings.visible': 'Show the pet',
  'settings.visibleHint': 'When off, the pet hides; summon it again from the input row.',
  'settings.size': 'Size (px)',
  'settings.sizeHint': 'Sprite cell height, 32\u20131024.',
  'settings.bubbleScale': 'Bubble text multiplier',
  'settings.bubbleScaleHint': 'Status, whisper, and usage bubbles scale with the pet automatically; this multiplies that result (0.5\u20132, default 1). The rendered text stays between 10px and 24px.',
  'settings.right': 'Right inset (px)',
  'settings.rightHint': 'In-app right inset, 0–10000px. Drag the independent desktop pet to position it.',
  'settings.bottom': 'Bottom inset (px)',
  'settings.bottomHint': 'In-app bottom inset, 0–10000px. Drag the independent desktop pet to position it.',
  'settings.inherit': 'Inherit',
  'settings.on': 'On',
  'settings.off': 'Off',
  'settings.overridden': 'Overridden',
  'settings.reset': 'Reset to default',
  'settings.notExposed': 'Pet settings are not ready. Reconnecting automatically.',
  'settings.serviceLoading': 'Connecting to the pet service…',
  'settings.serviceUnavailable': 'The pet service cannot be reached. If you just installed or updated it, fully quit and reopen DSH. This page reconnects automatically; no configuration file edits are needed.',
  'settings.serviceAuthorization': 'The pet connection was not authorized (HTTP 401/403). Fully quit and reopen DSH; for the web client, reopen the entry provided by DSH. This page reconnects automatically.',
  'settings.readOnly': 'This deployment stores settings read-only.',
  'settings.expand': 'Show settings',
  'settings.collapse': 'Hide settings',
  'settings.save': 'Save',
  'settings.saving': 'Saving\u2026',
  'settings.discard': 'Discard',
  'settings.unsaved': 'Unsaved',
  'settings.saveFailed': 'Save failed: DSH could not complete the write. Your input is retained; please retry.',
  'settings.invalidDraft': 'Input needs correction: check the marked fields. Nothing has been submitted yet.',
  'settings.invalidSize': 'Size must be an integer from 32 to 1024. Leave blank to restore the default.',
  'settings.invalidInset': 'Inset must be an integer from 0 to 10000. Leave blank to restore the default.',
  'settings.invalidBubbleScale': 'Use 0.5–2 in steps of 0.05 (e.g. 0.5, 0.75, 1). Leave blank to restore the default.',
  'settings.invalidNumber': 'Enter a number, or leave blank to use the default.',
} as const

/** Key union for this namespace. */
export type PetKey = keyof typeof zh

/** The settings-card slice of the pet dictionary. */
export type SettingsCardKey = PetKey

/**
 * Active dictionary, picked by the document language at call time. The pet
 * mounts as a global floating surface (not a session-scoped slot), so it has
 * no framework locale seat and resolves its copy the same tiny way the
 * task-board's DOM-injected surface does.
 */
export function dictionary(): Record<PetKey, string> {
  const lang = typeof document !== 'undefined' ? document.documentElement.lang : 'zh'
  return lang.toLowerCase().startsWith('en') ? en : zh
}

/**
 * Translate a key with optional `{name}` template params. Mirrors the slot
 * `Translate` contract `(key, params?) => string` so it can be handed to the
 * same components that used to receive the framework-injected `t` seat. The
 * key is typed loosely (`string`) so the function is assignable to the slot's
 * `TranslateNS<'pet'>` (whose key domain also spans the shared common
 * vocabulary); a missing key degrades to the key itself rather than throwing.
 */
export function t(key: string, params?: Record<string, unknown>): string {
  let text: string = (dictionary() as Record<string, string>)[key] ?? key
  if (params !== undefined) {
    for (const [name, value] of Object.entries(params)) {
      text = text.replaceAll(`{${name}}`, String(value))
    }
  }
  return text
}

declare module '@deepseek-ai/dsh-client-ui-slots' {
  interface LocaleNamespaceMap {
    /** dsh-pet UI copy. */
    pet: PetKey
  }
}
