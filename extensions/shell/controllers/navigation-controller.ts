import type { ReactiveController, ReactiveControllerHost } from '@nuxy/core'

export class NavigationController implements ReactiveController {
  private _selectedIndex = -1

  get selectedIndex(): number {
    return this._selectedIndex
  }

  constructor(private readonly host: ReactiveControllerHost) {
    host.addController(this)
  }

  setSelectedIndex(index: number | ((prev: number) => number)): void {
    const next = typeof index === 'function' ? index(this._selectedIndex) : index
    if (next === this._selectedIndex) return
    this._selectedIndex = next
    this.host.requestUpdate()
  }

  moveDown(listLength: number): void {
    const next = this._selectedIndex + 1
    if (next < listLength) {
      this._selectedIndex = next
      this.host.requestUpdate()
    }
  }

  moveUp(): void {
    const next = this._selectedIndex - 1
    if (next >= -1) {
      this._selectedIndex = next
      this.host.requestUpdate()
    }
  }

  reset(): void {
    if (this._selectedIndex === -1) return
    this._selectedIndex = -1
    this.host.requestUpdate()
  }
}
