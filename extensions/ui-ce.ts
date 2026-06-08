import { h } from './ce-utils.ts'

type Child = Node | string | number | null | undefined | false

function appendChildren(el: HTMLElement, children: Child[]): void {
  for (const child of children) {
    if (child == null || child === false) continue
    if (typeof child === 'string' || typeof child === 'number') {
      el.append(document.createTextNode(String(child)))
    } else {
      el.append(child)
    }
  }
}

export function ceList(props?: Record<string, unknown>, ...children: Child[]): HTMLElement {
  const el = h('nuxy-list', props)
  appendChildren(el, children)
  return el
}

export function ceListItem(
  props: Record<string, unknown> & { active?: boolean; onClick?: () => void },
  ...children: Child[]
): HTMLElement {
  const { active, onClick, ...rest } = props
  const el = h('nuxy-list-item', {
    ...rest,
    ...(active ? { active: '' } : {}),
  })
  if (onClick) el.addEventListener('click', onClick)
  appendChildren(el, children)
  return el
}

export function ceListItemBody(props?: Record<string, unknown>, ...children: Child[]): HTMLElement {
  const el = h('nuxy-list-item-body', props)
  appendChildren(el, children)
  return el
}

export function ceListItemText(
  props?: Record<string, unknown> & { variant?: string },
  ...children: Child[]
): HTMLElement {
  const { variant, ...rest } = props ?? {}
  const el = h('nuxy-list-item-text', {
    ...rest,
    ...(variant && variant !== 'default' ? { variant } : {}),
  })
  appendChildren(el, children)
  return el
}

export function ceListItemMeta(props?: Record<string, unknown>, ...children: Child[]): HTMLElement {
  const el = h('nuxy-list-item-meta', props)
  appendChildren(el, children)
  return el
}

export function ceListItemActions(props?: Record<string, unknown>, ...children: Child[]): HTMLElement {
  const el = h('nuxy-list-item-actions', props)
  appendChildren(el, children)
  return el
}

export function ceEmptyState(props: {
  message?: string
  hint?: string
  title?: string
  page?: boolean
  error?: string
}): HTMLElement {
  const el = document.createElement('nuxy-empty-state')
  if (props.message) el.setAttribute('message', props.message)
  if (props.hint) el.setAttribute('hint', props.hint)
  if (props.title) el.setAttribute('title', props.title)
  if (props.page) el.setAttribute('page', '')
  if (props.error) el.setAttribute('error', props.error)
  return el
}

export function ceAlert(props: { variant?: string }, ...children: Child[]): HTMLElement {
  const el = h('nuxy-alert', { variant: props.variant ?? 'info' })
  appendChildren(el, children)
  return el
}

export function ceSectionHeader(props: { label: string; ref?: (el: HTMLDivElement | null) => void }): HTMLElement {
  const el = document.createElement('nuxy-section-header')
  el.setAttribute('label', props.label)
  props.ref?.(el as HTMLDivElement)
  return el
}

export function ceTwoPanel(
  left: HTMLElement,
  right: HTMLElement,
  opts?: { split?: string; style?: Record<string, string> }
): HTMLElement {
  const el = document.createElement('nuxy-two-panel')
  if (opts?.split) el.setAttribute('split', opts.split)
  if (opts?.style) Object.assign(el.style, opts.style)
  el.appendChild(left)
  el.appendChild(right)
  return el
}

export function ceTabBar(props: {
  tabs: Array<{ id: string; label: string; icon?: string }>
  active: string
  orientation?: 'horizontal' | 'vertical'
  onChange: (id: string) => void
}): HTMLElement {
  const el = document.createElement('nuxy-tab-bar')
  el.setAttribute('tabs', JSON.stringify(props.tabs))
  el.setAttribute('active', props.active)
  if (props.orientation) el.setAttribute('orientation', props.orientation)
  el.addEventListener('nuxy-tab-bar-change', (e) => {
    const id = (e as CustomEvent<{ id: string }>).detail.id
    props.onChange(id)
  })
  return el
}

export function ceScrollArea(
  props: { style?: Record<string, string>; ref?: (el: HTMLElement | null) => void },
  ...children: Child[]
): HTMLElement {
  const el = document.createElement('nuxy-scroll-area')
  if (props.style) Object.assign(el.style, props.style)
  props.ref?.(el)
  appendChildren(el, children)
  return el
}

export interface CeSelectOption {
  value: string | boolean
  label: string
}

export function ceSelectBox(props: {
  options: CeSelectOption[]
  value?: unknown
  open: boolean
  focusedIndex: number
  placeholder?: string
  searchable?: boolean
  onSelect: (value: unknown) => void
  onClose: () => void
  onOpen?: (startIndex: number) => void
}): HTMLElement {
  const el = document.createElement('nuxy-select-box')
  el.setAttribute('options', JSON.stringify(props.options))
  if (props.value !== undefined) el.setAttribute('value', String(props.value))
  if (props.open) el.setAttribute('open', '')
  el.setAttribute('focused-index', String(props.focusedIndex))
  if (props.placeholder) el.setAttribute('placeholder', props.placeholder)
  if (props.searchable) el.setAttribute('searchable', '')

  el.addEventListener('nuxy-select-box-select', (e) => {
    const detail = (e as CustomEvent<{ value: string }>).detail
    props.onSelect(detail.value)
  })
  el.addEventListener('nuxy-select-box-close-request', () => props.onClose())
  el.addEventListener('nuxy-select-box-open-request', (e) => {
    const detail = (e as CustomEvent<{ startIndex: number }>).detail
    props.onOpen?.(detail.startIndex)
  })
  return el
}

export function ceInput(props: {
  type?: string
  value?: string
  placeholder?: string
  style?: Record<string, string>
  ref?: (el: HTMLInputElement | null) => void
  onChange?: (value: string) => void
  onBlur?: (value: string) => void
  onKeyDown?: (e: KeyboardEvent) => void
}): HTMLElement {
  const host = document.createElement('nuxy-input')
  if (props.type) host.setAttribute('type', props.type)
  if (props.value !== undefined) host.setAttribute('value', props.value)
  if (props.placeholder) host.setAttribute('placeholder', props.placeholder)
  if (props.style) Object.assign(host.style, props.style)

  queueMicrotask(() => {
    const input = host.querySelector('input') as HTMLInputElement | null
    props.ref?.(input)
    if (!input) return
    if (props.value !== undefined) input.value = props.value
    if (props.onChange) input.addEventListener('input', () => props.onChange!(input.value))
    if (props.onBlur) input.addEventListener('blur', () => props.onBlur!(input.value))
    if (props.onKeyDown) input.addEventListener('keydown', (e) => props.onKeyDown!(e))
  })
  return host
}

export function ceTextarea(props: {
  value?: string
  placeholder?: string
  className?: string
  style?: Record<string, string>
  ref?: (el: HTMLTextAreaElement | null) => void
  onChange?: (value: string) => void
}): HTMLElement {
  const host = document.createElement('nuxy-textarea')
  if (props.className) host.className = props.className
  if (props.value !== undefined) host.setAttribute('value', props.value)
  if (props.placeholder) host.setAttribute('placeholder', props.placeholder)
  if (props.style) Object.assign(host.style, props.style)

  queueMicrotask(() => {
    const input = (host.querySelector('textarea') ?? host) as HTMLTextAreaElement
    props.ref?.(input)
    if (props.value !== undefined) input.value = props.value
    if (props.onChange) input.addEventListener('input', () => props.onChange!(input.value))
  })
  return host
}

export function cePropertiesPanel(props: { title: string; rows: Array<{ label: string; value: string }> }): HTMLElement {
  const el = document.createElement('nuxy-properties-panel')
  el.setAttribute('title', props.title)
  el.setAttribute('rows', JSON.stringify(props.rows))
  return el
}

export function ceMarkdownText(content: string): HTMLElement {
  const el = document.createElement('nuxy-markdown-text')
  el.textContent = content
  return el
}

export function ceSpinner(size = 'sm'): HTMLElement {
  const el = document.createElement('nuxy-spinner')
  el.setAttribute('size', size)
  return el
}

export function ceLoadingState(props: { message?: string; minHeight?: string }): HTMLElement {
  const el = document.createElement('nuxy-loading-state')
  if (props.message) el.setAttribute('message', props.message)
  if (props.minHeight) el.setAttribute('min-height', props.minHeight)
  return el
}
