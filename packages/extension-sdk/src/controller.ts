import { createStore, type Store } from './store'
import { createTranslator, type Translator } from './frontend-i18n'

export abstract class BaseExtensionController<S extends object> {
  readonly store: Store<S>
  readonly t: Translator
  protected cleanups: Array<() => void> = []

  constructor(
    extId: string,
    initialState: S,
    protected onUpdate: () => void
  ) {
    this.store = createStore<S>(initialState)
    this.t = createTranslator(extId, () => {
      window.core?.shell?.refreshKeyHints?.()
      this.syncSearchPlaceholder()
      this.onUpdate()
    })
    this.store.subscribe(() => this.onStoreChange())
  }

  abstract syncSearchPlaceholder(): void

  get state(): S {
    return this.store.getState()
  }

  protected onStoreChange(): void {
    this.onUpdate()
  }
}
