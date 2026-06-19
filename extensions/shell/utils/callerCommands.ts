import type { CommandPaletteAction, Tool } from '../types.ts'

/**
 * Builds Ctrl+K palette entries from the active tool's
 * `manifest.caller.commands` (see `ExtensionCallerConfig` in `@nuxyorg/core`).
 * Unlike `bridge.toolActions` (registered per-active-tool via
 * `core.shell.registerActions`), these are declared in the manifest and
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
): CommandPaletteAction[] {
  if (!activeToolId) return []

  const actions: CommandPaletteAction[] = []

  for (const tool of tools) {
    if (tool.id !== activeToolId) continue
    const commands = tool.manifest.caller?.commands
    if (!commands?.length) continue

    commands.forEach((cmd, index) => {
      if (!cmd.label || !cmd.deeplink) return
      actions.push({
        id: `caller:${tool.id}:${index}`,
        label: cmd.label,
        ...(cmd.section ? { section: cmd.section } : {}),
        onExecute: () => {
          void window.core?.deeplink?.dispatch?.(cmd.deeplink)
        },
      })
    })
  }

  return actions
}

/**
 * Merges tool-scoped bridge actions (`bridge.toolActions`) with global
 * `caller.commands` actions for display in the Ctrl+K palette. Tool-scoped
 * actions are listed first and win on id collisions (defensive — ids are
 * namespaced differently by convention, so collisions are not expected in
 * practice).
 */
export function mergeCommandPaletteActions(
  toolActions: CommandPaletteAction[],
  callerActions: CommandPaletteAction[]
): CommandPaletteAction[] {
  if (callerActions.length === 0) return toolActions
  const seenIds = new Set(toolActions.map((a) => a.id))
  const extra = callerActions.filter((a) => !seenIds.has(a.id))
  return [...toolActions, ...extra]
}
