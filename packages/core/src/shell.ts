import type { QueryType } from './query-context.js'

/**
 * A single action an extension exposes to the shell. The `hint` field controls
 * footer-chip visibility, `showInMenu` controls Ctrl+K palette visibility — an
 * action can opt into either, both, or neither (e.g. a pure background key
 * binding). One `handler` serves both the keypress and the palette select.
 */
export interface ShellAction {
  /** Required when `showInMenu` is true (palette dedupe/keying). */
  id?: string
  key?: string
  modifiers?: ('ctrl' | 'shift' | 'alt' | 'meta')[]
  label: string
  /** Footer chip text. Presence of this field makes the action show up in the footer. */
  hint?: string | string[]
  /**
   * When false, the footer chip is display-only (no click handler). Display
   * groups (`children` without a parent `handler`) are non-clickable by default.
   */
  clickable?: boolean
  /** Ctrl+K palette divider grouping. */
  section?: string
  /** Makes the action show up in the Ctrl+K palette. */
  showInMenu?: boolean
  /**
   * Query types for which this action should be boosted to the top of the
   * tool-actions list. The shell reorders actions at render time based on the
   * current QueryContext — no polling or manual refresh needed.
   */
  relevantFor?: QueryType[]
  activeOn?: () => boolean
  /** Omit on display groups; keyboard bindings live in `children`. */
  handler?: () => void
  allowRepeat?: boolean
  trigger?: 'press' | 'hold'
  /** Shown when a hold action is released before it completes. */
  holdCancelToast?: string
  children?: ShellAction[]
}

export interface ShellBridgeSnapshot {
  /** Ctrl+K palette actions: `showInMenu` actions, filtered by `activeOn`. */
  toolActions: ShellAction[]
  /** Footer chip actions: actions with a `hint`, filtered by `activeOn`. */
  keyActionHints: ShellAction[]
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

  registerShellActions(getter: (() => ShellAction[]) | null): void
  refreshShellActions(): void

  setOmniBarPortal(element: HTMLElement | null): void
  setFooterPortal(element: HTMLElement | null): void
  /** Override omnibar placeholder while this tool is active. Pass null to clear. */
  setSearchPlaceholder(placeholder: string | null): void

  /** Used by shell keyboard routing — not for extension authors. */
  getShellActionsGetter(): (() => ShellAction[]) | null

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
