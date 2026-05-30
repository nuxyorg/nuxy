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

export async function register(core: CoreContext): Promise<void> {
  const config: OllamaConfig = { model: DEFAULT_MODEL, host: DEFAULT_HOST }

  const savedHost = await core.settings.read<string>('host')
  const savedModel = await core.settings.read<string>('model')
  if (savedHost) config.host = savedHost
  if (savedModel) config.model = savedModel

  async function chat(payload: ChatPayload): Promise<ChatResult> {
    const response = await fetch(`${config.host}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: config.model, messages: payload.messages, stream: false }),
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
    const { model, host } = (payload as ConfigurePayload) ?? {}
    if (model !== undefined) {
      config.model = model
      await core.settings.write('model', model)
    }
    if (host !== undefined) {
      config.host = host
      await core.settings.write('host', host)
    }
  })

  core.ipc.handle('getConfig', async (): Promise<OllamaConfig> => {
    return { host: config.host, model: config.model }
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
