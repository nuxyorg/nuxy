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
  /** Shown when a hold action is released before it completes. */
  holdCancelToast?: string
}

export interface ShellCommandAction {
  id: string
  label: string
  /**
   * Query types for which this action should be boosted to the top of the
   * tool-actions list. The shell reorders actions at render time based on the
   * current QueryContext — no polling or manual refresh needed.
   */
  relevantFor?: import('./query-context.js').QueryType[]
  onExecute?: () => void
  children?: ShellCommandAction[]
}

export interface ShellBridgeSnapshot {
  toolActions: ShellCommandAction[]
  keyActionHints: ShellKeyAction[]
  omniBarPortal: HTMLElement | null
  footerPortal: HTMLElement | null
  /** Omnibar placeholder set by the active tool at runtime. */
  searchPlaceholder: string | null
}

export type OmniBarControlAction = 'show' | 'hide' | 'clear'

export interface ResetToolStateOptions {
  /** When false, keep the current omnibar placeholder (tool-to-tool switch). Default true. */
  clearSearchPlaceholder?: boolean
}

/** Renderer-side shell integration API (preload). */
export interface CoreShell {
  subscribe(listener: () => void): () => void
  getSnapshot(): ShellBridgeSnapshot

  registerKeyActions(getter: (() => ShellKeyAction[]) | null): void
  refreshKeyHints(): void
  registerActions(actions: ShellCommandAction[]): void

  setOmniBarPortal(element: HTMLElement | null): void
  setFooterPortal(element: HTMLElement | null): void
  /** Override omnibar placeholder while this tool is active. Pass null to clear. */
  setSearchPlaceholder(placeholder: string | null): void

  /** Used by shell keyboard routing — not for extension authors. */
  getKeyActionsGetter(): (() => ShellKeyAction[]) | null
  getToolActions(): ShellCommandAction[]

  controlOmniBar(action: OmniBarControlAction): void
  subscribeOmniBarControl(handler: (action: OmniBarControlAction) => void): () => void

  /** Clears tool-scoped registrations (active tool changed or shell reset). */
  resetToolState(options?: ResetToolStateOptions): void

  /** Deactivate the active tool and clear omnibar query — returns to the main shell screen. */
  returnToShell(): void

  /** @internal Registered by the shell extension during bootstrap. */
  bindReturnToShell(handler: () => void): () => void

  /**
   * When true, `shell-reset` (e.g. on window show) skips deactivating the active tool.
   * Tools use this while a sub-mode must survive focus-out (e.g. notes edit mode).
   */
  setShellResetPaused(paused: boolean): void
  isShellResetPaused(): boolean
}
