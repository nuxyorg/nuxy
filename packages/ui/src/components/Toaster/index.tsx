
export function Toaster(...args: any[]): unknown {
  return (window.UI as any)?.Toaster?.(...args) ?? null
}

export { toast } from './store'
export type { ToastOptions } from './store'
