import { describe, it, expect, vi } from 'vitest'

const hoisted = vi.hoisted(async () => {
  const h = await import('@nuxyorg/extension-sdk/testing')
  h.setupDomGlobals({
    ipc: { invoke: vi.fn() },
    shell: {
      refreshKeyHints: vi.fn(),
    },
  })
  return h
})

vi.mock('@nuxyorg/core', async () => {
  const actual = await vi.importActual<typeof import('@nuxyorg/core')>('@nuxyorg/core')
  return (await hoisted).createNuxyCoreMock(actual as Record<string, unknown>)
})

import { IconBrowserController } from '../controller.ts'

describe('IconBrowserController.setQuery', () => {
  it('filters icons case-insensitively and resets the active index', () => {
    const controller = new IconBrowserController(() => {})
    controller.store.setState({ icons: ['home', 'search', 'home-alt'], activeIndex: 2 })

    controller.setQuery('Home')

    expect(controller.state.filtered).toEqual(['home', 'home-alt'])
    expect(controller.state.activeIndex).toBe(-1)
  })
})

describe('IconBrowserController.setActiveIndex', () => {
  it('updates the active index in store', () => {
    const controller = new IconBrowserController(() => {})
    controller.setActiveIndex(3)
    expect(controller.state.activeIndex).toBe(3)
  })
})
