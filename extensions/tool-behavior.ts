import type { ExtensionManifest } from '@nuxy/core'

export type ToolOnCompleteBehavior = 'stay' | 'returnToShell' | 'hide' | 'returnToShellAndHide'

export function getToolOnComplete(manifest: ExtensionManifest): ToolOnCompleteBehavior {
  return manifest.behavior?.onComplete ?? 'stay'
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
