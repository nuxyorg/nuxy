import { LitElement, html, css, customElement, property } from '@nuxyorg/core'
import type { TemplateResult } from '@nuxyorg/core'

@customElement('nuxy-wizard-section')
export class NuxyWizardSectionElement extends LitElement {
  static styles = css`
    :host {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .nuxy-wizard-section__icon {
      display: flex;
      align-items: center;
      width: var(--icon-md);
      height: var(--icon-md);
      flex-shrink: 0;
    }

    .nuxy-wizard-section__icon svg {
      width: 100%;
      height: 100%;
    }

    .nuxy-wizard-section__title {
      margin: 0;
      font-size: var(--font-lg);
      font-weight: var(--font-semibold);
      color: var(--text-primary, rgba(255, 255, 255, 0.92));
      line-height: 1.2;
    }
  `

  @property({ type: String })
  declare title: string

  render(): TemplateResult {
    return html`
      <span class="nuxy-wizard-section__icon"><slot name="icon"></slot></span>
      <h2 class="nuxy-wizard-section__title">${this.title}</h2>
    `
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'nuxy-wizard-section': NuxyWizardSectionElement
  }
}
