const React = window.React
const { useState, useEffect, useRef, useMemo } = React

import type { ExtensionListItem } from './types.ts'

interface NavSection {
  id: string
  label: string
  itemCount: number
}

const EXT_ID = 'com.nuxy.store'

const _useTwoPanelNav =
  (window.UI || {}).useTwoPanelNav ||
  (({ sections }: { sections: NavSection[] }) => ({
    focusArea: 'right' as const,
    setFocusArea: () => {},
    activeSectionId: sections[0]?.id ?? '',
    goToSection: () => {},
    sectionStartIndex: {} as Record<string, number>,
    getSectionIdForIndex: () => sections[0]?.id ?? '',
    onItemSelected: () => {},
    setActiveSection: () => {},
  }))

const TABS = [
  { id: 'all', label: 'All Extensions' },
  { id: 'tool', label: 'Tools' },
  { id: 'theme', label: 'Themes' },
  { id: 'iconpack', label: 'Icon Packs' },
  { id: 'installed', label: 'Installed' },
  { id: 'updates', label: 'Updates' },
]

export default function StoreView({ query }: { query: string }) {
  const {
    List,
    ListItem,
    ListItemBody,
    ListItemText,
    ListItemMeta,
    ListItemActions,
    EmptyState,
    Alert,
    Badge,
    Heading,
    TabBar,
    TwoPanel,
    ScrollArea,
    Card,
    CardBody,
    LoadingState,
    toast,
    ShortcutSep,
    Text,
    Box,
    Stack,
    IconDownload,
    IconTrash,
    IconRefresh,
    IconWarning,
    IconCheck,
    IconInfo,
  } = window.UI || {}

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [extensions, setExtensions] = useState<ExtensionListItem[]>([])
  const [activeTab, setActiveTab] = useState<string>('all')
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)

  const stateRef = useRef({
    extensions,
    activeTab,
    selectedIndex,
    loading,
    query,
  })

  stateRef.current = {
    extensions,
    activeTab,
    selectedIndex,
    loading,
    query,
  }

  // Load and refresh the extensions catalog
  const loadCatalog = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await window.core.ipc.invoke(EXT_ID, 'getExtensions', {})
      const r = res as { success: boolean; data?: ExtensionListItem[]; error?: string }
      if (r?.success && Array.isArray(r.data)) {
        setExtensions(r.data)
      } else {
        setError(r?.error || 'Failed to fetch catalog')
      }
    } catch (e: any) {
      setError(e.message || 'Network error fetching extensions')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadCatalog()
  }, [])

  // Filter extensions based on category tab and omnibar search query
  const filteredExtensions = useMemo(() => {
    const q = (query || '').toLowerCase().trim()
    return extensions.filter((ext) => {
      // 1. Tab filter
      if (activeTab === 'installed' && !ext.installed) return false
      if (activeTab === 'updates' && !ext.canUpdate) return false
      if (activeTab !== 'all' && activeTab !== 'installed' && activeTab !== 'updates' && ext.type !== activeTab) {
        return false
      }

      // 2. Search query filter
      if (q !== '') {
        const nameMatch = ext.name.toLowerCase().includes(q)
        const idMatch = ext.id.toLowerCase().includes(q)
        const descMatch = ext.description.toLowerCase().includes(q)
        const authorMatch = ext.author.toLowerCase().includes(q)
        return nameMatch || idMatch || descMatch || authorMatch
      }

      return true
    })
  }, [extensions, activeTab, query])

  // Reset selected item index on tab switch
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    setSelectedIndex(-1)
    nav.goToSection(tabId)
  }

  // Install extension handler
  const handleInstall = async (ext: ExtensionListItem) => {
    if (loading) return
    setLoading(true)
    if (toast) toast(`Installing ${ext.name}...`, { type: 'info' })
    try {
      const res = await window.core.ipc.invoke(EXT_ID, 'installExtension', {
        extId: ext.id,
        downloadUrl: ext.downloadUrl,
      })
      const r = res as { success: boolean; error?: string }
      if (r?.success) {
        if (toast) toast(`${ext.name} installed successfully!`, { type: 'success' })
        void loadCatalog()
      } else {
        setError(r.error || `Failed to install ${ext.name}`)
        if (toast) toast(r.error || `Installation failed`, { type: 'error' })
      }
    } catch (e: any) {
      setError(e.message || 'Installation error')
      if (toast) toast(e.message || `Installation error`, { type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // Uninstall extension handler
  const handleUninstall = async (ext: ExtensionListItem) => {
    if (loading || ext.isSystem) return
    setLoading(true)
    if (toast) toast(`Uninstalling ${ext.name}...`, { type: 'info' })
    try {
      const res = await window.core.ipc.invoke(EXT_ID, 'uninstallExtension', {
        extId: ext.id,
      })
      const r = res as { success: boolean; error?: string }
      if (r?.success) {
        if (toast) toast(`${ext.name} uninstalled.`, { type: 'success' })
        void loadCatalog()
      } else {
        setError(r.error || `Failed to uninstall ${ext.name}`)
        if (toast) toast(r.error || `Uninstall failed`, { type: 'error' })
      }
    } catch (e: any) {
      setError(e.message || 'Uninstall error')
      if (toast) toast(e.message || `Uninstall error`, { type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  // Define hotkeys and layout actions
  const rightPanelActions = useMemo(
    () => [
      {
        key: 'ArrowUp',
        label: 'Navigate list',
        hint: '↑↓',
        handler: () => {
          setSelectedIndex((idx) => {
            if (idx <= 0) return 0
            return idx - 1
          })
        },
      },
      {
        key: 'ArrowDown',
        label: 'Navigate list',
        handler: () => {
          setSelectedIndex((idx) => {
            const maxIdx = filteredExtensions.length - 1
            if (idx >= maxIdx) return maxIdx
            return idx + 1
          })
        },
      },
      {
        key: 'i',
        label: 'Install / Update',
        hint: 'I',
        activeOn: () => {
          const { selectedIndex } = stateRef.current
          const item = filteredExtensions[selectedIndex]
          return !!(item && (!item.installed || item.canUpdate))
        },
        handler: () => {
          const { selectedIndex } = stateRef.current
          const item = filteredExtensions[selectedIndex]
          if (item) void handleInstall(item)
        },
      },
      {
        key: 'u',
        label: 'Uninstall',
        hint: 'U',
        activeOn: () => {
          const { selectedIndex } = stateRef.current
          const item = filteredExtensions[selectedIndex]
          return !!(item && item.installed && !item.isSystem)
        },
        handler: () => {
          const { selectedIndex } = stateRef.current
          const item = filteredExtensions[selectedIndex]
          if (item) void handleUninstall(item)
        },
      },
      {
        key: 'r',
        label: 'Refresh store',
        hint: 'R',
        handler: () => {
          void loadCatalog()
        },
      },
      {
        key: 'Enter',
        label: 'Perform Action',
        hint: '↵',
        activeOn: () => {
          const { selectedIndex } = stateRef.current
          return selectedIndex >= 0 && selectedIndex < filteredExtensions.length
        },
        handler: () => {
          const { selectedIndex } = stateRef.current
          const item = filteredExtensions[selectedIndex]
          if (!item) return
          if (!item.installed || item.canUpdate) {
            void handleInstall(item)
          } else if (item.installed && !item.isSystem) {
            void handleUninstall(item)
          }
        },
      },
      {
        key: 'Tab',
        label: 'Next Category',
        hint: 'Tab',
        handler: () => {
          setActiveTab((prev) => {
            const idx = TABS.findIndex((t) => t.id === prev)
            const nextTab = TABS[(idx + 1) % TABS.length].id
            nav.goToSection(nextTab)
            return nextTab
          })
          setSelectedIndex(-1)
        },
      },
      {
        key: 'ArrowLeft',
        label: 'Focus Sidebar',
        handler: () => {
          nav.setFocusArea('left')
        },
      },
    ],
    [filteredExtensions]
  )

  const navSections = useMemo<NavSection[]>(() => {
    return TABS.map((tab) => {
      // Find count for this category
      const count = extensions.filter((ext) => {
        if (tab.id === 'installed' && !ext.installed) return false
        if (tab.id === 'updates' && !ext.canUpdate) return false
        if (tab.id !== 'all' && tab.id !== 'installed' && tab.id !== 'updates' && ext.type !== tab.id) {
          return false
        }
        return true
      }).length
      return { id: tab.id, label: tab.label, itemCount: count }
    })
  }, [extensions])

  const nav = _useTwoPanelNav({
    sections: navSections,
    initialFocusArea: 'right',
    onSectionChange: (id: string) => {
      setActiveTab(id)
      setSelectedIndex(-1)
    },
    onFocusRight: () => {
      setSelectedIndex(0)
    },
    rightPanelActions,
  })

  const focusArea = nav.focusArea ?? 'right'
  const activeSectionId = nav.activeSectionId ?? 'all'

  // Sync tab change when left panel drives navigation
  useEffect(() => {
    if (activeSectionId !== activeTab) {
      setActiveTab(activeSectionId)
      setSelectedIndex(-1)
    }
  }, [activeSectionId])

  // Sync omnibar keyhints
  useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [selectedIndex, activeTab, loading, filteredExtensions])

  // Sync footer hints (number of extensions in category)
  useEffect(() => {
    const activeLabel = TABS.find((t) => t.id === activeTab)?.label || activeTab
    window.dispatchEvent(
      new CustomEvent('nuxy-shell-footer-hints', {
        detail: (
          <>
            <span style={{ color: 'var(--color-primary)', fontWeight: 'bold' }}>{activeLabel}</span>
            {ShortcutSep ? <ShortcutSep /> : <span className="nuxy-shortcut-sep">/</span>}
            <span>{filteredExtensions.length} items</span>
          </>
        ),
      })
    )
    return () => {
      window.dispatchEvent(new CustomEvent('nuxy-shell-footer-hints', { detail: null }))
    }
  }, [activeTab, filteredExtensions.length])

  // Currently focused extension details
  const selectedExtension = useMemo(() => {
    if (selectedIndex >= 0 && selectedIndex < filteredExtensions.length) {
      return filteredExtensions[selectedIndex]
    }
    return null
  }, [selectedIndex, filteredExtensions])

  if (loading && extensions.length === 0) {
    return LoadingState ? (
      <LoadingState message="Connecting to extension store..." />
    ) : (
      <div style={{ padding: 'var(--space-4)', textAlign: 'center', opacity: 0.7 }}>Loading...</div>
    )
  }

  // Sidebar navigation panel
  const left = TabBar ? (
    <TabBar
      tabs={navSections}
      active={activeTab}
      orientation="vertical"
      onChange={handleTabChange}
    />
  ) : null

  // Helper function to color code permission security risks
  const getPermissionBadge = (perm: string) => {
    if (!Badge) return <span>{perm}</span>
    let variant = 'default'
    if (perm === 'shell' || perm === 'fs') {
      variant = 'danger'
    } else if (perm === 'network' || perm === 'clipboard') {
      variant = 'warning'
    } else if (perm === 'storage' || perm === 'db') {
      variant = 'success'
    }
    return (
      <Badge key={perm} variant={variant} style={{ marginRight: 'var(--space-1)', marginBottom: 'var(--space-1)' }}>
        {perm}
      </Badge>
    )
  }

  // Right pane split: List of extensions + Detail Card
  const right = (
    <Box style={{ display: 'flex', flexDirection: 'row', width: '100%', height: '100%' }}>
      {/* 1. Extensions List */}
      <ScrollArea style={{ flex: 1, borderRight: '1px solid var(--border-color, rgba(255,255,255,0.1))' }}>
        {error && Alert && (
          <Alert variant="danger" style={{ margin: 'var(--space-2)' }}>
            {error}
          </Alert>
        )}

        {filteredExtensions.length === 0 ? (
          <EmptyState message="No extensions found." />
        ) : (
          List && (
            <List>
              {filteredExtensions.map((ext, idx) => {
                const isActive = focusArea === 'right' && idx === selectedIndex
                const statusText = ext.installed
                  ? ext.canUpdate
                    ? `v${ext.installedVersion} (Update to v${ext.version})`
                    : `Installed v${ext.version}`
                  : `v${ext.version}`

                return (
                  ListItem && (
                    <ListItem
                      key={ext.id}
                      active={isActive}
                      onClick={() => {
                        setSelectedIndex(idx)
                        nav.onItemSelected(idx)
                        nav.setFocusArea('right')
                      }}
                    >
                      <ListItemBody>
                        <ListItemText style={{ fontWeight: 'bold' }}>{ext.name}</ListItemText>
                        <span style={{ fontSize: '0.75em', opacity: 0.6 }}>{ext.description}</span>
                      </ListItemBody>
                      {ListItemMeta && (
                        <ListItemMeta style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          <span style={{ fontSize: '0.8em', opacity: 0.5 }}>{statusText}</span>
                          {ext.canUpdate && Badge && <Badge variant="warning">Update</Badge>}
                          {ext.installed && !ext.canUpdate && Badge && <Badge variant="success">Installed</Badge>}
                        </ListItemMeta>
                      )}
                    </ListItem>
                  )
                )
              })}
            </List>
          )
        )}
      </ScrollArea>

      {/* 2. Extension Detail View */}
      <Box style={{ width: '320px', padding: 'var(--space-3)', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        {selectedExtension ? (
          Card && CardBody ? (
            <Card style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'transparent', border: 'none' }}>
              <CardBody style={{ padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                {/* Header */}
                <Box>
                  <Heading size="md" style={{ margin: 0 }}>{selectedExtension.name}</Heading>
                  <Text size="xs" variant="muted" style={{ fontFamily: 'monospace' }}>
                    {selectedExtension.id}
                  </Text>
                </Box>

                {/* Details */}
                <Box>
                  <Text size="sm"><strong>Author:</strong> {selectedExtension.author}</Text>
                  <Text size="sm">
                    <strong>Version:</strong> {selectedExtension.version}
                    {selectedExtension.installed && ` (Installed: ${selectedExtension.installedVersion})`}
                  </Text>
                  <Text size="sm"><strong>Type:</strong> {selectedExtension.type.toUpperCase()}</Text>
                </Box>

                {/* Description */}
                <Box>
                  <Heading size="sm" style={{ marginBottom: 'var(--space-1)' }}>Description</Heading>
                  <Text size="sm" style={{ opacity: 0.8, lineHeight: 1.4 }}>
                    {selectedExtension.description}
                  </Text>
                </Box>

                {/* Permissions */}
                <Box>
                  <Heading size="sm" style={{ marginBottom: 'var(--space-2)' }}>Permissions Required</Heading>
                  {selectedExtension.permissions && selectedExtension.permissions.length > 0 ? (
                    <Box style={{ display: 'flex', flexWrap: 'wrap' }}>
                      {selectedExtension.permissions.map(getPermissionBadge)}
                    </Box>
                  ) : (
                    <Text size="xs" variant="muted">No permissions required</Text>
                  )}
                </Box>

                {/* Warning about risky permissions */}
                {selectedExtension.permissions?.some((p) => p === 'shell' || p === 'fs') && (
                  <Box
                    style={{
                      background: 'rgba(239, 68, 68, 0.1)',
                      border: '1px solid rgba(239, 68, 68, 0.2)',
                      padding: 'var(--space-2)',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 'var(--space-2)',
                    }}
                  >
                    {IconWarning && <IconWarning style={{ color: 'var(--color-danger)', marginTop: '2px', flexShrink: 0 }} />}
                    <Text size="xs" style={{ color: 'var(--color-danger)', margin: 0 }}>
                      This extension requests system command or file write privileges. Verify publisher integrity.
                    </Text>
                  </Box>
                )}

                {/* Actions */}
                <Box style={{ marginTop: 'auto', display: 'flex', gap: 'var(--space-2)' }}>
                  {(!selectedExtension.installed || selectedExtension.canUpdate) && (
                    <button
                      className={`btn btn--primary`}
                      style={{
                        flex: 1,
                        background: 'var(--color-primary)',
                        color: '#fff',
                        border: 'none',
                        padding: 'var(--space-2)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'var(--space-1)',
                      }}
                      onClick={() => void handleInstall(selectedExtension)}
                    >
                      {IconDownload && <IconDownload size={14} />}
                      {selectedExtension.canUpdate ? 'Update' : 'Install'}
                    </button>
                  )}

                  {selectedExtension.installed && !selectedExtension.isSystem && (
                    <button
                      className={`btn btn--danger`}
                      style={{
                        flex: 1,
                        background: 'rgba(239, 68, 68, 0.2)',
                        color: 'var(--color-danger)',
                        border: '1px solid var(--color-danger)',
                        padding: 'var(--space-2)',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 'var(--space-1)',
                      }}
                      onClick={() => void handleUninstall(selectedExtension)}
                    >
                      {IconTrash && <IconTrash size={14} />}
                      Uninstall
                    </button>
                  )}
                </Box>
              </CardBody>
            </Card>
          ) : (
            <div style={{ opacity: 0.7 }}>Detail views require UI Card components</div>
          )
        ) : (
          <Box style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
            {IconInfo && <IconInfo size={24} style={{ marginBottom: 'var(--space-2)' }} />}
            <Text size="sm" align="center">Select an extension to see details</Text>
          </Box>
        )}
      </Box>
    </Box>
  )

  return <TwoPanel left={left} right={right} split="160px" />
}
