export interface ShellKeyAction {
  key: string
  modifiers?: ('ctrl' | 'shift' | 'alt' | 'meta')[]
  label: string
  hint?: string | string[]
  activeOn?: () => boolean
  handler: () => void
  allowRepeat?: boolean
  trigger?: 'press' | 'hold'
  holdMs?: number
}

export interface ShellCommandAction {
  id: string
  label: string
  onExecute?: () => void
  children?: ShellCommandAction[]
}

export interface ShellBridgeSnapshot {
  toolActions: ShellCommandAction[]
  keyActionHints: ShellKeyAction[]
  omniBarPortal: HTMLElement | null
  footerPortal: HTMLElement | null
}

export type OmniBarControlAction = 'show' | 'hide' | 'clear'

/** Renderer-side shell integration API (preload). */
export interface CoreShell {
  subscribe(listener: () => void): () => void
  getSnapshot(): ShellBridgeSnapshot

  registerKeyActions(getter: (() => ShellKeyAction[]) | null): void
  refreshKeyHints(): void
  registerActions(actions: ShellCommandAction[]): void

  setOmniBarPortal(element: HTMLElement | null): void
  setFooterPortal(element: HTMLElement | null): void

  /** Used by shell keyboard routing — not for extension authors. */
  getKeyActionsGetter(): (() => ShellKeyAction[]) | null
  getToolActions(): ShellCommandAction[]

  controlOmniBar(action: OmniBarControlAction): void
  subscribeOmniBarControl(handler: (action: OmniBarControlAction) => void): () => void

  /** Clears tool-scoped registrations (active tool changed or shell reset). */
  resetToolState(): void
}
