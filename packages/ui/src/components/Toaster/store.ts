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

class ToastStore {
  private toasts: Toast[] = []
  private subscribers: Set<Subscriber> = new Set()

  subscribe(subscriber: Subscriber) {
    this.subscribers.add(subscriber)
    return () => {
      this.subscribers.delete(subscriber)
    }
  }

  private notify() {
    this.subscribers.forEach((subscriber) => subscriber([...this.toasts]))
  }

  add(options: ToastOptions) {
    const id = options.id || Math.random().toString(36).substring(2, 9)
    const toast: Toast = {
      ...options,
      id,
      type: options.type || 'info',
      duration: options.duration !== undefined ? options.duration : 3000,
    }

    this.toasts = [...this.toasts, toast]
    this.notify()

    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        this.remove(id)
      }, toast.duration)
    }

    return id
  }

  remove(id: string) {
    this.toasts = this.toasts.filter((t) => t.id !== id)
    this.notify()
  }

  getToasts() {
    return this.toasts
  }
}

export const toastStore = new ToastStore()

export const toast = (message: string | ToastOptions, options?: Omit<ToastOptions, 'message'>) => {
  if (typeof message === 'string') {
    return toastStore.add({ message, ...options })
  }
  return toastStore.add(message)
}
