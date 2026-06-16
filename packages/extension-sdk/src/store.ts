export type Unsubscribe = () => void

export interface Store<T extends object> {
  getState: () => T
  setState: (partial: Partial<T> | ((prev: T) => Partial<T>)) => void
  subscribe: (listener: () => void) => Unsubscribe
}

export function createStore<T extends object>(initial: T): Store<T> {
  let state = initial
  const listeners = new Set<() => void>()

  return {
    getState: () => state,
    setState(partial) {
      const patch = typeof partial === 'function' ? partial(state) : partial
      state = { ...state, ...patch }
      listeners.forEach((l) => l())
    },
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
  }
}
