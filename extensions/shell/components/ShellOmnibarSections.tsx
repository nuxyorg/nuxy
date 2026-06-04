const React = window.React

import type { OmnibarSection } from '../utils/listResults.ts'
import type { ListItem } from '../types.ts'

interface Props {
  sections: OmnibarSection[]
  savedQuery: string
  selectedIndex: number
  isAnyListProviderLoading: boolean
  itemClass: (index: number) => string
  onItemClick: (item: ListItem) => void
  ListItem?: React.ComponentType<React.HTMLAttributes<HTMLElement> & { active?: boolean }>
  ListItemBody?: React.ComponentType<React.HTMLAttributes<HTMLElement>>
  ListItemText?: React.ComponentType<React.HTMLAttributes<HTMLElement>>
  ListItemActions?: React.ComponentType<React.HTMLAttributes<HTMLElement>>
}

function renderListItem(
  item: ListItem,
  flatIndex: number,
  selectedIndex: number,
  itemClass: (index: number) => string,
  onItemClick: (item: ListItem) => void,
  ListItem?: Props['ListItem'],
  ListItemBody?: Props['ListItemBody'],
  ListItemText?: Props['ListItemText'],
  ListItemActions?: Props['ListItemActions']
): React.ReactNode {
  if (ListItem) {
    return (
      <ListItem
        key={`${item.id}-${flatIndex}`}
        active={flatIndex === selectedIndex}
        role="option"
        aria-selected={flatIndex === selectedIndex}
        onClick={() => onItemClick(item)}
      >
        {ListItemBody && (
          <ListItemBody>{ListItemText && <ListItemText>{item.title}</ListItemText>}</ListItemBody>
        )}
        {ListItemActions && item.subtitle && (
          <ListItemActions>
            <span className="nuxy-shell-results-item__subtitle">{item.subtitle}</span>
          </ListItemActions>
        )}
      </ListItem>
    )
  }

  return (
    <div
      key={`${item.id}-${flatIndex}`}
      className={itemClass(flatIndex)}
      role="option"
      aria-selected={flatIndex === selectedIndex}
      onClick={() => onItemClick(item)}
    >
      <span className="nuxy-shell-results-item__title">{item.title}</span>
      {item.subtitle && <span className="nuxy-shell-results-item__subtitle">{item.subtitle}</span>}
    </div>
  )
}

export function ShellOmnibarSections({
  sections,
  savedQuery,
  selectedIndex,
  isAnyListProviderLoading,
  itemClass,
  onItemClick,
  ListItem,
  ListItemBody,
  ListItemText,
  ListItemActions,
}: Props) {
  if (sections.length === 0 && !isAnyListProviderLoading) return null

  const hideToolsHeader = savedQuery.trim().length === 0

  let flatIndex = 0

  const sectionNodes = sections
    .map((section) => {
      if (section.items.length === 0 && !section.loading) return null

      const showHeader = section.id !== 'tools' || !hideToolsHeader

      const itemNodes = section.items.map((item) => {
        const node = renderListItem(
          item,
          flatIndex,
          selectedIndex,
          itemClass,
          onItemClick,
          ListItem,
          ListItemBody,
          ListItemText,
          ListItemActions
        )
        flatIndex += 1
        return node
      })

      return (
        <div key={section.id} className="nuxy-provider-section">
          {showHeader && (
            <div className="nuxy-provider-section__header">
              <span>{section.label}</span>
              {section.loading && <div className="nuxy-provider-section__loading-dot" />}
            </div>
          )}
          {itemNodes}
          {section.loading && itemNodes.length === 0 && (
            <div className="nuxy-skeleton-list">
              <div className="nuxy-skeleton-list-item nuxy-shimmer-bg" />
            </div>
          )}
        </div>
      )
    })
    .filter(Boolean)

  return (
    <>
      {sectionNodes.length > 0 && (
        <div className="nuxy-shell-results-list" role="listbox" aria-label="Results">
          {sectionNodes}
        </div>
      )}

      {isAnyListProviderLoading && !sections.some((s) => s.loading) && (
        <div className="nuxy-skeleton-list nuxy-shell-results-list">
          <div className="nuxy-skeleton-list-item nuxy-shimmer-bg" />
          <div className="nuxy-skeleton-list-item nuxy-shimmer-bg" style={{ width: '80%' }} />
        </div>
      )}
    </>
  )
}
