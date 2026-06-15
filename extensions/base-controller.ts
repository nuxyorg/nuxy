import { createStore, type Store } from './store.ts'
import { createTranslator, type Translator } from './shell-i18n.ts'

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
      window.core?.shell?.refreshKeyHints()
      this.syncSearchPlaceholder()
      this.onUpdate()
    })
    this.store.subscribe(() => this.onStoreChange())
  }

  abstract syncSearchPlaceholder(): void

  get state(): S {
    return this.store.getState()
  }

  /**
   * Called on every store update. Override to add extra logic before
   * or after `onUpdate()`. The default implementation just calls `onUpdate()`.
   */
  protected onStoreChange(): void {
    this.onUpdate()
  }
}
