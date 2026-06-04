import { describe, it, expect, vi } from 'vitest'

// window.React is evaluated at module load time — must be defined before the import executes
vi.hoisted(() => {
  ;(globalThis as any).window = { React: {} }
})

import { useShellKeyboard } from './useShellKeyboard.ts'
import type { ListItem } from '../types.ts'

const makeItem = (id: string, title: string): ListItem => ({ id, title }) as ListItem

const makeEvent = (key: string): { key: string; preventDefault: ReturnType<typeof vi.fn> } => ({
  key,
  preventDefault: vi.fn(),
})

function makeParams(overrides: Partial<Parameters<typeof useShellKeyboard>[0]> = {}) {
  const selectionSourceRef = { current: 'type' as 'type' | 'nav' }
  return {
    activeTool: null,
    query: '',
    savedQuery: '',
    selectedIndex: -1,
    listResults: [],
    selectionSourceRef,
    setActiveTool: vi.fn(),
    setToolComponent: vi.fn(),
    setQuery: vi.fn(),
    setSavedQuery: vi.fn(),
    setSelectedIndex: vi.fn(),
    tryOrchestratorRoute: vi.fn().mockResolvedValue(undefined),
    handleItemClick: vi.fn().mockResolvedValue(undefined),
    ...overrides,
  }
}

describe('useShellKeyboard', () => {
  describe('ArrowDown', () => {
    it('marks selectionSourceRef as nav', () => {
      const params = makeParams({ listResults: [makeItem('t1', 'Tool')] })
      const { handleKeyDown } = useShellKeyboard(params)
      handleKeyDown(makeEvent('ArrowDown') as any)
      expect(params.selectionSourceRef.current).toBe('nav')
    })

    it('calls setSelectedIndex incrementing', () => {
      const params = makeParams({
        selectedIndex: 0,
        listResults: [makeItem('t1', 'A'), makeItem('t2', 'B')],
      })
      const { handleKeyDown } = useShellKeyboard(params)
      handleKeyDown(makeEvent('ArrowDown') as any)
      const updater = params.setSelectedIndex.mock.calls[0][0] as (prev: number) => number
      expect(updater(0)).toBe(1)
    })

    it('does not exceed listResults length', () => {
      const params = makeParams({
        selectedIndex: 1,
        listResults: [makeItem('t1', 'A'), makeItem('t2', 'B')],
      })
      const { handleKeyDown } = useShellKeyboard(params)
      handleKeyDown(makeEvent('ArrowDown') as any)
      const updater = params.setSelectedIndex.mock.calls[0][0] as (prev: number) => number
      expect(updater(1)).toBe(1)
    })
  })

  describe('ArrowUp', () => {
    it('marks selectionSourceRef as nav', () => {
      const params = makeParams({
        selectedIndex: 1,
        listResults: [makeItem('t1', 'A'), makeItem('t2', 'B')],
      })
      const { handleKeyDown } = useShellKeyboard(params)
      handleKeyDown(makeEvent('ArrowUp') as any)
      expect(params.selectionSourceRef.current).toBe('nav')
    })

    it('allows going to index -1 (above first item)', () => {
      const params = makeParams({
        selectedIndex: 0,
        listResults: [makeItem('t1', 'A')],
      })
      const { handleKeyDown } = useShellKeyboard(params)
      handleKeyDown(makeEvent('ArrowUp') as any)
      const updater = params.setSelectedIndex.mock.calls[0][0] as (prev: number) => number
      expect(updater(0)).toBe(-1)
    })
  })

  describe('Enter', () => {
    it('triggers orchestrator when selectedIndex < 0 and query is non-empty', () => {
      const params = makeParams({ selectedIndex: -1, savedQuery: 'test query' })
      const { handleKeyDown } = useShellKeyboard(params)
      handleKeyDown(makeEvent('Enter') as any)
      expect(params.tryOrchestratorRoute).toHaveBeenCalled()
    })

    it('triggers orchestrator when selectedIndex >= 0 but listResults is empty', () => {
      const params = makeParams({ selectedIndex: 0, listResults: [], savedQuery: 'test' })
      const { handleKeyDown } = useShellKeyboard(params)
      handleKeyDown(makeEvent('Enter') as any)
      expect(params.tryOrchestratorRoute).toHaveBeenCalled()
    })

    it('does NOT trigger orchestrator when savedQuery is blank', () => {
      const params = makeParams({ selectedIndex: -1, savedQuery: '   ' })
      const { handleKeyDown } = useShellKeyboard(params)
      handleKeyDown(makeEvent('Enter') as any)
      expect(params.tryOrchestratorRoute).not.toHaveBeenCalled()
    })

    it('activates the selected item when selectedIndex >= 0 and item exists', () => {
      const item = makeItem('t1', 'Calculator')
      const params = makeParams({
        selectedIndex: 0,
        listResults: [item],
        savedQuery: 'calc',
      })
      const { handleKeyDown } = useShellKeyboard(params)
      handleKeyDown(makeEvent('Enter') as any)
      expect(params.handleItemClick).toHaveBeenCalledWith(item)
      expect(params.tryOrchestratorRoute).not.toHaveBeenCalled()
    })
  })

  describe('ArrowRight autocomplete', () => {
    it('autocompletes from the currently selected item', () => {
      const item = makeItem('t1', 'Calculator')
      const params = makeParams({ selectedIndex: 0, listResults: [item] })
      const { handleKeyDown } = useShellKeyboard(params)
      handleKeyDown(makeEvent('ArrowRight') as any)
      expect(params.setSavedQuery).toHaveBeenCalledWith('Calculator')
      expect(params.setQuery).toHaveBeenCalledWith('Calculator')
      expect(params.setSelectedIndex).toHaveBeenCalledWith(-1)
    })

    it('does nothing when selectedIndex is -1', () => {
      const item = makeItem('t1', 'Calculator')
      const params = makeParams({ selectedIndex: -1, listResults: [item] })
      const { handleKeyDown } = useShellKeyboard(params)
      handleKeyDown(makeEvent('ArrowRight') as any)
      expect(params.setSavedQuery).not.toHaveBeenCalled()
    })
  })

  describe('Backspace inside active tool', () => {
    it('exits the tool when query is empty', () => {
      const params = makeParams({ activeTool: 'com.nuxy.calc', query: '' })
      const { handleKeyDown } = useShellKeyboard(params)
      handleKeyDown(makeEvent('Backspace') as any)
      expect(params.setActiveTool).toHaveBeenCalledWith(null)
      expect(params.setToolComponent).toHaveBeenCalledWith(null)
    })

    it('does not exit the tool when query is non-empty', () => {
      const params = makeParams({ activeTool: 'com.nuxy.calc', query: 'x' })
      const { handleKeyDown } = useShellKeyboard(params)
      handleKeyDown(makeEvent('Backspace') as any)
      expect(params.setActiveTool).not.toHaveBeenCalled()
    })
  })
})
