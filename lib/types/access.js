import { isPairedOrLoopbackAllowed } from "./pair-access.js";
/**
 * Whether this request may enter any /api/pet or /pet asset route.
 * @param ctx - host context; may expose remoteWebUiPairing.
 * @param request - the incoming HTTP request.
 * @returns true for loopback, or a live paired-device cookie.
 */
export function isPetAllowed(ctx, request) {
    // Pairing grants authentication, never permission to bypass same-origin checks.
    if (request.headers['sec-fetch-site'] === 'cross-site' || request.headers['sec-fetch-site'] === 'same-site')
        return false;
    const origin = request.headers.origin;
    if (origin !== undefined) {
        try {
            const parsed = new URL(origin);
            if (!['http:', 'https:'].includes(parsed.protocol) || parsed.host !== request.headers.host)
                return false;
        }
        catch {
            return false;
        }
    }
    return isPairedOrLoopbackAllowed(ctx, request);
}
