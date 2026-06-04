import { describe, it, expect } from 'vitest'
import { buildListResults, buildOmnibarSections } from './listResults.ts'
import type { Tool, ProviderState, Provider } from '../types.ts'

const makeTool = (id: string, name: string): Tool => ({ id, manifest: { id, name } }) as Tool

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

  it('keeps execute provider items when id matches a tool', () => {
    const tools = [makeTool('com.nuxy.notes', 'Notes')]
    const providerStates: Record<string, ProviderState> = {
      p1: {
        loading: false,
        type: 'list',
        name: 'Notes',
        items: [
          {
            id: 'com.nuxy.notes',
            title: 'Save as note',
            execute: { channel: 'notes:create_from_provider', payload: { text: 'hi' } },
          },
        ],
      },
    }
    const result = buildListResults(tools, 'hi', providerStates, [])
    expect(result.some((i) => i.execute?.channel === 'notes:create_from_provider')).toBe(true)
  })
})

describe('buildOmnibarSections', () => {
  it('puts tools in the first section and flatItems matches section items', () => {
    const tools = [makeTool('t1', 'Calculator'), makeTool('t2', 'Clipboard')]
    const { sections, flatItems } = buildOmnibarSections(tools, '', {}, [], [])
    expect(sections[0]).toEqual({
      id: 'tools',
      label: 'Tools',
      items: expect.any(Array),
    })
    expect(sections[0].items).toHaveLength(2)
    expect(flatItems).toEqual(sections.flatMap((s) => s.items))
  })

  it('creates one section per list provider with provider name as label', () => {
    const providerStates: Record<string, ProviderState> = {
      'com.nuxy.notes': {
        loading: false,
        type: 'list',
        name: 'Notes',
        items: [{ id: 'note-action', title: 'Save as note', execute: { channel: 'notes:create' } }],
      },
    }
    const providers: Provider[] = [
      {
        id: 'com.nuxy.notes',
        manifest: { name: 'Notes', providerType: 'list' } as Provider['manifest'],
      },
    ]
    const { sections, flatItems } = buildOmnibarSections([], 'hello', providerStates, [], providers)
    expect(sections.map((s) => s.id)).toEqual(['com.nuxy.notes'])
    expect(sections[0].label).toBe('Notes')
    expect(flatItems[0].title).toBe('Save as note')
  })

  it('merges providers sharing providerGroup into one section', () => {
    const providerStates: Record<string, ProviderState> = {
      p1: {
        loading: false,
        type: 'list',
        name: 'Notes',
        items: [{ id: 'a', title: 'Save as note' }],
      },
      p2: {
        loading: false,
        type: 'list',
        name: 'Ask Ollama',
        items: [{ id: 'b', title: 'Ask Ollama' }],
      },
    }
    const providers: Provider[] = [
      {
        id: 'p1',
        manifest: { name: 'Notes', providerGroup: 'actions' } as Provider['manifest'],
      },
      {
        id: 'p2',
        manifest: { name: 'Ask Ollama', providerGroup: 'actions' } as Provider['manifest'],
      },
    ]
    const { sections } = buildOmnibarSections([], 'q', providerStates, [], providers)
    expect(sections).toHaveLength(1)
    expect(sections[0].id).toBe('actions')
    expect(sections[0].label).toBe('Actions')
    expect(sections[0].items).toHaveLength(2)
  })

  it('uses providerGroupLabel when set', () => {
    const providerStates: Record<string, ProviderState> = {
      p1: {
        loading: false,
        type: 'list',
        name: 'Notes',
        items: [{ id: 'a', title: 'Save' }],
      },
    }
    const providers: Provider[] = [
      {
        id: 'p1',
        manifest: {
          name: 'Notes',
          providerGroup: 'actions',
          providerGroupLabel: 'Quick actions',
        } as Provider['manifest'],
      },
    ]
    const { sections } = buildOmnibarSections([], 'q', providerStates, [], providers)
    expect(sections[0].label).toBe('Quick actions')
  })

  it('includes loading list provider sections before items arrive', () => {
    const providerStates: Record<string, ProviderState> = {
      p1: { loading: true, type: 'list', name: 'Slow', items: [] },
    }
    const { sections } = buildOmnibarSections(
      [],
      'q',
      providerStates,
      [],
      [{ id: 'p1', manifest: { name: 'Slow' } as Provider['manifest'] }]
    )
    expect(sections[0].loading).toBe(true)
    expect(sections[0].items).toHaveLength(0)
  })

  it('orders provider sections by providers array registration order', () => {
    const providerStates: Record<string, ProviderState> = {
      z: {
        loading: false,
        type: 'list',
        name: 'Zebra',
        items: [{ id: 'z1', title: 'Z' }],
      },
      a: {
        loading: false,
        type: 'list',
        name: 'Alpha',
        items: [{ id: 'a1', title: 'A' }],
      },
    }
    const providers: Provider[] = [
      { id: 'a', manifest: { name: 'Alpha' } as Provider['manifest'] },
      { id: 'z', manifest: { name: 'Zebra' } as Provider['manifest'] },
    ]
    const { sections } = buildOmnibarSections([], 'q', providerStates, [], providers)
    expect(sections.map((s) => s.id)).toEqual(['a', 'z'])
  })
})
