import type { ReactiveController, ReactiveControllerHost } from '@nuxyorg/core'

export class QueryController implements ReactiveController {
  private _query = ''
  private _savedQuery = ''

  get query(): string {
    return this._query
  }

  get savedQuery(): string {
    return this._savedQuery
  }

  constructor(private readonly host: ReactiveControllerHost) {
    host.addController(this)
  }

  hostConnected(): void {}

  setQuery(val: string): void {
    this._query = val
    this.host.requestUpdate()
  }

  setSavedQuery(val: string): void {
    this._savedQuery = val
    this.host.requestUpdate()
  }

  handleChange(val: string): void {
    this._query = val
    this._savedQuery = val
    this.host.requestUpdate()
  }

  reset(): void {
    this._query = ''
    this._savedQuery = ''
    this.host.requestUpdate()
  }
}
