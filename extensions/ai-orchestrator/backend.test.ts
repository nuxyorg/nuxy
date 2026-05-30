import { describe, it, expect, vi, afterEach } from 'vitest'
import { type CoreContext, createMockCore } from '@nuxy/extension-sdk'
import { register } from './backend.ts'

interface MockHandlers {
  [channel: string]: (payload?: unknown) => Promise<unknown>
}

function createCore({
  callableTools = [],
  fetchImpl = null,
}: { callableTools?: unknown[]; fetchImpl?: (() => Promise<unknown>) | null } = {}): {
  core: CoreContext
  handlers: MockHandlers
} {
  const defaultFetchImpl = (): Promise<unknown> =>
    Promise.resolve({
      ok: true,
      json: () =>
        Promise.resolve({
          message: { role: 'assistant', content: 'Done.', tool_calls: undefined },
        }),
      text: () => Promise.resolve(''),
    })

  vi.spyOn(global, 'fetch').mockImplementation(
    fetchImpl ?? (defaultFetchImpl as typeof global.fetch)
  )

  const { core, handlers } = createMockCore(vi, {
    registry: {
      getCallableTools: vi.fn().mockReturnValue(callableTools),
    },
    extensions: {
      invoke: vi.fn().mockResolvedValue({ ok: true }),
    },
  })

  return { core, handlers }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('ai-orchestrator backend', () => {
  it('registers an orchestrator function', () => {
    const { core } = createCore()
    register(core as unknown as CoreContext)
    expect(core.registry.registerOrchestrator).toHaveBeenCalledWith(expect.any(Function))
  })

  it('registers a "route" IPC handler', () => {
    const { core, handlers } = createCore()
    register(core as unknown as CoreContext)
    expect(typeof handlers.route).toBe('function')
  })

  describe('route handler', () => {
    it('returns error for empty query', async () => {
      const { core, handlers } = createCore()
      register(core as unknown as CoreContext)
      const res = await handlers.route({ text: '' })
      expect(res).toHaveProperty('error')
    })

    it('returns error for whitespace-only query', async () => {
      const { core, handlers } = createCore()
      register(core as unknown as CoreContext)
      const res = await handlers.route({ text: '   ' })
      expect(res).toHaveProperty('error')
    })

    it('returns { ok: true } for a valid query', async () => {
      const { core, handlers } = createCore()
      register(core as unknown as CoreContext)
      const res = await handlers.route({ text: 'hello' })
      expect(res).toEqual({ ok: true, data: null })
    })

    it('handles undefined payload', async () => {
      const { core, handlers } = createCore()
      register(core as unknown as CoreContext)
      const res = await handlers.route(undefined)
      expect(res).toHaveProperty('error')
    })

    it('calls Ollama API with user text', async () => {
      const { core, handlers } = createCore()
      register(core as unknown as CoreContext)
      await handlers.route({ text: 'what is 2+2' })
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/chat'),
        expect.objectContaining({ method: 'POST' })
      )
    })

    it('sends developer role and correct content in first message', async () => {
      const { core, handlers } = createCore()
      register(core as unknown as CoreContext)
      await handlers.route({ text: 'hello' })
      expect(global.fetch).toHaveBeenCalled()
      const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls
      const body = JSON.parse(fetchCalls[0][1].body)
      expect(body.messages[0]).toEqual({
        role: 'developer',
        content: expect.stringContaining(
          'You are a model that can do function calling with the following functions'
        ),
      })
    })

    it('sends structured tool response in the second Ollama call', async () => {
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
            json: () => Promise.resolve({ message: { role: 'assistant', content: 'Result: 4' } }),
            text: () => Promise.resolve(''),
          })
        },
      })
      core.extensions.invoke.mockResolvedValue({ result: 4 })
      register(core as unknown as CoreContext)
      await handlers.route({ text: '2+2' })
      expect(global.fetch).toHaveBeenCalledTimes(2)
      const fetchCalls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls
      const secondCallBody = JSON.parse(fetchCalls[1][1].body)
      const toolMsg = secondCallBody.messages.find((m: any) => m.role === 'tool')
      expect(toolMsg).toBeDefined()
      expect(toolMsg.content).toEqual({
        name: 'calculator',
        response: { result: 4 },
      })
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
      register(core as unknown as CoreContext)
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
      register(core as unknown as CoreContext)
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
      register(core as unknown as CoreContext)
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
      register(core as unknown as CoreContext)
      await handlers.route({ text: '2+2' })
      expect(core.extensions.invoke).toHaveBeenCalledWith('com.nuxy.calculator', 'eval', {
        text: '2+2',
      })
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
      register(core as unknown as CoreContext)
      await handlers.route({ text: '3pm in london' })
      expect(core.extensions.invoke).toHaveBeenCalledWith('com.nuxy.time-calculator', 'convert', {
        time: '3pm',
        to: 'london',
      })
    })

    it('invokes calendar on the "prepare" channel per TOOL_CHANNEL_MAP and returns toolCalled/initialQuery', async () => {
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
                          name: 'calendar',
                          arguments: {
                            title: 'recebin doğumgününü kutlayacağım',
                            date: '2026-12-21',
                          },
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
                message: { role: 'assistant', content: 'Reminder set.' },
              }),
            text: () => Promise.resolve(''),
          })
        },
      })
      register(core as unknown as CoreContext)
      const res = await handlers.route({ text: '21 aralıkta recebin doğumgününü kutlayacağım' })
      expect(core.extensions.invoke).toHaveBeenCalledWith('com.nuxy.calendar', 'prepare', {
        title: 'recebin doğumgününü kutlayacağım',
        date: '2026-12-21',
      })
      expect(res).toEqual({
        ok: true,
        data: {
          toolCalled: 'com.nuxy.calendar',
          initialQuery: 'recebin doğumgününü kutlayacağım',
        },
      })
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
            json: () => Promise.resolve({ message: { role: 'assistant', content: 'Result: 4' } }),
            text: () => Promise.resolve(''),
          })
        },
      })
      core.extensions.invoke.mockResolvedValueOnce(toolResult).mockResolvedValueOnce(undefined)
      register(core as unknown as CoreContext)
      await handlers.route({ text: '2+2' })
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
      core.extensions.invoke.mockResolvedValue({ error: 'bad expression' })
      register(core as unknown as CoreContext)
      await handlers.route({ text: 'bad' })
      const setLastResultCalls = (
        core.extensions.invoke.mock.calls as [string, string, unknown][]
      ).filter(([, channel]) => channel === 'setLastResult')
      expect(setLastResultCalls).toHaveLength(0)
    })

    it('broadcasts direct answer from functiongemma when no tool is called', async () => {
      const { core, handlers } = createCore({
        fetchImpl: () =>
          Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                message: {
                  role: 'assistant',
                  content: 'functiongemma answer',
                  tool_calls: undefined,
                },
              }),
            text: () => Promise.resolve(''),
          }),
      })
      register(core as unknown as CoreContext)
      await handlers.route({ text: 'tell me a joke' })
      expect(core.extensions.invoke).not.toHaveBeenCalledWith(
        'com.nuxy.ollama',
        'chat',
        expect.anything()
      )
      expect(core.ipc.broadcast).toHaveBeenCalledWith(
        'orchestrator-result',
        expect.objectContaining({ type: 'direct', answer: 'functiongemma answer' })
      )
    })

    it('does NOT invoke Ollama when a tool_call was made', async () => {
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
              Promise.resolve({ message: { role: 'assistant', content: 'Result is 4.' } }),
            text: () => Promise.resolve(''),
          })
        },
      })
      core.extensions.invoke.mockResolvedValue({ result: 4, display: '4' })
      register(core as unknown as CoreContext)
      await handlers.route({ text: '2+2' })
      const ollamaCalls = (core.extensions.invoke.mock.calls as [string, string, unknown][]).filter(
        ([extId, channel]) => extId === 'com.nuxy.ollama' && channel === 'chat'
      )
      expect(ollamaCalls).toHaveLength(0)
    })
  })

  describe('buildToolDef name normalisation', () => {
    it('converts spaces to underscores', () => {
      const { core, handlers } = createCore({
        callableTools: [{ id: 'com.nuxy.my-tool', manifest: { name: 'My Cool Tool' } }],
      })
      register(core as unknown as CoreContext)
      return handlers.route({ text: 'hello' }).then(() => {
        const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
        const toolName = body.tools[0].function.name
        expect(toolName).toMatch(/^[a-z0-9_]+$/)
        expect(toolName).toBe('my_cool_tool')
      })
    })

    it('removes special characters other than underscores', () => {
      const { core, handlers } = createCore({
        callableTools: [{ id: 'com.nuxy.weird', manifest: { name: 'Weird!@# Tool' } }],
      })
      register(core as unknown as CoreContext)
      return handlers.route({ text: 'hello' }).then(() => {
        const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
        const toolName = body.tools[0].function.name
        expect(toolName).toMatch(/^[a-z0-9_]+$/)
        expect(toolName).toBe('weird_tool')
      })
    })

    it('strips leading and trailing underscores from normalised name', () => {
      const { core, handlers } = createCore({
        callableTools: [{ id: 'com.nuxy.edge', manifest: { name: '!edge case!' } }],
      })
      register(core as unknown as CoreContext)
      return handlers.route({ text: 'hello' }).then(() => {
        const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
        const toolName = body.tools[0].function.name
        expect(toolName).not.toMatch(/^_|_$/)
        expect(toolName).toBe('edge_case')
      })
    })

    it('collapses multiple consecutive underscores into one', () => {
      const { core, handlers } = createCore({
        callableTools: [{ id: 'com.nuxy.multi', manifest: { name: 'foo  bar   baz' } }],
      })
      register(core as unknown as CoreContext)
      return handlers.route({ text: 'hello' }).then(() => {
        const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
        const toolName = body.tools[0].function.name
        expect(toolName).toBe('foo_bar_baz')
      })
    })

    it('falls back to extension id when manifest name is absent', () => {
      const { core, handlers } = createCore({
        callableTools: [{ id: 'com.nuxy.fallback-tool', manifest: {} }],
      })
      register(core as unknown as CoreContext)
      return handlers.route({ text: 'hello' }).then(() => {
        const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
        const toolName = body.tools[0].function.name
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
      register(core as unknown as CoreContext)
      await handlers.route({ text: 'hello' })
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/chat'),
        expect.objectContaining({ method: 'POST' })
      )
      const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
      const toolNames = body.tools.map((t: { function: { name: string } }) => t.function.name)
      expect(toolNames).toContain('time_calculator')
      expect(toolNames).toContain('calculator')
    })

    it('logs a warning when getCallableTools throws', async () => {
      const { core, handlers } = createCore()
      core.registry.getCallableTools.mockImplementation(() => {
        throw new Error('not implemented')
      })
      register(core as unknown as CoreContext)
      await handlers.route({ text: 'hello' })
      expect(core.logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('getCallableTools not available')
      )
    })

    it('uses built-in tool definitions when no callable tools are registered', async () => {
      const { core, handlers } = createCore({ callableTools: [] })
      register(core as unknown as CoreContext)
      await handlers.route({ text: 'hello' })
      const body = JSON.parse((global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body)
      const toolNames = body.tools.map((t: { function: { name: string } }) => t.function.name)
      expect(toolNames).toContain('time_calculator')
      expect(toolNames).toContain('calculator')
    })
  })

  describe('e2e: orchestrator registration', () => {
    it('orchestrator function calls handleRoute with the raw text', async () => {
      const { core } = createCore()
      register(core as unknown as CoreContext)
      const orchestratorFn = core.registry.registerOrchestrator.mock.calls[0][0] as (
        text: string
      ) => Promise<void>
      await expect(orchestratorFn('test query')).resolves.not.toThrow()
    })

    it('handles Ollama returning null content gracefully', async () => {
      const { core, handlers } = createCore({
        fetchImpl: () =>
          Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ message: { role: 'assistant', content: null } }),
            text: () => Promise.resolve(''),
          }),
      })
      register(core as unknown as CoreContext)
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
      register(core as unknown as CoreContext)
      const orchestratorFn = core.registry.registerOrchestrator.mock.calls[0][0] as (
        text: string
      ) => Promise<void>
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
