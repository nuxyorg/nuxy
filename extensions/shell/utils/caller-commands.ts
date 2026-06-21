import type { ShellAction } from '@nuxyorg/core'
import type { Tool } from '../types.ts'

/**
 * Builds Ctrl+K palette entries from the active tool's
 * `manifest.caller.commands` (see `ExtensionCallerConfig` in `@nuxyorg/core`).
 * Unlike `bridge.toolActions` (registered per-active-tool via
 * `core.shell.registerShellActions`), these are declared in the manifest and
 * scoped to the owning extension — only visible while that tool is active.
 *
 * Selecting one dispatches its `deeplink` URL through
 * `window.core.deeplink.dispatch`, which reuses the exact same
 * `handleDeeplinkUrl` main-process path as any externally-delivered
 * `nuxy://...` URL (OS protocol handler, cold start, control socket) — no
 * separate routing logic.
 */
export function buildCallerCommandActions(
  tools: Tool[],
  activeToolId: string | null
): ShellAction[] {
  if (!activeToolId) return []

  const actions: ShellAction[] = []

  for (const tool of tools) {
    if (tool.id !== activeToolId) continue
    const commands = tool.manifest.caller?.commands
    if (!commands?.length) continue

    commands.forEach((cmd, index) => {
      if (!cmd.label || !cmd.deeplink) return
      actions.push({
        id: `caller:${tool.id}:${index}`,
        label: cmd.label,
        showInMenu: true,
        ...(cmd.section ? { section: cmd.section } : {}),
        handler: () => {
          void window.core?.deeplink?.dispatch?.(cmd.deeplink)
        },
      })
    })
  }

  return actions
}

/**
 * Synthesizes a Ctrl+K "open settings" entry for the active tool when its
 * manifest declares `entry.settings` — extensions get this for free, no
 * `caller.commands` boilerplate needed. Bound to the real `Ctrl+.` shortcut
 * (see `keyboard-controller.ts`), so the palette shows the actual key instead
 * of a generic hint.
 */
export function buildAutoSettingsAction(
  tools: Tool[],
  activeToolId: string | null,
  t: (key: string) => string
): ShellAction[] {
  if (!activeToolId) return []
  const tool = tools.find((tl) => tl.id === activeToolId)
  if (!tool?.manifest.entry?.settings) return []

  const settingsDeeplink = `nuxy://settings/extension/${activeToolId}`
  const hasManualEntry = tool.manifest.caller?.commands?.some(
    (cmd) => cmd.deeplink === settingsDeeplink
  )
  if (hasManualEntry) return []

  return [
    {
      id: 'auto-settings',
      label: t('commandPalette.openSettings'),
      hint: ['⌃', '.'],
      section: 'settings',
      showInMenu: true,
      handler: () => {
        void window.core?.deeplink?.dispatch?.(settingsDeeplink)
      },
    },
  ]
}

/**
 * Merges tool-scoped bridge actions (`bridge.toolActions`) with global
 * `caller.commands` actions for display in the Ctrl+K palette. Tool-scoped
 * actions are listed first and win on id collisions (defensive — ids are
 * namespaced differently by convention, so collisions are not expected in
 * practice).
 */
export function mergeCommandPaletteActions(
  toolActions: ShellAction[],
  callerActions: ShellAction[]
): ShellAction[] {
  if (callerActions.length === 0) return toolActions
  const seenIds = new Set(toolActions.map((a) => a.id))
  const extra = callerActions.filter((a) => !seenIds.has(a.id))
  return [...toolActions, ...extra]
}
