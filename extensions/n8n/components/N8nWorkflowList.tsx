const React = window.React

import type { N8nWorkflow } from '../types.ts'

interface Props {
  workflows: N8nWorkflow[]
  selectedIndex: number
  query: string
  onSelect: (wf: N8nWorkflow) => void
}

export function N8nWorkflowList({ workflows, selectedIndex, query, onSelect }: Props) {
  const {
    List,
    ListItem,
    ListItemBody,
    ListItemText,
    ListItemMeta,
    ListItemActions,
    Badge,
    EmptyState,
    SectionHeader,
  } = window.UI || {}

  return (
    <>
      {SectionHeader && <SectionHeader label="Workflows" />}
      <List>
        {workflows.length === 0 ? (
          EmptyState ? (
            <EmptyState message={query ? 'No matching workflows.' : 'No workflows found.'} />
          ) : null
        ) : (
          workflows.map((wf, idx) => (
            <ListItem key={wf.id} active={idx === selectedIndex} onClick={() => onSelect(wf)}>
              <ListItemBody>
                <ListItemText>{wf.name}</ListItemText>
                <ListItemMeta>{wf.active ? 'active' : 'inactive'}</ListItemMeta>
              </ListItemBody>
              <ListItemActions>
                {Badge && (
                  <Badge variant={wf.active ? 'success' : 'default'}>
                    {wf.active ? 'active' : 'inactive'}
                  </Badge>
                )}
              </ListItemActions>
            </ListItem>
          ))
        )}
      </List>
    </>
  )
}
