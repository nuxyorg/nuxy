const React = window.React

import type { DockerContainer } from '../types.ts'

interface Props {
  container: DockerContainer
  active: boolean
  t: (key: string) => string
}

export function ContainerItem({ container, active, t }: Props) {
  const { ListItem, ListItemBody, ListItemText } = window.UI || {}

  const isRunning = container.state === 'running'

  const statusDot = (
    <span
      style={{
        display: 'inline-block',
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: isRunning ? 'var(--color-success)' : 'var(--color-fg-muted)',
        marginInlineEnd: 'var(--space-2)',
        flexShrink: 0,
      }}
    />
  )

  const subtitle = `${container.image} — ${container.status}`

  if (!ListItem || !ListItemBody || !ListItemText) return null

  return (
    <ListItem active={active}>
      <ListItemBody>
        <ListItemText
          title={
            <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
              {statusDot}
              {container.name}
            </span>
          }
          subtitle={subtitle}
        />
      </ListItemBody>
    </ListItem>
  )
}
