type Bridge = Pick<NonNullable<Window['dshPetOverlay']>, 'interactive'>;
/** Native hit testing uses screen coordinates; DOM leave/focus events are only hints. */
export declare function installDesktopHitTesting(bridge: Bridge): () => void;
export {};
//# sourceMappingURL=desktop-hit-test.d.ts.map