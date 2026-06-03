export const CARD_STYLES = `
  .tc-card {
    display: flex;
    width: 100%;
    border-radius: var(--radius-xl, 12px);
    overflow: hidden;
    background: var(--surface-overlay, rgba(20, 20, 20, 0.65));
    border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow: 0 4px 32px var(--shadow-dark, rgba(0, 0, 0, 0.4));
    min-height: 110px;
    position: relative;
  }

  .tc-panel {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 20px 28px;
    position: relative;
    gap: 10px;
  }

  .tc-panel--left {
    border-right: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.08));
  }

  .tc-panel__time {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: -0.5px;
    color: var(--text-primary, rgba(255, 255, 255, 0.92));
    line-height: 1;
  }

  .tc-panel__time--large {
    font-size: 40px;
    font-weight: 700;
  }

  .tc-panel__badge {
    display: inline-flex;
    align-items: center;
    padding: 3px 10px;
    border-radius: 20px;
    background: var(--surface-inset, rgba(255, 255, 255, 0.08));
    border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1));
    font-size: var(--font-xs, 11px);
    color: var(--text-secondary, rgba(255, 255, 255, 0.55));
    font-weight: 500;
    letter-spacing: 0.3px;
  }

  .tc-arrow {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0 4px;
    flex-shrink: 0;
    color: var(--text-dim, rgba(255, 255, 255, 0.3));
    font-size: 20px;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    pointer-events: none;
  }

  .tc-section-label {
    font-size: var(--font-xs, 11px);
    font-weight: 600;
    letter-spacing: 0.8px;
    text-transform: uppercase;
    color: var(--text-subtle, rgba(255, 255, 255, 0.35));
    margin-bottom: 12px;
  }

  .tc-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: var(--space-3, 8px);
    padding: 40px 20px;
    opacity: 0.45;
    text-align: center;
  }

  .tc-empty__icon {
    width: 32px;
    height: 32px;
    line-height: 1;
  }

  .tc-empty__text {
    font-size: var(--font-sm, 13px);
    color: var(--text-muted, rgba(255, 255, 255, 0.6));
    line-height: 1.4;
  }

  .tc-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 0;
    min-height: 0;
    padding: var(--space-4, 12px);
  }

  .tc-header {
    font-size: var(--font-xs, 11px);
    font-weight: 600;
    letter-spacing: 0.7px;
    text-transform: uppercase;
    color: var(--text-subtle, rgba(255, 255, 255, 0.35));
    padding: 0 4px 10px 4px;
  }

  .tc-input-area {
    display: flex;
    flex-direction: column;
    gap: var(--space-3, 8px);
    padding: 0 4px 16px 4px;
  }

  .tc-label {
    font-size: var(--font-sm, 12px);
    color: var(--text-muted, rgba(255, 255, 255, 0.4));
    margin-bottom: 2px;
  }

  .tc-hint {
    font-size: var(--font-sm, 12px);
    color: var(--text-subtle, rgba(255, 255, 255, 0.35));
    line-height: 1.5;
    padding: 10px 4px 0 4px;
  }

  .tc-examples {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2, 6px);
    padding: var(--space-3, 8px) 4px 0;
  }

  .tc-example-chip {
    display: inline-flex;
    padding: 4px 10px;
    border-radius: 20px;
    background: var(--surface-raised, rgba(255, 255, 255, 0.06));
    border: 1px solid var(--border-default, rgba(255, 255, 255, 0.1));
    font-size: var(--font-xs, 11px);
    color: var(--text-secondary, rgba(255, 255, 255, 0.5));
  }
`

export function injectStyles(): void {
  const id = 'nuxy-time-calc-styles'
  if (document.getElementById(id)) return
  const style = document.createElement('style')
  style.id = id
  style.textContent = CARD_STYLES
  document.head.appendChild(style)
}
