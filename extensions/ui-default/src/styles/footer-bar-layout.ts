import { css } from '@nuxyorg/core'

/** Shadow :host chrome for nuxy-shortcut-bar */
export const footerBarHostStyles = css`
  :host {
    box-sizing: border-box;
    height: 32px;
    padding: 0 var(--space-5);
    border-top: 1px solid var(--syntax-comment);
  }
`

/** Class chrome for overlay elements (e.g. footer toasts) */
export const footerBarClassStyles = css`
  .nuxy-footer-bar {
    box-sizing: border-box;
    padding: var(--space-3) var(--space-5);
    border-top: 1px solid var(--syntax-comment);
  }
`
