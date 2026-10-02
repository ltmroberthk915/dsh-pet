import type { DesktopStatus } from '../desktop-status.ts';
export declare function desktopRequest<T = DesktopStatus>(action: string, body?: unknown): Promise<T>;
export declare function desktopConnection(status?: DesktopStatus): Pick<NonNullable<Window['dshPetDesktop']>, 'configure' | 'resetPosition'> | undefined;
//# sourceMappingURL=desktop-connection.d.ts.map