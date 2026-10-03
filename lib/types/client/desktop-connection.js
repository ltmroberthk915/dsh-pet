export async function desktopRequest(action, body = {}) {
    const response = await fetch('/api/pet/desktop/' + action, {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    if (!response.ok)
        throw new Error('Desktop request failed: ' + response.status);
    return response.json();
}
/** Disable the legacy host renderer before the package-owned window takes over. */
let legacyStop;
export function desktopConnection(status) {
    if (!status?.supported)
        return window.dshPetDesktop;
    return {
        async configure(options) {
            legacyStop ??= window.dshPetDesktop?.configure({ enabled: false }) ?? Promise.resolve();
            try {
                await legacyStop;
            }
            catch {
                legacyStop = undefined;
            }
            return desktopRequest('configure', options);
        },
        resetPosition: () => desktopRequest('reset'),
    };
}
