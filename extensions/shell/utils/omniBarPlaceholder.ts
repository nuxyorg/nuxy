import type { ShellBridgeSnapshot } from '@nuxyorg/core'
import type { TranslateFn } from '../../shell-i18n.ts'

export function resolveOmniBarPlaceholder(
  bridge: ShellBridgeSnapshot,
  activeToolName: string | null,
  activeToolPlaceholder: string | null,
  t: TranslateFn
): string {
  const toolSearchPlaceholder = bridge.searchPlaceholder ?? activeToolPlaceholder
  if (toolSearchPlaceholder) return toolSearchPlaceholder
  if (activeToolName) return t('omniBar.searchTool', { toolName: activeToolName })
  return t('omniBar.placeholder')
}
