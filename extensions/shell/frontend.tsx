const React = window.React
const { useState, useEffect, useRef } = React

import type { ShellConfig, CommandPaletteAction, KeyAction } from './types.ts'

const _imp = new Function('url', 'return import(url)')
const { parseCoordinate, ensureShellStyles, SHELL_EXT_ID } = await _imp(
  'nuxy-ext://com.nuxy.shell/utils.ts'
)
const { default: CommandPalette } = await _imp('nuxy-ext://com.nuxy.shell/CommandPalette.tsx')
const { ResultCard, CompareCard } = await _imp('nuxy-ext://com.nuxy.shell/ResultCard.tsx')
const { useShellInit, useProviders, useKeyboard, useToolHistory, useDragResize } = await _imp(
  'nuxy-ext://com.nuxy.shell/hooks.tsx'
)

import { useShellData } from './hooks/useShellData.ts'
import { useShellActions } from './hooks/useShellActions.ts'
import { useShellMeta } from './hooks/useShellMeta.ts'
import { useShellKeyboard } from './hooks/useShellKeyboard.ts'
import { useShellSync } from './hooks/useShellSync.ts'
import { ShellResizeHandles } from './components/ShellResizeHandles.tsx'
import { ShellOmniBar } from './components/ShellOmniBar.tsx'
import { ShellProviderResults } from './components/ShellProviderResults.tsx'
import { ShellListResults } from './components/ShellListResults.tsx'
import { ShellShortcutBar } from './components/ShellShortcutBar.tsx'
import { ShellToolView } from './components/ShellToolView.tsx'

ensureShellStyles()

interface Props {
  query: string
}

export default function ShellView({ query: _queryProp }: Props) {
  const {
    ShortcutBar,
    ShortcutHint,
    ShortcutSep,
    Kbd,
    List,
    ListItem,
    ListItemBody,
    ListItemText,
    ListItemActions,
    Toaster,
  } = window.UI || {}

  // Core UI state
  const [query, setQuery] = useState<string>('')
  const [savedQuery, setSavedQuery] = useState<string>('')
  const [selectedIndex, setSelectedIndex] = useState<number>(-1)
  const [activeTool, setActiveTool] = useState<string | null>(null)
  const [ToolComponent, setToolComponent] = useState<React.ComponentType<{
    query: string
    extensionId?: string
  }> | null>(null)
  const [showOmniBar, setShowOmniBar] = useState<boolean>(true)
  const [showCommandPalette, setShowCommandPalette] = useState<boolean>(false)
  const [toolActions, setToolActions] = useState<CommandPaletteAction[]>([])
  const [keyActionHints, setKeyActionHints] = useState<KeyAction[]>([])
  const [footerHints, setFooterHints] = useState<React.ReactNode | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState<boolean>(true)

  useEffect(() => {
    const t = setTimeout(() => setIsInitialLoad(false), 500)
    return () => clearTimeout(t)
  }, [])

  // Refs
  const keyActionsGetterRef = useRef<(() => KeyAction[]) | null>(null)
  const toolActionsRef = useRef<CommandPaletteAction[]>([])
  const containerRef = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)
  const queryGeneration = useRef<number>(0)

  // Drag + resize
  const {
    position,
    size,
    setPosition,
    setSize: _setSize,
    hasDragged,
    isDraggingState,
    handleDragMouseDown,
    handleResizeMouseDown,
  } = useDragResize(containerRef)

  // Data hook
  const {
    tools,
    orchestrators,
    themeStyles,
    settings,
    searchIcon,
    providerStates,
    setProviderStates,
    recordToolUsed,
    isAnyListProviderLoading,
    listResults,
    cfgRef,
    setSettings,
  } = useShellData({
    activeTool,
    savedQuery,
    queryGeneration,
    deps: { useShellInit, useProviders, useToolHistory, SHELL_EXT_ID },
  })

  // Actions hook
  const { copiedId, handleCopy, openTool, handleItemClick, tryOrchestratorRoute } = useShellActions(
    {
      orchestrators,
      savedQuery,
      setActiveTool,
      setProviderStates,
      setQuery,
      setSavedQuery,
      recordToolUsed,
      setToolComponent,
    }
  )

  // Derived state hook
  const { activeToolName, activeToolPlaceholder, itemClass } = useShellMeta({
    activeTool,
    tools,
    selectedIndex,
    listResults,
    themeStyles,
  })

  // Input keyboard hook
  const { handleKeyDown } = useShellKeyboard({
    activeTool,
    query,
    savedQuery,
    selectedIndex,
    listResults,
    setActiveTool,
    setToolComponent,
    setQuery,
    setSavedQuery,
    setSelectedIndex,
    tryOrchestratorRoute,
    handleItemClick,
  })

  // Global keyboard hook (from hooks.tsx)
  useKeyboard({
    activeTool,
    showCommandPalette,
    setShowCommandPalette,
    inputRef,
    setActiveTool,
    setToolComponent,
    setQuery,
    setSavedQuery,
    setSelectedIndex,
    setShowOmniBar,
    keyActionsGetterRef,
    toolActionsRef,
  })

  // Shell sync hook (event listeners + position effects)
  useShellSync({
    containerRef,
    inputRef,
    cfgRef,
    hasDragged,
    activeTool,
    listResults,
    parseCoordinate,
    setPosition,
    setQuery,
    setSavedQuery,
    setProviderStates,
    setActiveTool,
    setToolComponent,
    setSelectedIndex,
    setShowOmniBar,
    setShowCommandPalette,
    setSettings,
    setToolActions,
    setKeyActionHints,
    setFooterHints,
    keyActionsGetterRef,
    toolActionsRef,
  })

  // Sync query display with selection
  useEffect(() => {
    if (activeTool) return
    if (selectedIndex === -1) {
      setQuery(savedQuery)
    } else if (listResults[selectedIndex]) {
      setQuery(listResults[selectedIndex].title)
    }
  }, [selectedIndex, savedQuery, listResults, activeTool])

  const containerStyle: React.CSSProperties = {
    left: position.x,
    top: position.y,
    width: size.width
      ? `${size.width}px`
      : settings?.windowWidth
        ? `${settings.windowWidth}px`
        : undefined,
    height: size.height
      ? `${size.height}px`
      : activeTool
        ? `${settings?.windowMaxHeight ?? 600}px`
        : undefined,
    maxWidth: size.width
      ? 'none'
      : settings?.windowWidth
        ? `${settings.windowWidth}px`
        : undefined,
    maxHeight: size.height ? 'none' : `${settings?.windowMaxHeight ?? 600}px`,
    opacity: settings?.opacity !== undefined ? settings.opacity : undefined,
    transition:
      isDraggingState || isInitialLoad
        ? 'none'
        : 'left 0.3s cubic-bezier(0.16, 1, 0.3, 1), top 0.3s cubic-bezier(0.16, 1, 0.3, 1), width 0.3s cubic-bezier(0.16, 1, 0.3, 1), height 0.3s cubic-bezier(0.16, 1, 0.3, 1), max-width 0.3s cubic-bezier(0.16, 1, 0.3, 1), max-height 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
  }

  return (
    <div
      className="nuxy-shell-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) window.core?.window?.esc?.()
      }}
    >
      <div
        ref={containerRef}
        className={themeStyles?.container ?? 'nuxy-shell-container'}
        style={containerStyle}
      >
        <ShellResizeHandles onResizeMouseDown={handleResizeMouseDown} />

        <div className="nuxy-main-wrapper">
          <div className="nuxy-shell-body">
            <div>
              <ShellOmniBar
                inputRef={inputRef}
                query={query}
                showOmniBar={showOmniBar}
                searchIcon={searchIcon}
                activeToolName={activeToolName}
                activeToolPlaceholder={activeToolPlaceholder}
                onQueryChange={(val) => {
                  setQuery(val)
                  setSavedQuery(val)
                  setSelectedIndex(-1)
                }}
                onKeyDown={handleKeyDown}
                onDragMouseDown={handleDragMouseDown}
              />
            </div>

            {!activeTool && (
              <>
                <ShellProviderResults
                  providerStates={providerStates}
                  copiedId={copiedId}
                  onCopy={handleCopy}
                  ResultCard={ResultCard}
                  CompareCard={CompareCard}
                />
                <ShellListResults
                  listResults={listResults}
                  selectedIndex={selectedIndex}
                  isAnyListProviderLoading={isAnyListProviderLoading}
                  itemClass={itemClass}
                  onItemClick={handleItemClick}
                  List={List}
                  ListItem={ListItem}
                  ListItemBody={ListItemBody}
                  ListItemText={ListItemText}
                  ListItemActions={ListItemActions}
                />
              </>
            )}

            {ToolComponent && activeTool && (
              <ShellToolView ToolComponent={ToolComponent} activeTool={activeTool} query={query} />
            )}
          </div>

          {ShortcutBar && (
            <ShellShortcutBar
              tools={tools}
              activeTool={activeTool}
              selectedIndex={selectedIndex}
              listResults={listResults}
              keyActionHints={keyActionHints}
              toolActions={toolActions}
              footerHints={footerHints}
              ShortcutBar={ShortcutBar}
              ShortcutHint={ShortcutHint}
              ShortcutSep={ShortcutSep}
              Kbd={Kbd}
            />
          )}
        </div>
      </div>

      {showCommandPalette && (
        <CommandPalette
          actions={toolActions}
          onClose={() => {
            setShowCommandPalette(false)
            setTimeout(() => inputRef.current?.focus(), 50)
          }}
          containerRef={containerRef}
          position={position}
        />
      )}
      {Toaster && <Toaster />}
    </div>
  )
}
