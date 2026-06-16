import type { ReactiveController, ReactiveControllerHost } from '@nuxyorg/core'

export class QueryController implements ReactiveController {
  private _query = ''
  private _savedQuery = ''

  get query(): string {
    const store = (this.host as any).store
    return store ? store.getState().query : this._query
  }

  get savedQuery(): string {
    const store = (this.host as any).store
    return store ? store.getState().savedQuery : this._savedQuery
  }

  constructor(private readonly host: ReactiveControllerHost) {
    host.addController(this)
  }

  hostConnected(): void {}

  setQuery(val: string): void {
    const store = (this.host as any).store
    if (store) {
      store.setState({ query: val })
    } else {
      this._query = val
      this.host.requestUpdate()
    }
  }

  setSavedQuery(val: string): void {
    const store = (this.host as any).store
    if (store) {
      store.setState({ savedQuery: val })
    } else {
      this._savedQuery = val
      this.host.requestUpdate()
    }
  }

  handleChange(val: string): void {
    const store = (this.host as any).store
    if (store) {
      store.setState({ query: val, savedQuery: val })
    } else {
      this._query = val
      this._savedQuery = val
      this.host.requestUpdate()
    }
  }

  reset(): void {
    const store = (this.host as any).store
    if (store) {
      store.setState({ query: '', savedQuery: '' })
    } else {
      this._query = ''
      this._savedQuery = ''
      this.host.requestUpdate()
    }
  }
}
