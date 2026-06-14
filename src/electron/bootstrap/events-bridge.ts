import type { CoreEvents, NuxyRendererEvent } from '@nuxy/core'

export function createEventsBridge(): CoreEvents {
  const listeners = new Map<NuxyRendererEvent, Set<(detail: unknown) => void>>()

  return {
    emit(type, ...args) {
      const detail = args[0]
      const set = listeners.get(type)
      if (!set) return
      for (const handler of set) handler(detail)
    },

    on(type, handler) {
      let set = listeners.get(type)
      if (!set) {
        set = new Set()
        listeners.set(type, set)
      }
      const wrapped = handler as (detail: unknown) => void
      set.add(wrapped)
      return () => {
        set!.delete(wrapped)
      }
    },
  }
}
