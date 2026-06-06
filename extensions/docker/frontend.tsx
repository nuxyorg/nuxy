const React = window.React
const { useState, useEffect, useMemo } = React

import type { DockerContainer, DockerImage } from './types.ts'
import { useDockerData } from './hooks/useDockerData.ts'
import { useDockerActions } from './hooks/useDockerActions.ts'
import { ContainerItem } from './components/ContainerItem.tsx'

const EXT_ID = 'com.nuxy.docker'

import { _useListNavigation, _useToolKeyActions, _useTranslation } from '../ui-hooks.ts'

type View = 'containers' | 'images'

interface Props {
  query: string
}

export default function DockerApp({ query }: Props) {
  const { List, ListItem, ListItemBody, ListItemText, EmptyState, Alert, SectionHeader } =
    window.UI || {}

  const { t, dir } = _useTranslation(EXT_ID)

  const [view, setView] = useState<View>('containers')

  const { containers, images, loading, error, logs, logsContainerId, refresh, setLogs } =
    useDockerData(view)

  const { handleToggle, handleRestart, handleRemove, handleLogs } = useDockerActions({
    refresh,
    setLogs,
  })

  // Filter containers by query
  const filteredContainers = useMemo<DockerContainer[]>(() => {
    if (!query.trim()) return containers
    const q = query.trim().toLowerCase()
    return containers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.image.toLowerCase().includes(q) ||
        c.status.toLowerCase().includes(q)
    )
  }, [containers, query])

  // Filter images by query
  const filteredImages = useMemo<DockerImage[]>(() => {
    if (!query.trim()) return images
    const q = query.trim().toLowerCase()
    return images.filter(
      (img) => img.repository.toLowerCase().includes(q) || img.tag.toLowerCase().includes(q)
    )
  }, [images, query])

  const listItems = view === 'containers' ? filteredContainers : filteredImages

  const { selectedIndex, setSelectedIndex } = _useListNavigation(listItems, {
    onEnter: (item: unknown) => {
      if (view === 'containers') {
        handleToggle(item as DockerContainer)
      }
    },
    enterLabel: view === 'containers' ? t('action.start') + '/' + t('action.stop') : undefined,
    enterHint: view === 'containers' ? '↵' : undefined,
  })

  const selectedContainer =
    view === 'containers' && selectedIndex >= 0
      ? (filteredContainers[selectedIndex] as DockerContainer | undefined)
      : undefined

  // Dispatch hint refresh when selection or view changes
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [selectedIndex, view, logs])

  // Tab key switches view
  _useToolKeyActions([
    {
      key: 'Tab',
      label: t('tab.containers') + '/' + t('tab.images'),
      hint: 'Tab',
      handler: () => {
        setView((v) => (v === 'containers' ? 'images' : 'containers'))
        setSelectedIndex(-1)
      },
    },
    {
      key: 'r',
      label: t('action.restart'),
      hint: 'R',
      activeOn: () => view === 'containers' && selectedIndex >= 0,
      handler: () => {
        if (selectedContainer) handleRestart(selectedContainer)
      },
    },
    {
      key: 'l',
      label: t('action.logs'),
      hint: 'L',
      activeOn: () => view === 'containers' && selectedIndex >= 0,
      handler: () => {
        if (selectedContainer) {
          if (logs && logsContainerId === selectedContainer.id) {
            setLogs(null, null)
          } else {
            handleLogs(selectedContainer)
          }
        }
      },
    },
    {
      key: 'd',
      label: t('action.remove'),
      hint: 'D',
      activeOn: () => view === 'containers' && selectedIndex >= 0,
      handler: () => {
        if (selectedContainer) handleRemove(selectedContainer)
      },
    },
    {
      key: 'Delete',
      label: t('action.remove'),
      activeOn: () => view === 'containers' && selectedIndex >= 0,
      handler: () => {
        if (selectedContainer) handleRemove(selectedContainer)
      },
    },
    {
      key: 'f5',
      label: t('action.refresh'),
      hint: 'F5',
      handler: () => refresh(),
    },
  ])

  const containerList =
    filteredContainers.length === 0 ? (
      EmptyState ? (
        <EmptyState message={loading ? '…' : t('empty.noContainers')} />
      ) : null
    ) : List ? (
      <List>
        {filteredContainers.map((c, idx) => (
          <ContainerItem key={c.id} container={c} active={idx === selectedIndex} t={t} />
        ))}
      </List>
    ) : null

  const imageList =
    filteredImages.length === 0 ? (
      EmptyState ? (
        <EmptyState message={loading ? '…' : t('empty.noImages')} />
      ) : null
    ) : List ? (
      <List>
        {filteredImages.map((img, idx) =>
          ListItem && ListItemBody && ListItemText ? (
            <ListItem key={img.id} active={idx === selectedIndex}>
              <ListItemBody>
                <ListItemText title={`${img.repository}:${img.tag}`} subtitle={img.size} />
              </ListItemBody>
            </ListItem>
          ) : null
        )}
      </List>
    ) : null

  const logsPanel =
    logs !== null ? (
      Alert ? (
        <Alert
          variant="info"
          style={{
            marginTop: 'var(--space-3)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-xs)',
            whiteSpace: 'pre-wrap',
            maxHeight: '200px',
            overflowY: 'auto',
          }}
        >
          {logs}
        </Alert>
      ) : (
        <pre
          style={{
            marginTop: 'var(--space-3)',
            fontFamily: 'var(--font-mono)',
            fontSize: 'var(--font-size-xs)',
            whiteSpace: 'pre-wrap',
            maxHeight: '200px',
            overflowY: 'auto',
            color: 'var(--color-fg)',
            background: 'var(--surface-overlay)',
            padding: 'var(--space-3)',
            borderRadius: 'var(--radius-md)',
          }}
        >
          {logs}
        </pre>
      )
    ) : null

  return (
    <div style={{ direction: dir, height: '100%', display: 'flex', flexDirection: 'column' }}>
      {SectionHeader ? (
        <SectionHeader title={view === 'containers' ? t('tab.containers') : t('tab.images')} />
      ) : null}

      {error && Alert ? (
        <Alert variant="danger" style={{ marginBottom: 'var(--space-2)' }}>
          {error}
        </Alert>
      ) : null}

      {view === 'containers' ? containerList : imageList}

      {view === 'containers' && logsPanel}
    </div>
  )
}
