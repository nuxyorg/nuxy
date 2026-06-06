type RescanFn = () => Promise<void>
let _fn: RescanFn | null = null

export function setRescanFn(fn: RescanFn): void {
  _fn = fn
}

export function invokeRescan(): Promise<void> {
  return _fn?.() ?? Promise.resolve()
}
