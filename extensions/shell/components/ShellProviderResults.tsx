const React = window.React

import type { ProviderState } from '../types.ts'

interface ResultItem {
  id: string
  title: string
  value?: string
  meta?: {
    left?: { text: string; badge: string }
    right?: { text: string; badge: string }
  }
}

interface Props {
  providerStates: Record<string, ProviderState>
  copiedId: string | null
  onCopy: (id: string) => void
  ResultCard: React.ComponentType<{
    item: ResultItem
    providerName: string
    copiedId: string | null
    onCopy: (id: string) => void
  }>
  CompareCard: React.ComponentType<{
    item: ResultItem
    providerName: string
    copiedId: string | null
    onCopy: (id: string) => void
  }>
}

export function ShellProviderResults({
  providerStates,
  copiedId,
  onCopy,
  ResultCard,
  CompareCard,
}: Props) {
  const resultIds = Object.keys(providerStates).filter(
    (id) => providerStates[id].type === 'result'
  )
  const compareIds = Object.keys(providerStates).filter(
    (id) => providerStates[id].type === 'compare'
  )

  return (
    <>
      {resultIds.map((id) => {
        const state = providerStates[id]
        if (state.loading)
          return (
            <div key={id} className="nuxy-provider-section">
              <div className="nuxy-provider-section__header">
                <span>{state.name}</span>
                <div className="nuxy-provider-section__loading-dot" />
              </div>
              <div className="nuxy-skeleton-result nuxy-shimmer-bg" />
            </div>
          )
        if (!state.items || state.items.length === 0) return null
        return (
          <div key={id} className="nuxy-provider-section">
            <div className="nuxy-provider-section__header">
              <span>{state.name}</span>
            </div>
            {(state.items as ResultItem[]).map((item) => (
              <ResultCard
                key={item.id}
                item={item}
                providerName={state.name}
                copiedId={copiedId}
                onCopy={onCopy}
              />
            ))}
          </div>
        )
      })}

      {compareIds.map((id) => {
        const state = providerStates[id]
        if (state.loading)
          return (
            <div key={id} className="nuxy-provider-section">
              <div className="nuxy-provider-section__header">
                <span>{state.name}</span>
                <div className="nuxy-provider-section__loading-dot" />
              </div>
              <div className="nuxy-skeleton-compare nuxy-shimmer-bg" />
            </div>
          )
        if (!state.items || state.items.length === 0) return null
        return (
          <div key={id} className="nuxy-provider-section">
            <div className="nuxy-provider-section__header">
              <span>{state.name}</span>
            </div>
            {(state.items as ResultItem[]).map((item) => (
              <CompareCard
                key={item.id}
                item={item}
                providerName={state.name}
                copiedId={copiedId}
                onCopy={onCopy}
              />
            ))}
          </div>
        )
      })}
    </>
  )
}
