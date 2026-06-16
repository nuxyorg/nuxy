import type { ReactiveController, ReactiveControllerHost } from '@nuxyorg/core'

export class CommandPaletteController implements ReactiveController {
  private _show = false

  get showCommandPalette(): boolean {
    return this._show
  }

  constructor(private readonly host: ReactiveControllerHost) {
    host.addController(this)
  }

  hostConnected(): void {}

  toggle(): void {
    this._show = !this._show
    this.host.requestUpdate()
  }

  open(): void {
    if (this._show) return
    this._show = true
    this.host.requestUpdate()
  }

  close(): void {
    if (!this._show) return
    this._show = false
    this.host.requestUpdate()
  }
}
