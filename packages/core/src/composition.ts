import type { ExtensionManifest } from './types.js'

export interface CompositionSlotDeclaration {
  /** Stable slot name, e.g. "background-layer" */
  name: string
  description?: string
  /** Maximum number of mounted elements (default: 1) */
  maxMounts?: number
}

export interface CompositionMountOptions {
  /** Extension id making the claim — validated by kernel before mount. */
  extId: string
  state?: Record<string, unknown>
}

export interface CompositionHandle {
  setState(state: Record<string, unknown>): void
  release(): void
}

/** Renderer-side composition registry (preload). Worker extensions do not receive this. */
export interface CoreComposition {
  declareSlots(slots: CompositionSlotDeclaration[]): void
  mount(
    slotName: string,
    element: HTMLElement,
    opts?: CompositionMountOptions
  ): Promise<CompositionHandle>
  setState(slotName: string, state: Record<string, unknown>): void
  onStateChange(
    slotName: string,
    handler: (state: Record<string, unknown>) => void
  ): () => void
}

export interface ToolActivateContext {
  extensionId: string
  query: string
  composition: Pick<CoreComposition, 'mount' | 'setState'>
}

/** Contract for Lit (or native) tool custom elements mounted by nuxy-tool-host. */
export interface NuxyToolElement extends HTMLElement {
  query: string
  committedQuery: string
  extensionId: string
  onToolActivate?(ctx: ToolActivateContext): void | Promise<void>
  onToolDeactivate?(): void
}

const CUSTOM_ELEMENT_TAG = /^[a-z][a-z0-9]*(-[a-z0-9]+)+$/

/** Read manifest.entry.element when present and syntactically valid. */
export function resolveToolElementTag(manifest: ExtensionManifest): string | null {
  const tag = manifest.entry?.element
  if (!tag || typeof tag !== 'string') return null
  if (!CUSTOM_ELEMENT_TAG.test(tag)) return null
  return tag
}

export function listCompositionProvides(manifest: ExtensionManifest): CompositionSlotDeclaration[] {
  return manifest.composition?.provides ?? []
}

export function listCompositionClaims(manifest: ExtensionManifest): string[] {
  return manifest.composition?.claims ?? []
}

export interface CompositionClaimValidation {
  ok: true
  maxMounts: number
}

export interface CompositionClaimFailure {
  ok: false
  code: 'SLOT_UNKNOWN' | 'CLAIM_DENIED' | 'INVALID_ARGS'
  error: string
}

/**
 * Validate that caller may claim slotName against the bootstrap shell manifest.
 */
export function validateCompositionClaim(
  callerManifest: ExtensionManifest,
  slotName: string,
  shellManifest: ExtensionManifest | undefined
): CompositionClaimValidation | CompositionClaimFailure {
  if (!slotName || typeof slotName !== 'string') {
    return { ok: false, code: 'INVALID_ARGS', error: 'Missing slot name' }
  }

  const provides = listCompositionProvides(shellManifest ?? ({} as ExtensionManifest))
  const slot = provides.find((s) => s.name === slotName)
  if (!slot) {
    return { ok: false, code: 'SLOT_UNKNOWN', error: `Unknown composition slot: ${slotName}` }
  }

  const claims = listCompositionClaims(callerManifest)
  if (!claims.includes(slotName)) {
    return {
      ok: false,
      code: 'CLAIM_DENIED',
      error: `Extension ${callerManifest.id} is not allowed to claim slot ${slotName}`,
    }
  }

  return { ok: true, maxMounts: slot.maxMounts ?? 1 }
}
