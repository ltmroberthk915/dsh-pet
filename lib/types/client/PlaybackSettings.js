import { jsxs as _jsxs, jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { animationFps, animationMode, optionalFps, tickSlope, tickIntercept, effectiveFps, DEFAULT_TICK_SLOPE, DEFAULT_TICK_INTERCEPT, MIN_TICK_SLOPE, MAX_TICK_SLOPE, MIN_TICK_INTERCEPT, MAX_TICK_INTERCEPT } from "../animation.js";
import { desktopConnection, desktopRequest } from "./desktop-connection.js";
import { petJson, petServiceFailure } from "./pet-api.js";
import { t } from "./locales.js";
async function request(action, body) {
    return petJson('/api/pet/' + (action === 'config' ? 'set-config' : 'state'), body === undefined ? {} : {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
}
/** Also works in aggregate profiles that do not expose a Host settings form. */
export function PlaybackSettings() {
    const [snapshot, setSnapshot] = useState(null);
    const [mode, setMode] = useState('fixed');
    const [fps, setFps] = useState('12');
    const [limitRunning, setLimitRunning] = useState(false);
    const [runLimit, setRunLimit] = useState('60');
    const [customActions, setCustomActions] = useState(false);
    const [actionFps, setActionFps] = useState('12');
    const [slope, setSlope] = useState(String(DEFAULT_TICK_SLOPE));
    const [intercept, setIntercept] = useState(String(DEFAULT_TICK_INTERCEPT));
    const [desktop, setDesktop] = useState(true);
    const [multi, setMulti] = useState(false);
    const [bubbleOnly, setBubbleOnly] = useState(false);
    const [hoverPanel, setHoverPanel] = useState(false);
    const [message, setMessage] = useState('');
    const [busy, setBusy] = useState(false);
    const [serviceStatus, setServiceStatus] = useState('loading');
    useEffect(() => {
        let alive = true;
        let timer;
        let selected;
        const refresh = () => request('state').then((state) => {
            if (!alive)
                return;
            if (typeof state.pet?.id !== 'string' || !state.display)
                throw new Error('Invalid pet service state');
            setSnapshot(state);
            setServiceStatus('ready');
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
                setBubbleOnly(state.display.bubbleOnly === true);
                setHoverPanel(state.display.hoverPanelEnabled === true);
            }
        }).catch((error) => {
            if (alive) {
                setServiceStatus(petServiceFailure(error));
                setMessage('');
            }
        }).finally(() => {
            if (alive)
                timer = window.setTimeout(() => void refresh(), 2000);
        });
        void refresh();
        return () => { alive = false; window.clearTimeout(timer); };
    }, []);
    const connected = serviceStatus === 'ready' && snapshot !== null;
    const validLinear = slope.trim() !== '' && Number.isFinite(Number(slope)) && Number(slope) >= MIN_TICK_SLOPE && Number(slope) <= MAX_TICK_SLOPE
        && intercept.trim() !== '' && Number.isFinite(Number(intercept)) && Number(intercept) >= MIN_TICK_INTERCEPT && Number(intercept) <= MAX_TICK_INTERCEPT;
    const positiveFps = (value) => value.trim() !== '' && Number.isFinite(Number(value)) && Number(value) >= 1;
    const validFps = positiveFps(fps);
    const validLimit = !limitRunning || positiveFps(runLimit);
    const validActions = !customActions || positiveFps(actionFps);
    const savedLimit = limitRunning ? Number(runLimit) : 0;
    const savedActions = customActions ? Number(actionFps) : 0;
    const valid = validFps && validLimit && validActions && (mode !== 'tick' || validLinear);
    async function save() {
        if (!valid || busy || !connected)
            return;
        setBusy(true);
        setMessage('');
        try {
            const linear = validLinear ? { animationTickSlope: Number(slope), animationTickIntercept: Number(intercept) } : {};
            const result = await request('config', { petId: snapshot?.pet.id, animationMode: mode, animationFps: Number(fps), animationRunFpsLimit: savedLimit, animationActionFps: savedActions, desktopEnabled: desktop, multiPetEnabled: multi, bubbleOnly, hoverPanelEnabled: hoverPanel, ...linear });
            if (result.ok !== true || result.display?.animationMode !== mode || result.display?.animationFps !== Number(fps)
                || result.display?.desktopEnabled !== desktop || result.display?.multiPetEnabled !== multi || result.display?.bubbleOnly !== bubbleOnly || result.display?.hoverPanelEnabled !== hoverPanel
                || result.display?.animationRunFpsLimit !== savedLimit || result.display?.animationActionFps !== savedActions
                || (validLinear && (result.display?.animationTickSlope !== Number(slope) || result.display?.animationTickIntercept !== Number(intercept))))
                throw new Error('设置未保存');
            setSlope(String(tickSlope(result.display.animationTickSlope)));
            setIntercept(String(tickIntercept(result.display.animationTickIntercept)));
            setMessage('已保存');
        }
        catch {
            setMessage('保存失败，设置保留，请重试。');
        }
        finally {
            setBusy(false);
        }
    }
    async function resetPosition() {
        const bridge = desktopConnection(snapshot?.desktop);
        if (!bridge || busy || !connected)
            return;
        setBusy(true);
        try {
            const result = await bridge.resetPosition();
            setMessage(result.active ? '宠物窗口已归位' : '请先保存并启用独立桌面宠物。');
        }
        catch {
            setMessage('归位失败，请重试。');
        }
        finally {
            setBusy(false);
        }
    }
    const rate = snapshot?.performance?.tokensPerSecond;
    const desktopStatus = snapshot?.desktop;
    async function retryDesktop() {
        if (busy || !connected)
            return;
        setBusy(true);
        try {
            await desktopRequest('retry');
            setMessage('正在重新准备独立窗口…');
        }
        catch {
            setMessage('重试失败，请稍后再试。');
        }
        finally {
            setBusy(false);
        }
    }
    return _jsxs("section", { "data-pet-controls": true, style: { padding: 16, border: '1px solid #7775', borderRadius: 12, display: 'grid', gap: 10, color: 'inherit', fontSize: 13 }, children: [_jsxs("strong", { children: [snapshot?.pet.displayName ?? '当前形象', " \u00B7 \u751F\u6210\u901F\u5EA6\u52A8\u753B"] }), serviceStatus !== 'ready' && _jsx("p", { role: "status", children: t(serviceStatus === 'authorization' ? 'settings.serviceAuthorization'
                    : serviceStatus === 'loading' ? 'settings.serviceLoading' : 'settings.serviceUnavailable') }), _jsxs("fieldset", { disabled: !connected || busy, style: { display: 'grid', gap: 10, border: 0, padding: 0, margin: 0, minWidth: 0 }, children: [_jsxs("label", { children: [_jsx("input", { "aria-label": "\u4EC5\u663E\u793A\u72B6\u6001\u6C14\u6CE1\uFF08\u65E0\u5BA0\u7269\u56FE\uFF09", type: "checkbox", checked: bubbleOnly, onChange: e => setBubbleOnly(e.target.checked) }), " \u4EC5\u663E\u793A\u72B6\u6001\u6C14\u6CE1\uFF08\u65E0\u5BA0\u7269\u56FE\uFF09"] }), _jsx("div", { style: { opacity: .8 }, children: "\u9690\u85CF\u5F62\u8C61\uFF0C\u4EC5\u4FDD\u7559\u53EF\u62D6\u52A8\u7684\u4EFB\u52A1\u72B6\u6001\u6C14\u6CE1\uFF1B\u7A7A\u95F2\u65F6\u5E38\u9A7B\u300C\u968F\u65F6\u5C31\u7EEA\u300D\u3002\u5DE6\u952E\u5524\u51FA DSH\uFF0C\u53F3\u952E\u629A\u6478\u5E76\u5C55\u5F00\u770B\u677F\u3002" }), _jsxs("label", { children: [_jsx("input", { "aria-label": "\u60AC\u505C\u5C55\u5F00\u770B\u677F", type: "checkbox", checked: hoverPanel, onChange: e => setHoverPanel(e.target.checked) }), " \u60AC\u505C\u5C55\u5F00\u770B\u677F"] }), _jsx("div", { style: { opacity: .8 }, children: "\u9ED8\u8BA4\u5173\u95ED\uFF0C\u9F20\u6807\u7ECF\u8FC7\u65F6\u4E0D\u5C55\u5F00\u8865\u5145\u80FD\u91CF\u3001\u547D\u540D\u548C\u9690\u85CF\u9762\u677F\u3002\u53F3\u952E\u629A\u6478\u5E76\u6253\u5F00\u770B\u677F\uFF1B\u5F00\u542F\u540E\u4E5F\u53EF\u60AC\u505C\u5C55\u5F00\u3002" }), _jsxs("label", { children: ["\u5DE6\u53F3\u8DD1\u52A8\u6A21\u5F0F ", _jsxs("select", { "aria-label": "\u64AD\u653E\u6A21\u5F0F", value: mode, onChange: e => setMode(e.target.value), children: [_jsx("option", { value: "fixed", children: "\u56FA\u5B9A FPS" }), _jsx("option", { value: "native", children: "\u7D20\u6750\u539F\u901F" }), _jsx("option", { value: "tick", children: "Tick \u00B7 \u8DDF\u968F\u5E95\u90E8 tok/s" })] })] }), _jsxs("label", { children: [mode === 'tick' ? '无统计数据时的 FPS' : '左右跑动 FPS', " ", _jsx("input", { "aria-label": "\u52A8\u753B FPS", type: "number", min: "1", step: "any", value: fps, disabled: mode === 'native', onChange: e => setFps(e.target.value), style: { width: 88 } })] }), !validFps && _jsx("div", { role: "alert", children: "\u5E27\u7387\u9700\u4E3A\u4E0D\u5C0F\u4E8E 1 \u7684\u6709\u6548\u6570\u5B57\uFF1B\u5F53\u524D\u8F93\u5165\u5C1A\u672A\u63D0\u4EA4\u4FDD\u5B58\u3002" }), _jsx("div", { style: { opacity: .8, lineHeight: 1.6 }, children: "\u601D\u8003\u3001\u56DE\u7B54\u53CA\u5176\u4ED6\u5DE5\u5177\u53C2\u6570\u751F\u6210\u5411\u53F3\u8DD1\uFF1B\u5199\u6587\u4EF6\u3001\u7F16\u8F91\u548C\u8865\u4E01\u5185\u5BB9\u751F\u6210\u5411\u5DE6\u8DD1\u3002\u5DE6\u53F3\u8DD1\u52A8\u9ED8\u8BA4\u4E0D\u8BBE\u4E0A\u9650\uFF0C\u6240\u6709\u5F62\u8C61\u4F7F\u7528\u540C\u4E00\u89C4\u5219\u3002" }), _jsxs("label", { children: [_jsx("input", { "aria-label": "\u9650\u5236\u5DE6\u53F3\u8DD1\u52A8\u5E27\u7387", type: "checkbox", checked: limitRunning, onChange: e => setLimitRunning(e.target.checked) }), " \u9650\u5236\u5DE6\u53F3\u8DD1\u52A8\u5E27\u7387"] }), limitRunning && _jsxs("label", { children: ["\u5DE6\u53F3\u8DD1\u52A8\u6700\u9AD8 FPS ", _jsx("input", { "aria-label": "\u5DE6\u53F3\u8DD1\u52A8\u6700\u9AD8 FPS", type: "number", min: "1", step: "any", value: runLimit, onChange: e => setRunLimit(e.target.value), style: { width: 88 } })] }), !validLimit && _jsx("div", { role: "alert", children: "\u5DE6\u53F3\u8DD1\u52A8\u4E0A\u9650\u9700\u4E3A\u4E0D\u5C0F\u4E8E 1 \u7684\u6709\u6548\u6570\u5B57\u3002" }), snapshot?.pet.id === 'blue-whale-business' && _jsx("div", { style: { opacity: .8 }, children: "\u5546\u52A1\u5C0F\u84DD\u9CB8\u7684\u5F62\u8C61\u548C\u5360\u4F4D\u5E95\u677F\u7EDF\u4E00\u4E3A\u8BBE\u5B9A\u5927\u5C0F\u7684 75%\uFF0C\u4E3B\u5BA0\u7269\u4E0E\u540E\u53F0\u5C0F\u5BA0\u7269\u5747\u751F\u6548\u3002" }), mode === 'tick' && _jsxs(_Fragment, { children: [_jsxs("div", { children: ["FPS = k \u00D7 \u5E95\u90E8 tok/s + b\uFF1B", limitRunning ? `上限由你设为 ${runLimit} FPS。` : '未设置上限。'] }), _jsxs("label", { children: ["\u659C\u7387 k ", _jsx("input", { "aria-label": "\u659C\u7387 k", type: "number", min: MIN_TICK_SLOPE, max: MAX_TICK_SLOPE, step: "any", value: slope, onChange: e => setSlope(e.target.value), style: { width: 180 } })] }), _jsxs("label", { children: ["\u622A\u8DDD b\uFF08FPS\uFF09 ", _jsx("input", { "aria-label": "\u622A\u8DDD b", type: "number", min: MIN_TICK_INTERCEPT, max: MAX_TICK_INTERCEPT, step: "any", value: intercept, onChange: e => setIntercept(e.target.value), style: { width: 96 } })] }), _jsx("div", { style: { opacity: .8, lineHeight: 1.6 }, children: "k \u63A7\u5236\u901F\u5EA6\u6BCF\u589E\u52A0 1 tok/s \u65F6\u589E\u52A0\u591A\u5C11 FPS\uFF1Bb \u63A7\u5236\u8D77\u59CB\u5E27\u7387\u3002\u8DDF\u968F\u5F53\u524D\u4F1A\u8BDD\u5E95\u680F\u7EDF\u8BA1\uFF0C\u6B65\u9AA4\u5B8C\u6210\u540E\u66F4\u65B0\u3002" }), !validLinear && _jsxs("div", { role: "alert", children: ["k \u9700\u5728 ", MIN_TICK_SLOPE, "\u2013", MAX_TICK_SLOPE, " \u4E4B\u95F4\uFF0Cb \u9700\u5728 ", MIN_TICK_INTERCEPT, "\u2013", MAX_TICK_INTERCEPT, " \u4E4B\u95F4\u3002"] }), validLinear && validLimit && validFps && _jsx("div", { children: rate === undefined ? `底栏暂无速度，使用备用 ${effectiveFps({ animationFps: Number(fps), animationRunFpsLimit: savedLimit })} FPS` : `预览：${rate} tok/s → ${effectiveFps({ animationMode: 'tick', animationTickSlope: Number(slope), animationTickIntercept: Number(intercept), animationRunFpsLimit: savedLimit }, rate)?.toFixed(1)} FPS` })] }), _jsxs("label", { children: [_jsx("input", { "aria-label": "\u81EA\u8BBE\u5176\u4ED6\u52A8\u4F5C\u901F\u7387", type: "checkbox", checked: customActions, onChange: e => setCustomActions(e.target.checked) }), " \u81EA\u8BBE\u5176\u4ED6\u52A8\u4F5C\u901F\u7387"] }), customActions && _jsxs("label", { children: ["\u5176\u4ED6\u52A8\u4F5C FPS ", _jsx("input", { "aria-label": "\u5176\u4ED6\u52A8\u4F5C FPS", type: "number", min: "1", step: "any", value: actionFps, onChange: e => setActionFps(e.target.value), style: { width: 88 } })] }), _jsx("div", { style: { opacity: .8 }, children: "\u7528\u4E8E\u5F85\u673A\u3001\u6325\u624B\u3001\u5582\u98DF\u7B49\u975E\u5DE6\u53F3\u8DD1\u52A8\u52A8\u4F5C\uFF0C\u4E0E tok/s \u65E0\u5173\u3002\u53EF\u4EE5\u81EA\u884C\u586B\u5199 FPS\uFF0C\u4E0D\u8BBE 12 \u6216 60 FPS \u4E0A\u9650\uFF1B\u5173\u95ED\u65F6\u4FDD\u7559\u7D20\u6750\u539F\u901F\u3002" }), !validActions && _jsx("div", { role: "alert", children: "\u5176\u4ED6\u52A8\u4F5C\u5E27\u7387\u9700\u4E3A\u4E0D\u5C0F\u4E8E 1 \u7684\u6709\u6548\u6570\u5B57\u3002" }), _jsxs("label", { children: [_jsx("input", { "aria-label": "\u591A\u5BA0\u7269\u6A21\u5F0F", type: "checkbox", checked: multi, onChange: e => setMulti(e.target.checked) }), " \u591A\u5BA0\u7269\u6A21\u5F0F"] }), _jsx("div", { style: { opacity: .8, lineHeight: 1.6 }, children: multi
                            ? bubbleOnly ? '活跃对话各显示一个状态气泡，分别跟随所属任务。左键点气泡唤出 DSH 并查看对应对话；查看后切到其他对话时回收。' : '活跃对话各一只，分别跟随自己的 tok/s；主对话保持原大小，其余为 52.7% 且不弹气泡。新建、尺寸切换或拖动结束时自动避让。后台对话结束后，小宠物保留等待查看；点开对话或单击小宠物即可查看并变为主宠物，不需要输入文字。查看后切到其他对话时回收。'
                            : '仅一只默认 DS 蓝色宠物，动作、气泡和 tok/s 随主窗口当前对话切换。' }), _jsx("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 12 }, children: [['#c7edcc', 'GPT · 豆沙绿'], ['#d97941', 'Claude · 橙'], ['#24262d', 'Kimi · 黑'], ['#570763', 'GLM · 暗清华紫'], ['#6c9cda', 'DS · 原色']].map(([color, label]) => _jsxs("span", { children: [_jsx("i", { style: { display: 'inline-block', width: 12, height: 12, borderRadius: '50%', background: color, border: '1px solid #888', marginRight: 4 } }), label] }, label)) }), _jsx("div", { style: { opacity: .8 }, children: "\u4F18\u5148\u4F7F\u7528\u6A21\u578B\u5BF9\u5E94\u8272\uFF1B\u5DF2\u5360\u7528\u65F6\u5148\u5206\u914D\u7A7A\u95F2\u8272\uFF0C\u7B2C\u516D\u53EA\u8D77\u968F\u673A\u5206\u914D\u5E76\u5C3D\u91CF\u62C9\u5F00\u8272\u5DEE\u3002\u5173\u95ED\u591A\u5BA0\u7269\u6A21\u5F0F\u4E0D\u4F1A\u6E05\u9664\u5DF2\u5206\u914D\u989C\u8272\u3002" }), _jsx("div", { style: { opacity: .8, lineHeight: 1.6 }, children: "\u6240\u6709\u5BA0\u7269\u5171\u4EAB\u7D2F\u8BA1\uFF1A\u5582\u98DF\u6B21\u6570\u3001\u4EB2\u5BC6\u5EA6\u548C\u5C0F\u9C7C\u5E72\u7EDF\u4E00\u8BB0\u5F55\u3002\u5404\u5BF9\u8BDD\u7684\u5B8C\u6210\u5956\u52B1\u6C47\u5165\u540C\u4E00\u4EFD\u8BB0\u5F55\uFF0C\u5207\u6362\u5BF9\u8BDD\u3001\u5F00\u5173\u591A\u5BA0\u7269\u6216\u91CD\u542F\u90FD\u4E0D\u4F1A\u62C6\u5206\u6216\u91CD\u7F6E\u3002" }), _jsxs("label", { children: [_jsx("input", { type: "checkbox", checked: desktop, onChange: e => setDesktop(e.target.checked) }), " \u72EC\u7ACB\u684C\u9762\u5BA0\u7269"] }), _jsx("div", { style: { opacity: .8 }, children: "\u4E3B\u7A97\u53E3\u9690\u85CF\u6216\u6700\u5C0F\u5316\u540E\u7EE7\u7EED\u663E\u793A\uFF1B\u9000\u51FA DSH \u540E\u5173\u95ED\u3002" }), desktopStatus?.supported && _jsxs("div", { "data-pet-desktop-status": desktopStatus.state, children: [desktopStatus.state === 'starting' ? '正在首次准备独立窗口，请稍候…'
                                : desktopStatus.state === 'error' ? desktopStatus.message ?? '独立窗口暂不可用，请重试。'
                                    : desktopStatus.active ? `独立窗口已运行 · ${desktopStatus.version}` : '独立窗口已随插件集成，保存并启用后自动显示。', desktopStatus.state === 'error' && _jsx("button", { type: "button", disabled: busy, onClick: () => void retryDesktop(), children: "\u91CD\u8BD5\u72EC\u7ACB\u7A97\u53E3" })] }), (desktopStatus?.supported || window.dshPetDesktop) && _jsx("div", { children: _jsx("button", { type: "button", onClick: () => void resetPosition(), disabled: busy, children: "\u5BA0\u7269\u7A97\u53E3\u5F52\u4F4D" }) }), desktopStatus && !desktopStatus.supported && !window.dshPetDesktop && _jsx("div", { children: "\u72EC\u7ACB\u7A97\u53E3\u652F\u6301 Windows \u539F\u751F DSH\uFF1B\u5F53\u524D\u73AF\u5883\u4F7F\u7528\u5E94\u7528\u5185\u5BA0\u7269\u3002" }), _jsxs("div", { children: [_jsx("button", { type: "button", onClick: () => void save(), disabled: busy || !valid || !connected, children: busy ? '保存中…' : '保存动画设置' }), " ", _jsx("span", { role: "status", children: message })] })] })] });
}
