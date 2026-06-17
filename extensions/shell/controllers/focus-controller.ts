import {
  applyShellFocusPolicy,
  queryOmniBarInputFromDom,
  type ShellFocusPolicy,
} from '../utils/focus.ts'

export class FocusController {
  private cleanups: Array<() => void> = []
  private omniBlurCleanup: (() => void) | null = null
  private rafPending = false

  constructor(private readonly policy: ShellFocusPolicy) {}

  bind(): void {
    const scheduleEnsure = () => {
      if (this.rafPending) return
      this.rafPending = true
      requestAnimationFrame(() => {
        this.rafPending = false
        this.ensureShellFocus()
        // Second frame: overlay unmount often completes after the first paint.
        requestAnimationFrame(() => this.ensureShellFocus())
      })
    }

    document.addEventListener('focusout', scheduleEnsure, true)
    document.addEventListener('focusin', scheduleEnsure, true)
    this.cleanups.push(() => {
      document.removeEventListener('focusout', scheduleEnsure, true)
      document.removeEventListener('focusin', scheduleEnsure, true)
    })
  }

  /** Re-bind blur regain when the omnibar input element is (re)created by Lit. */
  bindOmniInput(input: HTMLInputElement | null): void {
    this.omniBlurCleanup?.()
    this.omniBlurCleanup = null
    const resolved = input?.isConnected ? input : queryOmniBarInputFromDom()
    if (!resolved) return

    const onBlur = () => this.scheduleRegainAfterOmniBlur()
    resolved.addEventListener('blur', onBlur)
    this.omniBlurCleanup = () => resolved.removeEventListener('blur', onBlur)
  }

  /**
   * After omnibar blur, wait for the browser to assign the next focus target.
   * If nothing meaningful receives focus, reclaim via the shell focus policy.
   */
  private scheduleRegainAfterOmniBlur(): void {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        this.ensureShellFocus()
      })
    })
  }

  ensureShellFocus(): void {
    applyShellFocusPolicy(this.policy)
  }

  destroy(): void {
    this.omniBlurCleanup?.()
    this.omniBlurCleanup = null
    this.cleanups.forEach((fn) => fn())
    this.cleanups = []
  }
}
