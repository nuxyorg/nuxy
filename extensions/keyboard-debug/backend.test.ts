import { describe, it, expect, beforeEach } from 'vitest'
import { type CoreContext, createMockCore } from '@nuxy/extension-sdk'
import { register } from './backend.ts'

describe('keyboard-debug backend', () => {
  let core: CoreContext
  let handlers: Record<string, (payload?: unknown) => Promise<unknown>>

  beforeEach(() => {
    ;({ core, handlers } = createMockCore())
    register(core)
  })

  it('registers a tool', () => {
    expect(core.registry.registerTool).toHaveBeenCalledWith(
      expect.objectContaining({ name: expect.any(String) })
    )
  })

  it('exposes no IPC handlers', () => {
    expect(Object.keys(handlers)).toHaveLength(0)
  })
})
