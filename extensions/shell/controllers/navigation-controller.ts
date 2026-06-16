import type { ReactiveController, ReactiveControllerHost } from '@nuxyorg/core'

export class NavigationController implements ReactiveController {
  private _selectedIndex = -1

  get selectedIndex(): number {
    const store = (this.host as any).store
    return store ? store.getState().selectedIndex : this._selectedIndex
  }

  constructor(private readonly host: ReactiveControllerHost) {
    host.addController(this)
  }

  hostConnected(): void {}

  setSelectedIndex(index: number | ((prev: number) => number)): void {
    const store = (this.host as any).store
    const current = store ? store.getState().selectedIndex : this._selectedIndex
    const next = typeof index === 'function' ? index(current) : index
    if (next === current) return

    if (store) {
      store.setState({ selectedIndex: next })
    } else {
      this._selectedIndex = next
      this.host.requestUpdate()
    }
  }

  moveDown(listLength: number): void {
    const store = (this.host as any).store
    const current = store ? store.getState().selectedIndex : this._selectedIndex
    const next = current + 1
    if (next < listLength) {
      if (store) {
        store.setState({ selectedIndex: next })
      } else {
        this._selectedIndex = next
        this.host.requestUpdate()
      }
    }
  }

  moveUp(): void {
    const store = (this.host as any).store
    const current = store ? store.getState().selectedIndex : this._selectedIndex
    const next = current - 1
    if (next >= -1) {
      if (store) {
        store.setState({ selectedIndex: next })
      } else {
        this._selectedIndex = next
        this.host.requestUpdate()
      }
    }
  }

  reset(): void {
    const store = (this.host as any).store
    const current = store ? store.getState().selectedIndex : this._selectedIndex
    if (current === -1) return

    if (store) {
      store.setState({ selectedIndex: -1 })
    } else {
      this._selectedIndex = -1
      this.host.requestUpdate()
    }
  }
}
