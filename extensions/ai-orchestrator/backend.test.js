import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { register } from './backend.js'

function createCore({ callableTools = [], fetchImpl = null } = {}) {
  const handlers = {}

  const defaultFetchImpl = () =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          message: { role: 'assistant', content: 'Done.', tool_calls: undefined },
        }),
      text: () => Promise.resolve(''),
    })

  vi.spyOn(global, 'fetch').mockImplementation(fetchImpl ?? defaultFetchImpl)

  const core = {
    registry: {
      registerOrchestrator: vi.fn(),
      getCallableTools: vi.fn().mockReturnValue(callableTools),
    },
    ipc: {
      handle: (ch, fn) => {
        handlers[ch] = fn
      },
      broadcast: vi.fn(),
    },
    extensions: {
      invoke: vi.fn().mockResolvedValue({ ok: true }),
    },
    logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
  }

  return { core, handlers }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ai-orchestrator backend', () => {
  it('registers an orchestrator function', () => {
    const { core } = createCore()
    register(core)
    expect(core.registry.registerOrchestrator).toHaveBeenCalledWith(expect.any(Function))
  })

  it('registers a "route" IPC handler', () => {
    const { core, handlers } = createCore()
    register(core)
    expect(typeof handlers.route).toBe('function')
  })

  describe('route handler', () => {
    it('returns error for empty query', async () => {
      const { core, handlers } = createCore()
      register(core)
      const res = await handlers.route({ text: '' })
      expect(res).toHaveProperty('error')
    })

    it('returns error for whitespace-only query', async () => {
      const { core, handlers } = createCore()
      register(core)
      const res = await handlers.route({ text: '   ' })
      expect(res).toHaveProperty('error')
    })

    it('returns { ok: true } for a valid query', async () => {
      const { core, handlers } = createCore()
      register(core)
      const res = await handlers.route({ text: 'hello' })
      expect(res).toEqual({ ok: true })
    })

    it('handles undefined payload', async () => {
      const { core, handlers } = createCore()
      register(core)
      const res = await handlers.route(undefined)
      expect(res).toHaveProperty('error')
    })

    it('calls Ollama API with user text', async () => {
      const { core, handlers } = createCore()
      register(core)
      await handlers.route({ text: 'what is 2+2' })
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/chat'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('broadcasts a direct answer when no tool is called', async () => {
      const { core, handlers } = createCore({
        fetchImpl: () =>
          Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                message: { role: 'assistant', content: 'The answer is 42.', tool_calls: undefined },
              }),
            text: () => Promise.resolve(''),
          }),
      })
      register(core)
      await handlers.route({ text: 'what is the meaning of life' })
      expect(core.ipc.broadcast).toHaveBeenCalledWith(
        'orchestrator-result',
        expect.objectContaining({
          type: 'direct',
          answer: 'The answer is 42.',
          query: 'what is the meaning of life',
        })
      )
    })

    it('broadcasts error result when Ollama is unavailable', async () => {
      const { core, handlers } = createCore({
        fetchImpl: () => Promise.reject(new Error('connection refused')),
      })
      register(core)
      await handlers.route({ text: 'hello' })
      expect(core.ipc.broadcast).toHaveBeenCalledWith(
        'orchestrator-result',
        expect.objectContaining({ type: 'error' })
      )
    })

    it('includes the error message in error broadcast when Ollama returns HTTP 500', async () => {
      const { core, handlers } = createCore({
        fetchImpl: () =>
          Promise.resolve({
            ok: false,
            status: 500,
            json: () => Promise.resolve({}),
            text: () => Promise.resolve('Internal Server Error'),
          }),
      })
      register(core)
      await handlers.route({ text: 'hello' })
      expect(core.ipc.broadcast).toHaveBeenCalledWith(
        'orchestrator-result',
        expect.objectContaining({
          type: 'error',
          error: expect.stringContaining('500'),
        })
      )
    })

    it('invokes extension when model returns a tool_call', async () => {
      let callCount = 0
      const { core, handlers } = createCore({
        fetchImpl: () => {
          callCount++
          if (callCount === 1) {
            return Promise.resolve({
              ok: true,
              json: () =>
                Promise.resolve({
                  message: {
                    role: 'assistant',
                    content: '',
                    tool_calls: [{ function: { name: 'calculator', arguments: { text: '2+2' } } }],
                  },
                }),
              text: () => Promise.resolve(''),
            })
          }
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({ message: { role: 'assistant', content: 'The answer is 4.' } }),
            text: () => Promise.resolve(''),
          })
        },
      })
      register(core)
      await handlers.route({ text: '2+2' })
      // Verify the correct extension, channel, and arguments were used
      expect(core.extensions.invoke).toHaveBeenCalledWith(
        'com.nuxy.calculator',
        'eval',
        { text: '2+2' }
      )
    })

    it('invokes time-calculator on the "convert" channel per TOOL_CHANNEL_MAP', async () => {
      let callCount = 0
      const { core, handlers } = createCore({
        fetchImpl: () => {
          callCount++
          if (callCount === 1) {
            return Promise.resolve({
              ok: true,
              json: () =>
                Promise.resolve({
                  message: {
                    role: 'assistant',
                    content: '',
                    tool_calls: [
                      {
                        function: {
                          name: 'time_calculator',
                          arguments: { time: '3pm', to: 'london' },
                        },
                      },
                    ],
                  },
                }),
              text: () => Promise.resolve(''),
            })
          }
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                message: { role: 'assistant', content: '3pm here is 8pm in London.' },
              }),
            text: () => Promise.resolve(''),
          })
        },
      })
      register(core)
      await handlers.route({ text: '3pm in london' })
      expect(core.extensions.invoke).toHaveBeenCalledWith(
        'com.nuxy.time-calculator',
        'convert',
        { time: '3pm', to: 'london' }
      )
    })

    it('calls setLastResult on the extension after a successful tool invocation', async () => {
      let callCount = 0
      const toolResult = { result: 4, display: '4' }
      const { core, handlers } = createCore({
        fetchImpl: () => {
          callCount++
          if (callCount === 1) {
            return Promise.resolve({
              ok: true,
              json: () =>
                Promise.resolve({
                  message: {
                    role: 'assistant',
                    content: '',
                    tool_calls: [{ function: { name: 'calculator', arguments: { text: '2+2' } } }],
                  },
                }),
              text: () => Promise.resolve(''),
            })
          }
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({ message: { role: 'assistant', content: 'Result: 4' } }),
            text: () => Promise.resolve(''),
          })
        },
      })
      // First invoke call returns the tool result, second (setLastResult) also resolves
      core.extensions.invoke
        .mockResolvedValueOnce(toolResult)
        .mockResolvedValueOnce(undefined)
      register(core)
      await handlers.route({ text: '2+2' })
      // Second invoke call should be setLastResult with the tool result
      expect(core.extensions.invoke).toHaveBeenCalledWith(
        'com.nuxy.calculator',
        'setLastResult',
        toolResult
      )
    })

    it('does not call setLastResult when tool invocation returns an error', async () => {
      let callCount = 0
      const { core, handlers } = createCore({
        fetchImpl: () => {
          callCount++
          if (callCount === 1) {
            return Promise.resolve({
              ok: true,
              json: () =>
                Promise.resolve({
                  message: {
                    role: 'assistant',
                    content: '',
                    tool_calls: [{ function: { name: 'calculator', arguments: { text: 'bad' } } }],
                  },
                }),
              text: () => Promise.resolve(''),
            })
          }
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({ message: { role: 'assistant', content: 'Error occurred.' } }),
            text: () => Promise.resolve(''),
          })
        },
      })
      // Tool invocation returns an error result
      core.extensions.invoke.mockResolvedValue({ error: 'bad expression' })
      register(core)
      await handlers.route({ text: 'bad' })
      // setLastResult must NOT have been called
      const setLastResultCalls = core.extensions.invoke.mock.calls.filter(
        ([, channel]) => channel === 'setLastResult'
      )
      expect(setLastResultCalls).toHaveLength(0)
    })
  })

  describe('buildToolDef name normalisation', () => {
    it('converts spaces to underscores', () => {
      // Tools with callableTools that have spaces in their name get normalised
      const { core, handlers } = createCore({
        callableTools: [{ id: 'com.nuxy.my-tool', manifest: { name: 'My Cool Tool' } }],
      })
      register(core)
      // Trigger a route so the fetch body can be inspected
      return handlers.route({ text: 'hello' }).then(() => {
        const body = JSON.parse(global.fetch.mock.calls[0][1].body)
        const toolName = body.tools[0].function.name
        // Must contain only lowercase alphanum + underscores, no spaces
        expect(toolName).toMatch(/^[a-z0-9_]+$/)
        expect(toolName).toBe('my_cool_tool')
      })
    })

    it('removes special characters other than underscores', () => {
      const { core, handlers } = createCore({
        callableTools: [{ id: 'com.nuxy.weird', manifest: { name: 'Weird!@# Tool' } }],
      })
      register(core)
      return handlers.route({ text: 'hello' }).then(() => {
        const body = JSON.parse(global.fetch.mock.calls[0][1].body)
        const toolName = body.tools[0].function.name
        expect(toolName).toMatch(/^[a-z0-9_]+$/)
        expect(toolName).toBe('weird_tool')
      })
    })

    it('strips leading and trailing underscores from normalised name', () => {
      const { core, handlers } = createCore({
        callableTools: [{ id: 'com.nuxy.edge', manifest: { name: '!edge case!' } }],
      })
      register(core)
      return handlers.route({ text: 'hello' }).then(() => {
        const body = JSON.parse(global.fetch.mock.calls[0][1].body)
        const toolName = body.tools[0].function.name
        expect(toolName).not.toMatch(/^_|_$/)
        expect(toolName).toBe('edge_case')
      })
    })

    it('collapses multiple consecutive underscores into one', () => {
      const { core, handlers } = createCore({
        callableTools: [{ id: 'com.nuxy.multi', manifest: { name: 'foo  bar   baz' } }],
      })
      register(core)
      return handlers.route({ text: 'hello' }).then(() => {
        const body = JSON.parse(global.fetch.mock.calls[0][1].body)
        const toolName = body.tools[0].function.name
        expect(toolName).toBe('foo_bar_baz')
      })
    })

    it('falls back to extension id when manifest name is absent', () => {
      const { core, handlers } = createCore({
        callableTools: [{ id: 'com.nuxy.fallback-tool', manifest: {} }],
      })
      register(core)
      return handlers.route({ text: 'hello' }).then(() => {
        const body = JSON.parse(global.fetch.mock.calls[0][1].body)
        const toolName = body.tools[0].function.name
        // id normalised: "com.nuxy.fallback-tool" → "com_nuxy_fallback_tool"
        expect(toolName).toBe('com_nuxy_fallback_tool')
      })
    })
  })

  describe('getCallableTools fallback', () => {
    it('falls back to built-in definitions when getCallableTools throws', async () => {
      const { core, handlers } = createCore()
      core.registry.getCallableTools.mockImplementation(() => {
        throw new Error('not implemented')
      })
      register(core)
      await handlers.route({ text: 'hello' })
      // Should have warned and used built-in definitions — fetch must still be called
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/chat'),
        expect.objectContaining({ method: 'POST' })
      )
      // The body should contain the built-in time_calculator and calculator tools
      const body = JSON.parse(global.fetch.mock.calls[0][1].body)
      const toolNames = body.tools.map((t) => t.function.name)
      expect(toolNames).toContain('time_calculator')
      expect(toolNames).toContain('calculator')
    })

    it('logs a warning when getCallableTools throws', async () => {
      const { core, handlers } = createCore()
      core.registry.getCallableTools.mockImplementation(() => {
        throw new Error('not implemented')
      })
      register(core)
      await handlers.route({ text: 'hello' })
      expect(core.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('getCallableTools not available')
      )
    })

    it('uses built-in tool definitions when no callable tools are registered', async () => {
      // callableTools = [] → toolDefs will be empty → falls back to built-ins
      const { core, handlers } = createCore({ callableTools: [] })
      register(core)
      await handlers.route({ text: 'hello' })
      const body = JSON.parse(global.fetch.mock.calls[0][1].body)
      const toolNames = body.tools.map((t) => t.function.name)
      expect(toolNames).toContain('time_calculator')
      expect(toolNames).toContain('calculator')
    })
  })

  // Integration: orchestrator function registered matches route handler behavior
  describe('e2e: orchestrator registration', () => {
    it('orchestrator function calls handleRoute with the raw text', async () => {
      const { core } = createCore()
      register(core)
      const orchestratorFn = core.registry.registerOrchestrator.mock.calls[0][0]
      // Should not throw when called
      await expect(orchestratorFn('test query')).resolves.not.toThrow()
    })

    it('handles Ollama returning null content gracefully', async () => {
      // vi.spyOn is used via createCore — restoreAllMocks in afterEach will clean up
      const { core, handlers } = createCore({
        fetchImpl: () =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ message: { role: 'assistant', content: null } }),
            text: () => Promise.resolve(''),
          }),
      })
      register(core)
      await handlers.route({ text: 'hello' })
      expect(core.ipc.broadcast).toHaveBeenCalledWith(
        'orchestrator-result',
        expect.objectContaining({ type: 'direct' })
      )
    })

    it('orchestrator function broadcasts result for its raw text input', async () => {
      const { core } = createCore({
        fetchImpl: () =>
          Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                message: { role: 'assistant', content: 'Orchestrator answer.' },
              }),
            text: () => Promise.resolve(''),
          }),
      })
      register(core)
      const orchestratorFn = core.registry.registerOrchestrator.mock.calls[0][0]
      await orchestratorFn('orchestrator test query')
      expect(core.ipc.broadcast).toHaveBeenCalledWith(
        'orchestrator-result',
        expect.objectContaining({
          type: 'direct',
          query: 'orchestrator test query',
          answer: 'Orchestrator answer.',
        })
      )
    })
  })
})
