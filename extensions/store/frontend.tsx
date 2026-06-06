const React = window.React
const { useState, useRef } = React

const EXT_ID = 'com.nuxy.store'

import { _useTranslation, _useTwoPanelNav } from '../ui-hooks.ts'
import { useStoreData } from './hooks/useStoreData.ts'
import { useStoreActions } from './hooks/useStoreActions.ts'
import { useStoreDerivedData } from './hooks/useStoreDerivedData.ts'
import { useStoreSync } from './hooks/useStoreSync.tsx'
import { buildStoreRightPanelActions } from './hooks/useStoreKeyboard.ts'
import { StoreExtensionList } from './components/StoreExtensionList.tsx'
import { StoreExtensionDetail } from './components/StoreExtensionDetail.tsx'

interface NavSection {
  id: string
  label: string
  itemCount: number
}

interface Nav {
  focusArea: 'left' | 'right'
  activeSectionId: string
  setFocusArea: (area: 'left' | 'right') => void
  goToSection: (id: string) => void
  onItemSelected: (idx: number) => void
  setActiveSection: (id: string) => void
}

export default function StoreView({ query }: { query: string }) {
  const { TwoPanel, TabBar, Box } = window.UI || {}
  const LoadingState = (window.UI as any)?.LoadingState ?? null
  const { t } = _useTranslation(EXT_ID)

  const { extensions, loading, error, setLoading, setError, loadCatalog } = useStoreData()
  const [activeTab, setActiveTab] = useState<string>('all')
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)

  const stateRef = useRef({ selectedIndex })
  stateRef.current = { selectedIndex }
  const navRef = useRef<Nav | null>(null)

  const {
    filteredExtensions,
    navSections: rawNavSections,
    selectedExtension,
  } = useStoreDerivedData({
    extensions,
    activeTab,
    query,
    selectedIndex,
  })

  const navSections = rawNavSections.map((s) => ({ ...s, label: t(`tabs.${s.id}`) || s.label }))

  const { handleInstall, handleUninstall } = useStoreActions({
    loading,
    setLoading,
    setError,
    loadCatalog,
    t,
  })

  const rightPanelActions = buildStoreRightPanelActions({
    filteredExtensions,
    setSelectedIndex,
    setActiveTab,
    stateRef,
    nav: {
      setFocusArea: (a) => navRef.current?.setFocusArea(a),
      goToSection: (id) => navRef.current?.goToSection(id),
    },
    handleInstall,
    handleUninstall,
    loadCatalog,
    t,
  })

  const nav = _useTwoPanelNav({
    sections: navSections,
    initialFocusArea: 'right',
    onSectionChange: (id: string) => {
      setActiveTab(id)
      setSelectedIndex(-1)
    },
    onFocusRight: () => setSelectedIndex(0),
    rightPanelActions,
  })

  navRef.current = nav

  const focusArea = nav.focusArea ?? 'right'
  const activeSectionId = nav.activeSectionId ?? 'all'

  useStoreSync({
    selectedIndex,
    activeTab,
    loading,
    filteredExtensionsLength: filteredExtensions.length,
    activeSectionId,
    setActiveTab,
    setSelectedIndex,
    t,
  })

  if (loading && extensions.length === 0) {
    return LoadingState ? (
      <LoadingState message={t('loading.connecting')} />
    ) : (
      <div style={{ padding: 'var(--space-4)', textAlign: 'center', opacity: 0.7 }}>
        {t('loading.connecting')}
      </div>
    )
  }

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    setSelectedIndex(-1)
    nav.goToSection(tabId)
  }

  const left = TabBar ? (
    <TabBar
      tabs={navSections}
      active={activeTab}
      orientation="vertical"
      onChange={handleTabChange}
    />
  ) : null

  const right = (
    <Box style={{ display: 'flex', flexDirection: 'row', width: '100%', height: '100%' }}>
      <StoreExtensionList
        extensions={filteredExtensions}
        selectedIndex={selectedIndex}
        focusArea={focusArea}
        error={error}
        onSelect={setSelectedIndex}
        onItemSelected={nav.onItemSelected}
        setFocusArea={nav.setFocusArea}
        t={t}
      />
      <Box style={{ width: '320px', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <StoreExtensionDetail
          extension={selectedExtension}
          onInstall={(ext) => void handleInstall(ext)}
          onUninstall={(ext) => void handleUninstall(ext)}
          t={t}
        />
      </Box>
    </Box>
  )

  return <TwoPanel left={left} right={right} split="160px" />
}
