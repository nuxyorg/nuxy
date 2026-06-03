const React = window.React

interface Props {
  inputRef: React.RefObject<HTMLInputElement | null>
  query: string
  showOmniBar: boolean
  searchIcon: string | null
  activeToolName: string | null
  activeToolPlaceholder: string | null
  omniBarPortal?: React.ReactNode | null
  isLoading?: boolean
  onQueryChange: (value: string) => void
  onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void
  onDragMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void
}

export function ShellOmniBar({
  inputRef,
  query,
  showOmniBar,
  searchIcon,
  activeToolName,
  activeToolPlaceholder,
  omniBarPortal,
  isLoading,
  onQueryChange,
  onKeyDown,
  onDragMouseDown,
}: Props) {
  return (
    <div
      className={`nuxy-shell-omni-bar ${showOmniBar ? '' : 'nuxy-shell-omni-bar--static'}`}
      onClick={() => showOmniBar && inputRef.current?.focus()}
      onMouseDown={onDragMouseDown}
    >
      <span className="nuxy-shell-omni-bar__icon" aria-hidden="true">
        {searchIcon ? (
          <span
            dangerouslySetInnerHTML={{ __html: searchIcon }}
            style={{ display: 'flex', alignItems: 'center' }}
          />
        ) : (
          <span className="nuxy-shell-omni-bar__icon-placeholder" aria-hidden="true" />
        )}
      </span>
      <span className="nuxy-shell-omni-bar__sep">›</span>
      {activeToolName && (
        <>
          <span className="nuxy-shell-omni-bar__tool-name">{activeToolName}</span>
          <span className="nuxy-shell-omni-bar__sep">›</span>
        </>
      )}
      <input
        autoFocus
        ref={inputRef}
        disabled={!showOmniBar}
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={onKeyDown}
        className="nuxy-shell-omni-bar__input"
        aria-label="Search"
        placeholder={
          activeToolPlaceholder
            ? activeToolPlaceholder
            : activeToolName
              ? `Search ${activeToolName}`
              : 'What do you have in mind?'
        }
      />
      {(omniBarPortal != null || isLoading) && (
        <div
          className="nuxy-shell-omni-bar__portal"
          style={{
            display: 'flex',
            alignItems: 'center',
            paddingRight: 'var(--space-3)',
            flexShrink: 0,
          }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {omniBarPortal ?? (isLoading && <span className="nuxy-shell-omni-bar__loader" />)}
        </div>
      )}
    </div>
  )
}
