export {}
declare global {
  interface Window {
    dshPetDesktop?: {
      configure(options: { enabled: boolean; currentSessionId?: string }): Promise<{ active: boolean }>
      state(currentSessionId?: string): Promise<import('../service.ts').PetStateView>
      resetPosition(): Promise<{ active: boolean }>
    }
    dshPetOverlay?: {
      call(action: string, body?: unknown): Promise<any>
      drag(phase: 'start' | 'move' | 'end'): void
      interactive(value: boolean): void
      openMain(sessionId?: string): Promise<void>
      subscribe(update: (state: import('../service.ts').PetStateView) => void, disconnected: () => void, retire: () => void): () => void
    }
  }
}
