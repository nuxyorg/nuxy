
export type ToastType = 'info' | 'success' | 'warning' | 'error'

export interface ToastOptions {
  id?: string
  title?: string
  message: string
  type?: ToastType
  duration?: number
}

export interface Toast extends ToastOptions {
  id: string
}

type Subscriber = (toasts: Toast[]) => void

export function toastStore(props: any): unknown {
  const Impl = (window.UI as any)?.toastStore || (() => null)
  return unknown(Impl, props)
}

export const toast = (...args: any[]): any => {
  return (window.UI as any)?.toast ? (window.UI as any).toast(...args) : undefined
}
