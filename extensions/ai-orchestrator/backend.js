/** @typedef {import('@nuxy/extension-sdk').CoreContext} CoreContext */

/**
 * AI Orchestrator Extension
 *
 * Orchestrator type: receives raw OmniBar text when the user presses Enter
 * without selecting a result. Uses Ollama + functiongemma to understand
 * the intent and call the appropriate callable extension.
 *
 * Tool calling flow:
 *  1. Fetch callable tool definitions from the registry
 *  2. Send user message + tool definitions to functiongemma via Ollama /api/chat
 *  3. If the model returns a tool_call, invoke the target extension via core.extensions.invoke
 *  4. Feed the tool result back to the model for a final natural-language response
 *  5. Log / notify the final answer
 */

const OLLAMA_HOST = 'http://localhost:11434'
const MODEL = 'functiongemma'

// ─── Ollama chat helper ───────────────────────────────────────────────────────

/**
 * Send a chat request to Ollama.
 * @param {Array} messages - OpenAI-style message array
 * @param {Array} tools     - Tool definitions in OpenAI function-call format
 * @returns {Promise<{message: {role:string, content:string, tool_calls?: Array}}>}
 */
async function ollamaChat(messages, tools = []) {
  const body = {
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

  return response.json()
}

// ─── Tool definition builder ──────────────────────────────────────────────────

/**
 * Build an OpenAI-style tool definition for a Nuxy callable extension.
 * We map Nuxy extension metadata → function schema.
 * If the extension provides its own schema, we use it; otherwise we build a
 * generic one from the extension's name and id.
 */
function buildToolDef(ext) {
  // ext = { id, manifest: { name, ... }, schema?: {...} }
  const name = (ext.manifest?.name || ext.id)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')

  // Try to use a provided schema first
  const schema = ext.schema || {
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
      // Store the real ext id so we can look it up after parsing
      __extId: ext.id,
    },
  }
}

// ─── Built-in tool definitions for known extensions ──────────────────────────

/**
 * Tool definitions for extensions that don't register their own schema.
 * Keyed by extension id.
 */
const BUILTIN_TOOL_SCHEMAS = {
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
        description:
          'A math expression to evaluate, e.g. "2 + 2", "sqrt(16)", "(3 * 4) / 2".',
      },
    },
    required: ['text'],
  },
}

/**
 * Get the IPC channel name to call on an extension for a given tool function name.
 * For known extensions we know the right channel; otherwise we default to 'eval'.
 */
const TOOL_CHANNEL_MAP = {
  'com.nuxy.time-calculator': 'convert',
  'com.nuxy.calculator': 'eval',
}

// ─── Main register ────────────────────────────────────────────────────────────

/** @param {CoreContext} core */
export function register(core) {
  core.registry.registerOrchestrator(async (rawText) => {
    core.logger.info(`[AI Orchestrator] Routing: "${rawText}"`)
    await handleRoute(core, rawText)
  })

  // Also expose a direct IPC handle so the shell can invoke us explicitly
  core.ipc.handle('route', async (payload) => {
    const text = payload?.text ?? ''
    if (!text.trim()) return { error: 'Empty query' }
    await handleRoute(core, text)
    return { ok: true }
  })
}

// ─── Orchestration logic ──────────────────────────────────────────────────────

async function handleRoute(core, rawText) {
  try {
    // 1. Get callable tools from the registry
    let callableTools = []
    try {
      callableTools = core.registry.getCallableTools?.() ?? []
    } catch (_) {
      // getCallableTools may not be implemented yet — fall back gracefully
      core.logger.warn('[AI Orchestrator] getCallableTools not available, using empty list')
    }

    core.logger.info(`[AI Orchestrator] ${callableTools.length} callable tool(s) available`)

    // 2. Build OpenAI-style tool definitions
    const toolDefs = callableTools.map((ext) => {
      const schema = BUILTIN_TOOL_SCHEMAS[ext.id] || ext.schema
      return buildToolDef({ ...ext, schema })
    })

    // If no callable tools are registered yet, add the built-in ones
    // (so the orchestrator still works even before the tool registers itself)
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
    }

    // 3. First turn: ask functiongemma to parse user intent
    const messages = [
      {
        role: 'system',
        content:
          'You are a helpful assistant integrated into Nuxy, a desktop launcher. ' +
          'When the user asks to convert a time between cities/timezones, call the time_calculator tool. ' +
          'Rules for time_calculator:\n' +
          '- Set `time` to the exact time mentioned (e.g. "12pm", "14:00", "3:30am").\n' +
          '- Set `from` only if a source city/timezone is explicitly named; omit it otherwise.\n' +
          '- Set `to` ONLY if a destination city/timezone is explicitly named (e.g. "in london", "to tokyo"). ' +
          'If no destination is named, do NOT call the tool — just answer directly.\n' +
          '- Never invent city names. Use the exact city name the user said.\n' +
          'If no tool fits, answer directly and concisely.',
      },
      { role: 'user', content: rawText },
    ]

    core.logger.info('[AI Orchestrator] Sending to functiongemma...')
    const firstResponse = await ollamaChat(messages, toolDefs)
    const assistantMsg = firstResponse.message

    core.logger.info(
      `[AI Orchestrator] First response tool_calls: ${JSON.stringify(assistantMsg.tool_calls ?? null)}`
    )

    // 4. If a tool was called, invoke it and do a second turn
    if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
      messages.push(assistantMsg)

      for (const toolCall of assistantMsg.tool_calls) {
        const fnName = toolCall.function?.name
        const args = toolCall.function?.arguments ?? {}

        core.logger.info(
          `[AI Orchestrator] Tool call: ${fnName}(${JSON.stringify(args)})`
        )

        // Find the matching extension id
        const matchedDef = toolDefs.find((d) => d.function.name === fnName)
        const extId = matchedDef?.function.__extId

        let toolResult = null

        if (extId) {
          try {
            const channel = TOOL_CHANNEL_MAP[extId] || 'eval'
            core.logger.info(
              `[AI Orchestrator] Invoking ${extId}::${channel} with ${JSON.stringify(args)}`
            )
            const invRes = await core.extensions.invoke(extId, channel, args)
            toolResult = invRes
            core.logger.info(`[AI Orchestrator] Tool result: ${JSON.stringify(toolResult)}`)

            // Push result back to the extension so its frontend can display it when opened
            if (!toolResult?.error) {
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

        messages.push({
          role: 'tool',
          content: JSON.stringify(toolResult),
        })
      }

      // 5. Second turn: get final natural-language response from the model
      const finalResponse = await ollamaChat(messages, [])
      const finalContent = finalResponse.message?.content ?? ''

      core.logger.info(`[AI Orchestrator] Final response: ${finalContent}`)

      // Broadcast the result back to the shell UI
      broadcastResult(core, {
        type: 'tool_result',
        query: rawText,
        answer: finalContent,
        toolCalls: assistantMsg.tool_calls,
      })
    } else {
      let answer = assistantMsg.content ?? ''
      try {
        const ollamaResult = await core.extensions.invoke(
          'com.nuxy.ollama',
          'chat',
          { messages }
        )
        answer = ollamaResult?.content ?? answer
      } catch (_) {
        // Ollama not available — use functiongemma's direct answer
      }
      core.logger.info(`[AI Orchestrator] Answer: ${answer}`)
      broadcastResult(core, {
        type: 'direct',
        query: rawText,
        answer,
      })
    }
  } catch (err) {
    core.logger.error(`[AI Orchestrator] Error: ${err}`)

    broadcastResult(core, {
      type: 'error',
      query: rawText,
      error: String(err),
    })
  }
}

/**
 * Broadcast orchestrator result to the renderer.
 * Uses core.ipc.broadcast if available, otherwise logs only.
 */
function broadcastResult(core, data) {
  try {
    // broadcast is planned/partial — attempt it, swallow errors
    core.ipc.broadcast?.('orchestrator-result', data)
  } catch (_) {
    // not yet implemented
  }
  core.logger.info(`[AI Orchestrator] Result broadcast: ${JSON.stringify(data)}`)
}
