import { numberField } from "./settings-form.js";
import { BUBBLE_SCALE_MIN, BUBBLE_SCALE_MAX, BUBBLE_SCALE_STEP, DISPLAY_SIZE_MIN, DISPLAY_SIZE_MAX, DISPLAY_INSET_MAX } from "../persist.js";
/** Pet-specific bounds, layered over the shared staged-form parser. */
export function petNumberField(field) {
    const bubble = field === 'bubbleScale';
    const min = bubble ? BUBBLE_SCALE_MIN : field === 'size' ? DISPLAY_SIZE_MIN : 0;
    const max = bubble ? BUBBLE_SCALE_MAX : field === 'size' ? DISPLAY_SIZE_MAX : DISPLAY_INSET_MAX;
    const spec = numberField(field, { min, integer: !bubble });
    return { ...spec, parse(text) {
            const value = spec.parse(text);
            if (value?.kind === 'set' && value.value > max)
                return undefined;
            if (value?.kind === 'set' && bubble) {
                const steps = value.value / BUBBLE_SCALE_STEP;
                if (Math.abs(steps - Math.round(steps)) > 1e-8)
                    return undefined;
            }
            return value;
        } };
}
