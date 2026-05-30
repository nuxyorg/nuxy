import type { CoreContext } from '@nuxy/extension-sdk'
import type {
  OllamaMessage,
  OllamaChatResponse,
  ToolDef,
  JsonSchema,
  CallableExtension,
  OrchestratorResult,
  RoutePayload,
} from './types.ts'

const OLLAMA_HOST = 'http://localhost:11434'
const MODEL = 'functiongemma'

// ─── Ollama chat helper ───────────────────────────────────────────────────────

async function ollamaChat(
  messages: OllamaMessage[],
  tools: ToolDef[] = []
): Promise<OllamaChatResponse> {
  const body: Record<string, unknown> = {
    model: MODEL,
    messages,
    stream: false,
  }
  if (tools.length > 0) {
    body.tools = tools
  }

  const response = await fetch(`${OLLAMA_HOST}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`Ollama HTTP ${response.status}: ${text}`)
  }

  return response.json() as Promise<OllamaChatResponse>
}

// ─── Tool definition builder ──────────────────────────────────────────────────

function buildToolDef(ext: CallableExtension): ToolDef {
  const name = (ext.manifest?.name || ext.id)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')

  const schema: JsonSchema = ext.schema || {
    type: 'object',
    properties: {},
    required: [],
  }

  return {
    type: 'function',
    function: {
      name,
      description:
        ext.manifest?.description ||
        `Invoke the ${ext.manifest?.name || ext.id} extension to fulfill the user request.`,
      parameters: schema,
      __extId: ext.id,
    },
  }
}

// ─── Built-in tool definitions for known extensions ──────────────────────────

const BUILTIN_TOOL_SCHEMAS: Record<string, JsonSchema> = {
  'com.nuxy.time-calculator': {
    type: 'object',
    properties: {
      time: {
        type: 'string',
        description:
          'The time to convert, e.g. "12pm", "3:30am", "15:00". Can be 12h or 24h format.',
      },
      from: {
        type: 'string',
        description:
          'Source city or timezone name (e.g. "new york", "istanbul", "tokyo"). Omit if the user did not specify a source — defaults to local time.',
      },
      to: {
        type: 'string',
        description:
          'Target city or timezone to convert to (e.g. "london", "istanbul", "sydney", "new york"). ONLY provide this if the user explicitly named a destination city or timezone. If no destination is mentioned, omit this field entirely.',
      },
    },
    required: ['time'],
  },
  'com.nuxy.calculator': {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'A math expression to evaluate, e.g. "2 + 2", "sqrt(16)", "(3 * 4) / 2".',
      },
    },
    required: ['text'],
  },
  'com.nuxy.calendar': {
    type: 'object',
    properties: {
      title: {
        type: 'string',
        description:
          'The title or description of the calendar event/reminder to create, e.g. "recebin doğumgününü kutlayacağım".',
      },
      date: {
        type: 'string',
        description:
          'The date of the event in YYYY-MM-DD format (e.g. "2026-12-21"). If only day and month are specified, use the current year or next occurrences. Always try to format as YYYY-MM-DD.',
      },
      time: {
        type: 'string',
        description:
          'Optional time for the event in HH:MM format (24-hour, e.g. "10:00"). Defaults to "10:00" if not specified.',
      },
    },
    required: ['title', 'date'],
  },
  'com.nuxy.ollama': {
    type: 'object',
    properties: {
      prompt: {
        type: 'string',
        description:
          "The user's question or message to send to the Ollama conversational AI model for a general-purpose response.",
      },
    },
    required: ['prompt'],
  },
}

const TOOL_CHANNEL_MAP: Record<string, string> = {
  'com.nuxy.time-calculator': 'convert',
  'com.nuxy.calculator': 'eval',
  'com.nuxy.calendar': 'prepare',
  'com.nuxy.ollama': 'query',
}

// ─── Main register ────────────────────────────────────────────────────────────

export function register(core: CoreContext): void {
  core.registry.registerOrchestrator(async (rawText: string) => {
    core.logger.info(`[AI Orchestrator] Routing: "${rawText}"`)
    await handleRoute(core, rawText)
  })

  core.ipc.handle('route', async (payload: unknown) => {
    const text = (payload as RoutePayload)?.text ?? ''
    if (!text.trim()) return { error: 'Empty query' }
    const res = await handleRoute(core, text)
    return { ok: true, data: res }
  })
}

// ─── Orchestration logic ──────────────────────────────────────────────────────

async function handleRoute(
  core: CoreContext,
  rawText: string
): Promise<{ toolCalled?: string; initialQuery?: string } | null> {
  try {
    let callableTools: CallableExtension[] = []
    try {
      callableTools =
        (
          core.registry as unknown as { getCallableTools?: () => CallableExtension[] }
        ).getCallableTools?.() ?? []
    } catch (_) {
      core.logger.warn('[AI Orchestrator] getCallableTools not available, using empty list')
    }

    core.logger.info(`[AI Orchestrator] ${callableTools.length} callable tool(s) available`)

    const toolDefs: ToolDef[] = callableTools.map((ext) => {
      const schema = BUILTIN_TOOL_SCHEMAS[ext.id] || ext.schema
      return buildToolDef({ ...ext, schema })
    })

    if (toolDefs.length === 0) {
      core.logger.info('[AI Orchestrator] No callable tools registered, using built-in definitions')
      toolDefs.push({
        type: 'function',
        function: {
          name: 'time_calculator',
          description:
            'Convert a time from one timezone/city to another. ' +
            'Examples: "12pm here in london" → time="12pm", to="london". ' +
            '"3pm istanbul in tokyo" → time="3pm", from="istanbul", to="tokyo". ' +
            'IMPORTANT: Only set `to` when the user explicitly named a destination city. ' +
            'If no destination city is mentioned, do NOT call this tool.',
          parameters: BUILTIN_TOOL_SCHEMAS['com.nuxy.time-calculator'],
          __extId: 'com.nuxy.time-calculator',
        },
      })
      toolDefs.push({
        type: 'function',
        function: {
          name: 'calculator',
          description: 'Evaluate a mathematical expression like "2+2" or "sqrt(16)".',
          parameters: BUILTIN_TOOL_SCHEMAS['com.nuxy.calculator'],
          __extId: 'com.nuxy.calculator',
        },
      })
      toolDefs.push({
        type: 'function',
        function: {
          name: 'calendar',
          description: 'Set a reminder or schedule/do something on a specific date.',
          parameters: BUILTIN_TOOL_SCHEMAS['com.nuxy.calendar'],
          __extId: 'com.nuxy.calendar',
        },
      })
      toolDefs.push({
        type: 'function',
        function: {
          name: 'ollama',
          description:
            'Answer general questions, open-ended conversation, creative tasks, coding help, and anything else that does not fit a more specific tool.',
          parameters: BUILTIN_TOOL_SCHEMAS['com.nuxy.ollama'],
          __extId: 'com.nuxy.ollama',
        },
      })
    }

    const currentYear = new Date().getFullYear()
    const messages: OllamaMessage[] = [
      {
        role: 'developer',
        content:
          'You are a model that can do function calling with the following functions\n' +
          'You are a helpful assistant integrated into Nuxy, a desktop launcher.\n' +
          'When the user asks to convert a time between cities/timezones, call the time_calculator tool.\n' +
          'Rules for time_calculator:\n' +
          '- Set `time` to the exact time mentioned (e.g. "12pm", "14:00", "3:30am").\n' +
          '- Set `from` only if a source city/timezone is explicitly named; omit it otherwise.\n' +
          '- Set `to` ONLY if a destination city/timezone is explicitly named (e.g. "in london", "to tokyo"). ' +
          'If no destination is named, do NOT call the tool — just answer directly.\n' +
          '- Never invent city names. Use the exact city name the user said.\n\n' +
          'When the user asks to set a reminder, schedule something, or do an activity on a specific date, call the calendar tool.\n' +
          'Rules for calendar:\n' +
          '- Set `title` to the exact description/action the user wants to schedule/remind (e.g. "recebin doğumgününü kutlayacağım").\n' +
          `- Set \`date\` in YYYY-MM-DD format. The current year is ${currentYear}. For example, "21 aralık" should resolve to "${currentYear}-12-21".\n` +
          '- Set `time` if a specific time is mentioned, otherwise default to "10:00".\n\n' +
          'For general questions, open-ended conversation, creative tasks, or anything that does not fit the above tools, call the ollama tool.\n' +
          'Rules for ollama:\n' +
          "- Set `prompt` to the user's full original message verbatim.\n" +
          '- Use this for: questions, explanations, writing, coding help, brainstorming, etc.\n\n' +
          'Always call a tool — never answer directly without a tool call.',
      },
      { role: 'user', content: rawText },
    ]

    core.logger.info('[AI Orchestrator] Sending to functiongemma...')
    const firstResponse = await ollamaChat(messages, toolDefs)
    const assistantMsg = firstResponse.message

    core.logger.info(
      `[AI Orchestrator] First response tool_calls: ${JSON.stringify(assistantMsg.tool_calls ?? null)}`
    )

    if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
      messages.push(assistantMsg)

      let lastExtId: string | undefined
      let initialQuery: string | undefined

      const toolResponses: { name: string; response: unknown }[] = []

      for (const toolCall of assistantMsg.tool_calls) {
        const fnName = toolCall.function?.name
        const args = toolCall.function?.arguments ?? {}

        core.logger.info(`[AI Orchestrator] Tool call: ${fnName}(${JSON.stringify(args)})`)

        const matchedDef = toolDefs.find((d) => d.function.name === fnName)
        const extId = matchedDef?.function.__extId

        let toolResult: unknown = null

        if (extId) {
          lastExtId = extId
          if (extId === 'com.nuxy.calendar' && typeof args.title === 'string') {
            initialQuery = args.title
          }
          try {
            const channel = TOOL_CHANNEL_MAP[extId] || 'eval'
            core.logger.info(
              `[AI Orchestrator] Invoking ${extId}::${channel} with ${JSON.stringify(args)}`
            )
            const invRes = await core.extensions.invoke(extId, channel, args)
            toolResult = invRes
            core.logger.info(`[AI Orchestrator] Tool result: ${JSON.stringify(toolResult)}`)

            if (!(toolResult as Record<string, unknown>)?.error) {
              try {
                await core.extensions.invoke(extId, 'setLastResult', toolResult)
                core.logger.info(`[AI Orchestrator] setLastResult sent to ${extId}`)
              } catch (_) {
                // setLastResult is optional — not all extensions support it
              }
            }
          } catch (invErr) {
            core.logger.error(`[AI Orchestrator] Extension invoke failed: ${invErr}`)
            toolResult = { error: String(invErr) }
          }
        } else {
          toolResult = { error: `Unknown tool: ${fnName}` }
        }

        if (fnName) {
          toolResponses.push({
            name: fnName,
            response: toolResult,
          })
        }
      }

      if (toolResponses.length > 0) {
        if (toolResponses.length === 1) {
          messages.push({
            role: 'tool',
            content: toolResponses[0],
          })
        } else {
          messages.push({
            role: 'tool',
            content: toolResponses,
          })
        }
      }

      const finalResponse = await ollamaChat(messages, [])
      const finalContent =
        typeof finalResponse.message?.content === 'string' ? finalResponse.message.content : ''

      core.logger.info(`[AI Orchestrator] Final response: ${finalContent}`)

      broadcastResult(core, {
        type: 'tool_result',
        query: rawText,
        answer: finalContent,
        toolCalls: assistantMsg.tool_calls,
      })

      return { toolCalled: lastExtId, initialQuery }
    } else {
      const answer = typeof assistantMsg.content === 'string' ? assistantMsg.content : ''
      core.logger.info(`[AI Orchestrator] Direct answer (no tool called): ${answer}`)
      broadcastResult(core, {
        type: 'direct',
        query: rawText,
        answer,
      })
      return null
    }
  } catch (err) {
    core.logger.error(`[AI Orchestrator] Error: ${err}`)

    broadcastResult(core, {
      type: 'error',
      query: rawText,
      error: String(err),
    })
    return null
  }
}

function broadcastResult(core: CoreContext, data: OrchestratorResult): void {
  try {
    ;(core.ipc as unknown as { broadcast?: (channel: string, data: unknown) => void }).broadcast?.(
      'orchestrator-result',
      data
    )
  } catch (_) {
    // not yet implemented
  }
  core.logger.info(`[AI Orchestrator] Result broadcast: ${JSON.stringify(data)}`)
}
