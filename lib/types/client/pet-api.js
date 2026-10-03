export class PetApiError extends Error {
    status;
    constructor(status) {
        super('Pet service HTTP ' + status);
        this.status = status;
    }
}
/** Bound each request so a stalled connection cannot stop automatic recovery. */
export async function petJson(path, init) {
    const response = await fetch(path, { signal: AbortSignal.timeout(10000), ...init });
    if (!response.ok)
        throw new PetApiError(response.status);
    return await response.json();
}
export function petServiceFailure(error) {
    return error instanceof PetApiError && (error.status === 401 || error.status === 403)
        ? 'authorization' : 'unavailable';
}
