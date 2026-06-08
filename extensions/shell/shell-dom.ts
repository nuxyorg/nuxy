import { h } from '../ce-utils.ts'
import { ceList, ceListItem, ceListItemBody, ceListItemText, ceListItemMeta } from '../ui-ce.ts'
import type { ShellController } from './shell-controller.ts'
import type { CommandPaletteAction, KeyAction, ListItem, ProviderState } from './types.ts'
import type { OmnibarSection } from './utils/listResults.ts'

interface ResultItem {
  id: string
  title: string
  value?: string
  meta?: {
    left?: { text: string; badge: string }
    right?: { text: string; badge: string }
  }
}

function createResultCard(
  item: ResultItem,
  providerName: string,
  copiedId: string | null,
  onCopy: (id: string) => void
): HTMLElement {
  const el = document.createElement('nuxy-result-card')
  el.setAttribute('item-id', item.id)
  el.setAttribute('title', item.title)
  if (item.value) el.setAttribute('value', item.value)
  el.setAttribute('provider-name', providerName)
  if (copiedId === item.id) el.setAttribute('copied', '')
  else el.removeAttribute('copied')
  el.addEventListener('nuxy-result-card-copy', (e) => {
    const detail = (e as CustomEvent<{ id: string }>).detail
    onCopy(detail.id)
  })
  return el
}

function createCompareCard(
  item: ResultItem,
  copiedId: string | null,
  onCopy: (id: string) => void
): HTMLElement | null {
  if (!item.meta?.left || !item.meta?.right) return null
  const el = document.createElement('nuxy-compare-card')
  el.setAttribute('item-id', item.id)
  if (item.value) el.setAttribute('value', item.value)
  el.setAttribute('meta', JSON.stringify(item.meta))
  if (copiedId === item.id) el.setAttribute('copied', '')
  else el.removeAttribute('copied')
  el.addEventListener('nuxy-result-card-copy', (e) => {
    const detail = (e as CustomEvent<{ id: string }>).detail
    onCopy(detail.id)
  })
  return el
}

export function renderProviderResults(
  providerStates: Record<string, ProviderState>,
  copiedId: string | null,
  onCopy: (id: string) => void
): DocumentFragment {
  const frag = document.createDocumentFragment()
  const resultIds = Object.keys(providerStates).filter((id) => providerStates[id].type === 'result')
  const compareIds = Object.keys(providerStates).filter((id) => providerStates[id].type === 'compare')

  for (const id of resultIds) {
    const state = providerStates[id]
    const section = h('div', { className: 'nuxy-provider-section' })
    const header = h('div', { className: 'nuxy-provider-section__header' }, h('span', null, state.name))
    if (state.loading) {
      header.appendChild(h('div', { className: 'nuxy-provider-section__loading-dot' }))
      section.appendChild(header)
      section.appendChild(h('div', { className: 'nuxy-skeleton-result nuxy-shimmer-bg' }))
      frag.appendChild(section)
      continue
    }
    if (!state.items || state.items.length === 0) continue
    section.appendChild(header)
    for (const item of state.items as ResultItem[]) {
      section.appendChild(createResultCard(item, state.name, copiedId, onCopy))
    }
    frag.appendChild(section)
  }

  for (const id of compareIds) {
    const state = providerStates[id]
    const section = h('div', { className: 'nuxy-provider-section' })
    const header = h('div', { className: 'nuxy-provider-section__header' }, h('span', null, state.name))
    if (state.loading) {
      header.appendChild(h('div', { className: 'nuxy-provider-section__loading-dot' }))
      section.appendChild(header)
      section.appendChild(h('div', { className: 'nuxy-skeleton-compare nuxy-shimmer-bg' }))
      frag.appendChild(section)
      continue
    }
    if (!state.items || state.items.length === 0) continue
    section.appendChild(header)
    for (const item of state.items as ResultItem[]) {
      const card = createCompareCard(item, copiedId, onCopy)
      if (card) section.appendChild(card)
    }
    frag.appendChild(section)
  }

  return frag
}

function renderListItem(
  item: ListItem,
  flatIndex: number,
  selectedIndex: number,
  onItemClick: (item: ListItem) => void,
  onItemEl?: (index: number, el: HTMLElement) => void
): HTMLElement {
  const el = ceListItem(
    { active: flatIndex === selectedIndex, onClick: () => onItemClick(item) },
    ceListItemBody(
      null,
      ceListItemText(null, item.title),
      item.subtitle ? ceListItemMeta(null, item.subtitle) : null
    )
  )
  onItemEl?.(flatIndex, el)
  return el
}

export function renderOmnibarSections(
  sections: OmnibarSection[],
  savedQuery: string,
  selectedIndex: number,
  isAnyListProviderLoading: boolean,
  onItemClick: (item: ListItem) => void,
  onItemEl?: (index: number, el: HTMLElement) => void
): DocumentFragment {
  const frag = document.createDocumentFragment()
  if (sections.length === 0 && !isAnyListProviderLoading) return frag

  const hideToolsHeader = savedQuery.trim().length === 0
  let flatIndex = 0
  const sectionNodes: HTMLElement[] = []

  for (const section of sections) {
    if (section.items.length === 0 && !section.loading) continue
    const showHeader = section.id !== 'tools' || !hideToolsHeader
    const sectionEl = h('div', { className: 'nuxy-provider-section' })
    if (showHeader) {
      const header = h('div', { className: 'nuxy-provider-section__header' }, h('span', null, section.label))
      if (section.loading) header.appendChild(h('div', { className: 'nuxy-provider-section__loading-dot' }))
      sectionEl.appendChild(header)
    }
    for (const item of section.items) {
      sectionEl.appendChild(renderListItem(item, flatIndex, selectedIndex, onItemClick, onItemEl))
      flatIndex += 1
    }
    if (section.loading && section.items.length === 0) {
      sectionEl.appendChild(
        h('div', { className: 'nuxy-skeleton-list' }, h('div', { className: 'nuxy-skeleton-list-item nuxy-shimmer-bg' }))
      )
    }
    sectionNodes.push(sectionEl)
  }

  if (sectionNodes.length > 0) {
    const list = ceList({ role: 'listbox', 'aria-label': 'Results' })
    list.classList.add('nuxy-shell-results-list')
    sectionNodes.forEach((n) => list.appendChild(n))
    frag.appendChild(list)
  }

  if (isAnyListProviderLoading && !sections.some((s) => s.loading)) {
    const skel = h('div', { className: 'nuxy-skeleton-list nuxy-shell-results-list' })
    skel.appendChild(h('div', { className: 'nuxy-skeleton-list-item nuxy-shimmer-bg' }))
    const skel2 = h('div', { className: 'nuxy-skeleton-list-item nuxy-shimmer-bg' })
    skel2.style.width = '80%'
    skel.appendChild(skel2)
    frag.appendChild(skel)
  }

  return frag
}

function createPortalHost(
  portalEl: HTMLElement | null,
  hostId: string,
  children?: HTMLElement | null
): HTMLElement {
  const host = document.createElement('nuxy-portal-host')
  if (hostId) host.id = hostId
  ;(host as HTMLElement & { portalElement: HTMLElement | null }).portalElement = portalEl
  if (!portalEl && children) host.appendChild(children)
  return host
}

export function renderShortcutBar(
  ctrl: ShellController,
  toolActions: CommandPaletteAction[],
  keyActionHints: KeyAction[],
  footerPortal: HTMLElement | null
): HTMLElement {
  const { tools, activeTool, selectedIndex, listResults } = ctrl.state
  const t = ctrl.t.t

  const bar = document.createElement('nuxy-shortcut-bar')
  bar.style.justifyContent = 'space-between'

  const leftHint = document.createElement('nuxy-shortcut-hint')
  const rightHint = document.createElement('nuxy-shortcut-hint')

  const hasFooterContent = footerPortal != null || (activeTool != null && keyActionHints.length > 0)

  if (hasFooterContent) {
    if (footerPortal) leftHint.appendChild(createPortalHost(footerPortal, 'nuxy-footer-portal-host'))
    if (activeTool) {
      keyActionHints.forEach((a, i) => {
        if (i > 0 || footerPortal) {
          leftHint.appendChild(document.createElement('nuxy-shortcut-sep'))
        }
        const action = h('span', { className: 'nuxy-shortcut-action', onClick: () => a.handler() })
        const keys = Array.isArray(a.hint) ? a.hint : [a.hint]
        keys.forEach((k) => {
          const kbd = document.createElement('nuxy-kbd')
          kbd.setAttribute('keys', k)
          action.appendChild(kbd)
        })
        action.appendChild(h('span', null, a.label))
        leftHint.appendChild(action)
      })
    }
  } else {
    leftHint.appendChild(h('span', null, t('footer.extensionsLoaded', { count: tools.length + 1 })))
  }

  if (selectedIndex >= 0 && listResults.length > 0 && !activeTool) {
    rightHint.appendChild(h('span', null, t('footer.pressToRun')))
    const enter = document.createElement('nuxy-kbd')
    enter.setAttribute('keys', '↵')
    rightHint.appendChild(enter)
    rightHint.appendChild(h('span', null, t('footer.toRun')))
  } else if (toolActions.length > 0) {
    const ctrlKbd = document.createElement('nuxy-kbd')
    ctrlKbd.setAttribute('keys', 'Ctrl')
    const kKbd = document.createElement('nuxy-kbd')
    kKbd.setAttribute('keys', 'K')
    rightHint.appendChild(ctrlKbd)
    rightHint.appendChild(kKbd)
    rightHint.appendChild(h('span', null, t('footer.toActions')))
  }

  bar.appendChild(leftHint)
  bar.appendChild(rightHint)
  return bar
}

export function createOmniBar(
  ctrl: ShellController,
  onInputRef: (input: HTMLInputElement | null) => void
): HTMLElement {
  const { query, showOmniBar, searchIcon, bridge } = ctrl.state
  const activeToolName = ctrl.activeToolName
  const activeToolPlaceholder = ctrl.activeToolPlaceholder
  const t = ctrl.t.t
  const isLoading = Object.values(ctrl.state.providerStates).some((s) => s.loading)
  const showPortalRegion = bridge.omniBarPortal != null || isLoading

  const placeholder = activeToolPlaceholder
    ? activeToolPlaceholder
    : activeToolName
      ? t('omniBar.searchTool', { toolName: activeToolName })
      : t('omniBar.placeholder')

  const omniBar = document.createElement('nuxy-shell-omni-bar')
  omniBar.setAttribute('query', query)
  omniBar.setAttribute('placeholder', placeholder)
  omniBar.setAttribute('aria-label', t('omniBar.ariaLabel'))
  if (activeToolName) omniBar.setAttribute('active-tool-name', activeToolName)
  if (!showOmniBar) {
    omniBar.setAttribute('static', '')
    omniBar.setAttribute('disabled', '')
  }
  ;(omniBar as HTMLElement & { searchIconHtml: string }).searchIconHtml = searchIcon ?? ''

  omniBar.addEventListener('mousedown', (e) => ctrl.handleDragMouseDown(e))
  omniBar.addEventListener('click', () => showOmniBar && ctrl.refs.input?.focus())
  omniBar.addEventListener('keydown', (e) => ctrl.handleOmniKeyDown(e as KeyboardEvent))

  queueMicrotask(() => {
    const input =
      (omniBar as HTMLElement & { nativeInput?: HTMLInputElement }).nativeInput ??
      omniBar.querySelector('input')
    onInputRef(input)
    if (input) {
      if (input.value !== query) input.value = query
      input.addEventListener('input', () => ctrl.handleQueryChange(input.value))
      if (!ctrl.state.activeTool && !ctrl.state.showCommandPalette) {
        queueMicrotask(() => input.focus())
      }
    }
  })

  if (showPortalRegion) {
    const portalHost = createPortalHost(
      bridge.omniBarPortal,
      'nuxy-omnibar-portal-host',
      isLoading && !bridge.omniBarPortal
        ? h('span', { className: 'nuxy-shell-omni-bar__loader' })
        : null
    )
    portalHost.addEventListener('mousedown', (e) => e.stopPropagation())
    omniBar.appendChild(portalHost)
  }

  return omniBar
}

export function createToolHost(ctrl: ShellController): HTMLElement {
  const host = document.createElement('nuxy-tool-host') as HTMLElement & {
    extensionId: string
    query: string
    committedQuery: string
  }
  host.extensionId = ctrl.state.activeTool ?? ''
  host.query = ctrl.state.query
  host.committedQuery = ctrl.state.savedQuery
  return host
}

export function createCommandPalette(ctrl: ShellController): HTMLElement {
  const el = document.createElement('nuxy-command-palette') as HTMLElement & {
    actions: CommandPaletteAction[]
    containerEl: HTMLElement | null
    position: { x: number; y: number }
    translateFn: (key: string) => string
    onClose: (() => void) | null
  }
  el.actions = ctrl.state.bridge.toolActions as CommandPaletteAction[]
  el.containerEl = ctrl.refs.container
  el.position = ctrl.state.position
  el.translateFn = ctrl.t.t
  el.onClose = () => ctrl.closeCommandPalette()
  return el
}

export function createResizeHandles(ctrl: ShellController): HTMLElement {
  const host = document.createElement('nuxy-shell-resize-handles')
  host.addEventListener('nuxy-shell-resize-start', (e) => {
    const detail = (e as CustomEvent<{ direction: string; nativeEvent: MouseEvent }>).detail
    ctrl.handleResizeMouseDown(detail.nativeEvent, detail.direction)
  })
  return host
}
