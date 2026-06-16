import type { ExtensionManifest } from '@nuxyorg/core'
import type { TranslateFn } from './frontend-i18n'

export type ToolOnCompleteBehavior = 'stay' | 'returnToShell' | 'hide' | 'returnToShellAndHide'

export function getToolOnComplete(manifest: ExtensionManifest): ToolOnCompleteBehavior {
  return manifest.behavior?.onComplete ?? 'stay'
}

export function shouldSuppressBlurHide(manifest: ExtensionManifest): boolean {
  return manifest.behavior?.suppressBlurHide === true
}

export function syncBlurSuppression(
  toolId: string | null,
  manifest: ExtensionManifest | null | undefined
): void {
  const suppress = Boolean(toolId && manifest && shouldSuppressBlurHide(manifest))
  window.core?.window?.setBlurSuppressed?.(suppress)
}

export function setToolSearchPlaceholder(t: TranslateFn, key: string): void {
  const translated = t(key)
  if (!translated || translated === key) return
  window.core?.shell?.setSearchPlaceholder(translated)
}

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
