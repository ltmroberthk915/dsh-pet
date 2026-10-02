/** Public status contains no port, credential, executable or filesystem path. */
export interface DesktopStatus {
    supported: boolean;
    state: 'unavailable' | 'idle' | 'starting' | 'ready' | 'error';
    active: boolean;
    version: string;
    message?: string;
    pendingOpen?: {
        revision: number;
        sessionId: string;
    };
}
export interface DesktopCompanion {
    status(): DesktopStatus;
    configure(options: {
        enabled: boolean;
        currentSessionId?: string;
    }): DesktopStatus;
    resetPosition(): DesktopStatus;
    retry(): DesktopStatus;
    acknowledge(revision: unknown): {
        ok: true;
    };
    dispose(): void;
}
//# sourceMappingURL=desktop-status.d.ts.map