import { describe, it, expect } from 'vitest'
import { buildListResults } from './listResults.ts'
import type { Tool, ProviderState } from '../types.ts'

const makeTool = (id: string, name: string): Tool =>
  ({ id, manifest: { id, name } } as Tool)

describe('buildListResults', () => {
  it('returns all tools when query is empty and no recents', () => {
    const tools = [makeTool('t1', 'Calculator'), makeTool('t2', 'Clipboard')]
    const result = buildListResults(tools, '', {}, [])
    expect(result.map((r) => r.id)).toEqual(['t1', 't2'])
  })

  it('filters tools by title when query is provided', () => {
    const tools = [makeTool('t1', 'Calculator'), makeTool('t2', 'Clipboard')]
    const result = buildListResults(tools, 'calc', {}, [])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('t1')
  })

  it('filters tools by id when query matches id', () => {
    const tools = [makeTool('com.nuxy.clip', 'Clipboard'), makeTool('com.nuxy.calc', 'Calc')]
    const result = buildListResults(tools, 'clip', {}, [])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('com.nuxy.clip')
  })

  it('places recent tools first when query is empty', () => {
    const tools = [makeTool('t1', 'A'), makeTool('t2', 'B'), makeTool('t3', 'C')]
    const result = buildListResults(tools, '', {}, ['t3', 't1'])
    expect(result[0].id).toBe('t3')
    expect(result[1].id).toBe('t1')
    expect(result[2].id).toBe('t2')
  })

  it('deduplicates tools', () => {
    const tools = [makeTool('t1', 'A'), makeTool('t1', 'A duplicate')]
    const result = buildListResults(tools, '', {}, [])
    expect(result).toHaveLength(1)
  })

  it('appends list provider items after tools', () => {
    const tools = [makeTool('t1', 'Tool')]
    const providerStates: Record<string, ProviderState> = {
      p1: {
        loading: false,
        type: 'list',
        name: 'Provider',
        items: [{ id: 'p1-item', title: 'From Provider' }],
      },
    }
    const result = buildListResults(tools, '', providerStates, [])
    expect(result).toHaveLength(2)
    expect(result[1].id).toBe('p1-item')
  })

  it('skips provider items that are loading', () => {
    const tools: Tool[] = []
    const providerStates: Record<string, ProviderState> = {
      p1: {
        loading: true,
        type: 'list',
        name: 'Provider',
        items: [{ id: 'p1-item', title: 'From Provider' }],
      },
    }
    const result = buildListResults(tools, '', providerStates, [])
    expect(result).toHaveLength(0)
  })

  it('skips non-list provider types', () => {
    const tools: Tool[] = []
    const providerStates: Record<string, ProviderState> = {
      p1: {
        loading: false,
        type: 'result',
        name: 'Provider',
        items: [{ id: 'p1-item', title: 'Result' }],
      },
    }
    const result = buildListResults(tools, '', providerStates, [])
    expect(result).toHaveLength(0)
  })

  it('deduplicates provider items already present as tools', () => {
    const tools = [makeTool('shared', 'Shared')]
    const providerStates: Record<string, ProviderState> = {
      p1: {
        loading: false,
        type: 'list',
        name: 'Provider',
        items: [{ id: 'shared', title: 'Shared from provider' }],
      },
    }
    const result = buildListResults(tools, '', providerStates, [])
    expect(result).toHaveLength(1)
  })
})
