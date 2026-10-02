import type { DesktopStatus } from '../desktop-status.ts'

export async function desktopRequest<T = DesktopStatus>(action: string, body: unknown = {}): Promise<T> {
  const response = await fetch('/api/pet/desktop/' + action, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  })
  if (!response.ok) throw new Error('Desktop request failed: ' + response.status)
  return response.json() as Promise<T>
}

/** Disable the legacy host renderer before the package-owned window takes over. */
let legacyStop: Promise<unknown> | undefined
export function desktopConnection(status?: DesktopStatus): Pick<NonNullable<Window['dshPetDesktop']>, 'configure' | 'resetPosition'> | undefined {
  if (!status?.supported) return window.dshPetDesktop
  return {
    async configure(options) {
      legacyStop ??= window.dshPetDesktop?.configure({ enabled: false }) ?? Promise.resolve()
      try { await legacyStop } catch { legacyStop = undefined }
      return desktopRequest('configure', options)
    },
    resetPosition: () => desktopRequest('reset'),
  }
}
