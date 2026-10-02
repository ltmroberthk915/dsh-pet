import type { WebRoute } from '@deepseek-ai/dsh-host-webserver';
import type { DesktopCompanion } from './desktop-status.ts';
/** Only the native Windows Host can identify its own Electron executable. */
export declare function createDesktopCompanion(options: {
    routes(): WebRoute[];
    enabled(): boolean;
}): DesktopCompanion;
//# sourceMappingURL=desktop-companion.d.ts.map