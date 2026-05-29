const React = window.React

interface ResultItem {
  id: string
  title: string
  value?: string
  meta?: {
    left?: { text: string; badge: string }
    right?: { text: string; badge: string }
  }
}

interface ResultCardProps {
  item: ResultItem
  providerName: string
  copiedId: string | null
  onCopy: (id: string) => void
}

interface CompareCardProps {
  item: ResultItem
  providerName: string
  copiedId: string | null
  onCopy: (id: string) => void
}

export function ResultCard({ item, providerName, copiedId, onCopy }: ResultCardProps) {
  const isCopied = copiedId === item.id
  return (
    <div
      className="nuxy-result-card"
      onClick={() => {
        if (item.value) {
          navigator.clipboard.writeText(item.value)
          onCopy(item.id)
        }
      }}
    >
      <div>
        <div className="nuxy-result-card__value">{item.value}</div>
        <div className="nuxy-result-card__title">{item.title}</div>
      </div>
      <span
        style={{
          fontSize: 10,
          fontWeight: 600,
          letterSpacing: '0.5px',
          padding: '2px 7px',
          borderRadius: 20,
          background: 'rgba(120, 80, 255, 0.12)',
          border: '1px solid rgba(120, 80, 255, 0.25)',
          color: 'rgba(160, 130, 255, 0.9)',
        }}
      >
        {providerName}
      </span>
      <div className={`nuxy-result-card__copied ${isCopied ? 'nuxy-result-card__copied--show' : ''}`}>
        Copied!
      </div>
    </div>
  )
}

export function CompareCard({ item, providerName, copiedId, onCopy }: CompareCardProps) {
  const meta = item.meta
  if (!meta || !meta.left || !meta.right) return null
  const isCopied = copiedId === item.id

  return (
    <div
      className="nuxy-compare-card"
      onClick={() => {
        if (item.value) {
          navigator.clipboard.writeText(item.value)
          onCopy(item.id)
        }
      }}
    >
      <div className="nuxy-compare-panel nuxy-compare-panel--left">
        <div className="nuxy-compare-panel__text">{meta.left.text}</div>
        <div className="nuxy-compare-panel__badge">{meta.left.badge}</div>
      </div>
      <div className="nuxy-compare-arrow">→</div>
      <div className="nuxy-compare-panel">
        <div className="nuxy-compare-panel__text" style={{ color: 'var(--syntax-function)' }}>
          {meta.right.text}
        </div>
        <div className="nuxy-compare-panel__badge">{meta.right.badge}</div>
      </div>
      <div className={`nuxy-result-card__copied ${isCopied ? 'nuxy-result-card__copied--show' : ''}`}>
        Copied!
      </div>
    </div>
  )
}
