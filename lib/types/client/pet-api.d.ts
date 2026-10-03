/** Shared error classification for the pet's same-origin service. */
export type PetServiceStatus = 'loading' | 'ready' | 'authorization' | 'unavailable';
export declare class PetApiError extends Error {
    readonly status: number;
    constructor(status: number);
}
/** Bound each request so a stalled connection cannot stop automatic recovery. */
export declare function petJson<T>(path: string, init?: RequestInit): Promise<T>;
export declare function petServiceFailure(error: unknown): PetServiceStatus;
//# sourceMappingURL=pet-api.d.ts.map