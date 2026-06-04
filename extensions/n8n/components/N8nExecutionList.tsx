const React = window.React

import type { N8nWorkflow, N8nExecution } from '../types.ts'

interface Props {
  selected: N8nWorkflow
  executions: N8nExecution[]
}

export function N8nExecutionList({ selected, executions }: Props) {
  const {
    List,
    ListItem,
    ListItemBody,
    ListItemText,
    ListItemMeta,
    Badge,
    EmptyState,
    SectionHeader,
  } = window.UI || {}

  return (
    <>
      {SectionHeader && <SectionHeader label={`Executions: ${selected.name}`} />}
      <List>
        {executions.length === 0 ? (
          EmptyState ? (
            <EmptyState message="No executions found." />
          ) : null
        ) : (
          executions.map((ex) => (
            <ListItem key={ex.id}>
              <ListItemBody>
                <ListItemText>{ex.status}</ListItemText>
                <ListItemMeta>{ex.startedAt}</ListItemMeta>
              </ListItemBody>
              {Badge && (
                <Badge
                  variant={
                    ex.status === 'success'
                      ? 'success'
                      : ex.status === 'error'
                        ? 'danger'
                        : 'default'
                  }
                >
                  {ex.status}
                </Badge>
              )}
            </ListItem>
          ))
        )}
      </List>
    </>
  )
}
