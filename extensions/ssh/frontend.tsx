const React = window.React

import type { SshHost } from './types.ts'
import { useSshData } from './hooks/useSshData.ts'
import { useSshActions } from './hooks/useSshActions.ts'

const EXT_ID = 'com.nuxy.ssh'

const _useListNavigation =
  (window.UI || {}).useListNavigation ||
  (() => ({ selectedIndex: -1, setSelectedIndex: () => {}, selectedItem: null }))

const _useTranslation =
  (window.UI || {}).useTranslation ||
  (() => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' as const }))

interface Props {
  query: string
}

export default function SshView({ query }: Props) {
  const { List, ListItem, ListItemBody, ListItemText, ListItemMeta, EmptyState } = window.UI || {}

  const { t, dir } = _useTranslation(EXT_ID)
  const { hosts, loading, refresh } = useSshData()
  const { connecting, handleConnect, handleRefresh } = useSshActions({ refresh })

  const filteredHosts = React.useMemo<SshHost[]>(() => {
    if (!query.trim()) return hosts
    const q = query.trim().toLowerCase()
    return hosts.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        h.hostname.toLowerCase().includes(q) ||
        (h.user ?? '').toLowerCase().includes(q)
    )
  }, [hosts, query])

  const { selectedIndex, setSelectedIndex } = _useListNavigation(filteredHosts, {
    onEnter: (host: SshHost) => handleConnect(host),
    enterLabel: t('action.connect'),
    enterHint: 'Enter',
    extraActions: [
      {
        key: 'r',
        label: t('action.refresh'),
        hint: 'R',
        handler: () => handleRefresh(),
      },
    ],
  })

  React.useEffect(() => {
    setSelectedIndex(filteredHosts.length > 0 ? 0 : -1)
  }, [filteredHosts])

  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [selectedIndex])

  function buildSubtitle(host: SshHost): string {
    const parts: string[] = [host.hostname]
    if (host.user) parts.push(`${t('label.user')}: ${host.user}`)
    if (host.port && host.port !== 22) parts.push(`${t('label.port')}: ${host.port}`)
    return parts.join('  ·  ')
  }

  const isEmpty = !loading && filteredHosts.length === 0

  return (
    <div style={{ direction: dir }}>
      {List && (
        <List>
          {isEmpty ? (
            EmptyState && (
              <EmptyState
                message={hosts.length === 0 ? t('empty.noHosts') : t('empty.noMatch')}
              />
            )
          ) : (
            filteredHosts.map((host: SshHost, idx: number) =>
              ListItem && ListItemBody && ListItemText ? (
                <ListItem
                  key={host.name}
                  active={idx === selectedIndex}
                  onClick={() => {
                    setSelectedIndex(idx)
                    handleConnect(host)
                  }}
                >
                  <ListItemBody>
                    <ListItemText
                      title={host.name}
                      subtitle={buildSubtitle(host)}
                    />
                    {ListItemMeta && connecting && idx === selectedIndex && (
                      <ListItemMeta>...</ListItemMeta>
                    )}
                  </ListItemBody>
                </ListItem>
              ) : null
            )
          )}
        </List>
      )}
    </div>
  )
}
