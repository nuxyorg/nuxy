const React = window.React

import type { ListItem } from '../types.ts'

interface Props {
  listResults: ListItem[]
  selectedIndex: number
  isAnyListProviderLoading: boolean
  itemClass: (index: number) => string
  onItemClick: (item: ListItem) => void
  List?: React.ComponentType<React.HTMLAttributes<HTMLElement>>
  ListItem?: React.ComponentType<
    React.HTMLAttributes<HTMLElement> & { active?: boolean }
  >
  ListItemBody?: React.ComponentType<React.HTMLAttributes<HTMLElement>>
  ListItemText?: React.ComponentType<React.HTMLAttributes<HTMLElement>>
  ListItemActions?: React.ComponentType<React.HTMLAttributes<HTMLElement>>
}

export function ShellListResults({
  listResults,
  selectedIndex,
  isAnyListProviderLoading,
  itemClass,
  onItemClick,
  List,
  ListItem,
  ListItemBody,
  ListItemText,
  ListItemActions,
}: Props) {
  return (
    <>
      {listResults.length > 0 && List ? (
        <List role="listbox" aria-label="Results">
          {listResults.map(
            (item, index) =>
              ListItem && (
                <ListItem
                  key={item.id}
                  active={index === selectedIndex}
                  role="option"
                  aria-selected={index === selectedIndex}
                  onClick={() => onItemClick(item)}
                >
                  {ListItemBody && (
                    <ListItemBody>
                      {ListItemText && <ListItemText>{item.title}</ListItemText>}
                    </ListItemBody>
                  )}
                  {ListItemActions && item.subtitle && (
                    <ListItemActions>
                      <span className="nuxy-shell-results-item__subtitle">{item.subtitle}</span>
                    </ListItemActions>
                  )}
                </ListItem>
              )
          )}
        </List>
      ) : (
        listResults.length > 0 && (
          <div className="nuxy-shell-results-list" role="listbox" aria-label="Results">
            {listResults.map((item, index) => (
              <div
                key={item.id}
                className={itemClass(index)}
                role="option"
                aria-selected={index === selectedIndex}
                onClick={() => onItemClick(item)}
              >
                <span className="nuxy-shell-results-item__title">{item.title}</span>
                <span className="nuxy-shell-results-item__subtitle">{item.subtitle}</span>
              </div>
            ))}
          </div>
        )
      )}

      {isAnyListProviderLoading && (
        <div className="nuxy-skeleton-list">
          <div className="nuxy-skeleton-list-item nuxy-shimmer-bg" />
          <div className="nuxy-skeleton-list-item nuxy-shimmer-bg" style={{ width: '80%' }} />
        </div>
      )}
    </>
  )
}
