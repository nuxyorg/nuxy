import type { ExtensionManifest } from '@nuxy/core'
import type { TranslateFn } from './shell-i18n.ts'

export type ToolOnCompleteBehavior = 'stay' | 'returnToShell' | 'hide' | 'returnToShellAndHide'

export function getToolOnComplete(manifest: ExtensionManifest): ToolOnCompleteBehavior {
  return manifest.behavior?.onComplete ?? 'stay'
}

export function shouldSuppressBlurHide(manifest: ExtensionManifest): boolean {
  return manifest.behavior?.suppressBlurHide === true
}

/** Sync kernel blur-hide suppression for the active tool (manifest-driven). */
export function syncBlurSuppression(
  toolId: string | null,
  manifest: ExtensionManifest | null | undefined
): void {
  const suppress = Boolean(toolId && manifest && shouldSuppressBlurHide(manifest))
  window.core?.window?.setBlurSuppressed?.(suppress)
}

/** Set omnibar placeholder for the active tool from its locale file. */
export function setToolSearchPlaceholder(t: TranslateFn, key: string): void {
  const translated = t(key)
  if (!translated || translated === key) return
  window.core?.shell?.setSearchPlaceholder(translated)
}

/** Run the manifest-declared completion behavior after a tool primary action. */
export function completeToolAction(manifest: ExtensionManifest): void {
  switch (getToolOnComplete(manifest)) {
    case 'returnToShell':
      window.core?.shell?.returnToShell?.()
      break
    case 'hide':
      window.core?.window?.hide?.()
      break
    case 'returnToShellAndHide':
      window.core?.shell?.returnToShell?.()
      setTimeout(() => window.core?.window?.hide?.(), 150)
      break
  }
}
