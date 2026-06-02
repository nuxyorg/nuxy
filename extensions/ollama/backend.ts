import type { CoreContext } from '@nuxy/extension-sdk'
import type {
  ChatMessage,
  ChatPayload,
  ChatResult,
  OllamaChatResponse,
  OllamaTagsResponse,
  QueryPayload,
  ConfigurePayload,
  OllamaConfig,
  HealthResult,
} from './types.ts'

const DEFAULT_MODEL = 'llama3'
const DEFAULT_HOST = 'http://localhost:11434'
const DEFAULT_THINKING_COLOR = 'light'

export async function register(core: CoreContext): Promise<void> {
  const config: OllamaConfig = { model: DEFAULT_MODEL, host: DEFAULT_HOST, thinkingColor: DEFAULT_THINKING_COLOR }

  const savedHost = await core.settings.read<string>('host')
  const savedModel = await core.settings.read<string>('model')
  const savedThinkingColor = await core.settings.read<string>('thinkingColor')
  const savedSystemPrompt = await core.settings.read<string>('systemPrompt')
  const savedTemperature = await core.settings.read<number>('temperature')
  if (savedHost) config.host = savedHost
  if (savedModel) config.model = savedModel
  if (savedThinkingColor) config.thinkingColor = savedThinkingColor
  if (savedSystemPrompt != null) config.systemPrompt = savedSystemPrompt
  if (savedTemperature != null) config.temperature = savedTemperature

  async function chat(payload: ChatPayload): Promise<ChatResult> {
    const messages = config.systemPrompt
      ? [{ role: 'system' as const, content: config.systemPrompt }, ...payload.messages]
      : payload.messages
    const response = await fetch(`${config.host}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: config.model,
        messages,
        stream: false,
        ...(config.temperature !== undefined ? { options: { temperature: config.temperature } } : {}),
      }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Ollama HTTP ${response.status}: ${text}`)
    }

    const data = (await response.json()) as OllamaChatResponse
    return { content: data.message?.content ?? '' }
  }

  core.registry.registerTool({ name: 'ollama' })

  core.ipc.handle('chat', async (payload: unknown): Promise<ChatResult> => {
    return chat(payload as ChatPayload)
  })

  core.ipc.handle('query', async (payload: unknown): Promise<ChatResult> => {
    const { model, prompt } = payload as QueryPayload
    if (model) config.model = model
    return chat({ messages: [{ role: 'user', content: prompt }] })
  })

  core.ipc.handle('models', async (): Promise<string[]> => {
    try {
      const response = await fetch(`${config.host}/api/tags`)
      if (!response.ok) return []
      const data = (await response.json()) as OllamaTagsResponse
      return (data.models ?? []).map((m) => m.name)
    } catch {
      return []
    }
  })

  core.ipc.handle('health', async (): Promise<HealthResult> => {
    try {
      const response = await fetch(`${config.host}/api/tags`)
      return { ok: response.ok }
    } catch {
      return { ok: false }
    }
  })

  core.ipc.handle('configure', async (payload: unknown): Promise<void> => {
    const { model, host, thinkingColor, systemPrompt, temperature } = (payload as ConfigurePayload) ?? {}
    if (model !== undefined) {
      config.model = model
      await core.settings.write('model', model)
    }
    if (host !== undefined) {
      config.host = host
      await core.settings.write('host', host)
    }
    if (thinkingColor !== undefined) {
      config.thinkingColor = thinkingColor
      await core.settings.write('thinkingColor', thinkingColor)
    }
    if (systemPrompt !== undefined) {
      config.systemPrompt = systemPrompt
      await core.settings.write('systemPrompt', systemPrompt)
    }
    if (temperature !== undefined) {
      config.temperature = temperature
      await core.settings.write('temperature', temperature)
    }
  })

  core.ipc.handle('getConfig', async (): Promise<OllamaConfig> => {
    const freshThinkingColor = await core.settings.read<string>('thinkingColor')
    return {
      host: config.host,
      model: config.model,
      thinkingColor: freshThinkingColor ?? config.thinkingColor,
      systemPrompt: config.systemPrompt,
      temperature: config.temperature,
    }
  })

  core.ipc.handle('history:save', async (payload: unknown): Promise<void> => {
    const { messages } = payload as { messages: ChatMessage[] }
    await core.storage.write('history.json', messages)
  })

  core.ipc.handle('history:load', async (): Promise<ChatMessage[]> => {
    const saved = await core.storage.read<ChatMessage[]>('history.json')
    return saved ?? []
  })

  core.ipc.handle('history:clear', async (): Promise<void> => {
    await core.storage.write('history.json', [])
  })
}
