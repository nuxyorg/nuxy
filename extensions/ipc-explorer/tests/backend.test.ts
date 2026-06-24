import { describe, it, expect, vi } from 'vitest'
import { register } from '../backend.ts'

describe('ipc-explorer backend', () => {
  it('registers the tool', () => {
    const registerTool = vi.fn()
    register({
      registry: { registerTool, registerProvider: vi.fn(), registerOrchestrator: vi.fn() },
    } as never)

    expect(registerTool).toHaveBeenCalledWith({
      name: 'ipc-explorer',
      displayName: 'IPC Explorer',
    })
  })
})
