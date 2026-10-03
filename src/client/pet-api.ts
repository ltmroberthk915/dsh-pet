/** Shared error classification for the pet's same-origin service. */
export type PetServiceStatus = 'loading' | 'ready' | 'authorization' | 'unavailable'

export class PetApiError extends Error {
  constructor(readonly status: number) { super('Pet service HTTP ' + status) }
}

/** Bound each request so a stalled connection cannot stop automatic recovery. */
export async function petJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, { signal: AbortSignal.timeout(10000), ...init })
  if (!response.ok) throw new PetApiError(response.status)
  return await response.json() as T
}

export function petServiceFailure(error: unknown): PetServiceStatus {
  return error instanceof PetApiError && (error.status === 401 || error.status === 403)
    ? 'authorization' : 'unavailable'
}
