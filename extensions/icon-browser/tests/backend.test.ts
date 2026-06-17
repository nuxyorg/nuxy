import { describe, it, expect } from 'vitest'
import { createMockCore } from '@nuxyorg/extension-sdk/testing'
import { register } from '../backend.ts'

describe('icon-browser backend', () => {
  it('registers as a tool with the correct name', () => {
    const { core } = createMockCore()
    register(core)
    expect(core.registry.registerTool).toHaveBeenCalledOnce()
    expect(core.registry.registerTool).toHaveBeenCalledWith({ name: 'icon-browser' })
  })
})
