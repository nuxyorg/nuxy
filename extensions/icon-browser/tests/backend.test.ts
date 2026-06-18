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

  it('copies the icon name to the clipboard via copyIconName', async () => {
    const { core, handlers } = createMockCore()
    register(core)

    await handlers['copyIconName']({ name: 'search' })

    expect(core.clipboard.writeText).toHaveBeenCalledWith('search')
  })

  it('copies the raw SVG markup to the clipboard via copyIconSvg', async () => {
    const { core, handlers } = createMockCore()
    register(core)

    await handlers['copyIconSvg']({ svg: '<svg></svg>' })

    expect(core.clipboard.writeText).toHaveBeenCalledWith('<svg></svg>')
  })
})
