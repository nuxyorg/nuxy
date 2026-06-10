import type {
  CompositionHandle,
  CompositionMountOptions,
  CompositionSlotDeclaration,
  CoreComposition,
} from '@nuxy/core'
import type { IpcRenderer } from 'electron'

interface MountRecord {
  slotName: string
  element: HTMLElement
  extId: string
}

const PORTAL_HOST_IDS: Record<string, string> = {
  'omnibar-portal': 'nuxy-omnibar-portal-host',
  'footer-portal': 'nuxy-footer-portal-host',
}

function mountIntoShell(shell: Element, slotName: string, element: HTMLElement): void {
  const hostId = PORTAL_HOST_IDS[slotName]
  if (hostId) {
    const host = shell.querySelector(`#${hostId}`)
    if (host) {
      host.replaceChildren(element)
      return
    }
  }
  element.slot = slotName
  shell.appendChild(element)
}

export function createCompositionBridge(ipcRenderer: IpcRenderer): CoreComposition {
  const declared = new Map<string, CompositionSlotDeclaration>()
  const stateBySlot = new Map<string, Record<string, unknown>>()
  const listeners = new Map<string, Set<(state: Record<string, unknown>) => void>>()
  const mountsBySlot = new Map<string, MountRecord[]>()

  const setState = (slotName: string, state: Record<string, unknown>): void => {
    stateBySlot.set(slotName, state)
    const slotListeners = listeners.get(slotName)
    if (slotListeners) {
      for (const handler of slotListeners) handler(state)
    }
  }

  return {
    declareSlots(slots) {
      declared.clear()
      for (const slot of slots) {
        declared.set(slot.name, slot)
      }
    },

    async mount(slotName, element, opts?: CompositionMountOptions): Promise<CompositionHandle> {
      const extId = opts?.extId
      if (!extId) {
        throw new Error('composition.mount requires opts.extId')
      }
      if (!declared.has(slotName)) {
        throw new Error(`Unknown composition slot: ${slotName}`)
      }

      const validation = (await ipcRenderer.invoke(
        'ext:invoke',
        'kernel',
        'validateCompositionClaim',
        {
          extId,
          slotName,
        }
      )) as { success: boolean; error?: string; data?: { maxMounts?: number } }

      if (!validation?.success) {
        throw new Error(validation?.error ?? 'Composition claim denied')
      }

      const maxMounts = validation.data?.maxMounts ?? declared.get(slotName)?.maxMounts ?? 1
      const existing = mountsBySlot.get(slotName) ?? []
      if (existing.length >= maxMounts) {
        existing[0]?.element.remove()
        existing.shift()
      }

      const shell = document.querySelector('nuxy-shell')
      if (!shell) {
        throw new Error('nuxy-shell is not mounted')
      }

      element.slot = slotName
      mountIntoShell(shell, slotName, element)

      const record: MountRecord = { slotName, element, extId }
      mountsBySlot.set(slotName, [...(mountsBySlot.get(slotName) ?? []), record])

      if (opts?.state) {
        setState(slotName, opts.state)
      }

      return {
        setState: (state) => setState(slotName, state),
        release: () => {
          element.remove()
          const next = (mountsBySlot.get(slotName) ?? []).filter((m) => m.element !== element)
          if (next.length === 0) mountsBySlot.delete(slotName)
          else mountsBySlot.set(slotName, next)
        },
      }
    },

    setState,

    onStateChange(slotName, handler) {
      let slotListeners = listeners.get(slotName)
      if (!slotListeners) {
        slotListeners = new Set()
        listeners.set(slotName, slotListeners)
      }
      slotListeners.add(handler)
      const existing = stateBySlot.get(slotName)
      if (existing) handler(existing)
      return () => {
        slotListeners!.delete(handler)
      }
    },
  }
}
