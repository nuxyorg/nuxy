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
  let config: OllamaConfig = { model: DEFAULT_MODEL, host: DEFAULT_HOST }

  const saved = await core.storage.read<OllamaConfig>('config.json')
  if (saved) config = { ...config, ...saved }

  async function chat({ messages }: ChatPayload): Promise<ChatResult> {
    const response = await fetch(`${config.host}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: config.model, messages, stream: false }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Ollama HTTP ${response.status}: ${text}`)
    }

    const data = (await response.json()) as OllamaChatResponse
    return { content: data.message?.content ?? '' }
  }

  core.registry.registerOrchestrator(async (rawText: unknown) => {
    return chat({ messages: [{ role: 'user', content: rawText as string }] })
  })

  core.ipc.handle('chat', chat)

  core.ipc.handle('query', async ({ model, prompt }: QueryPayload): Promise<ChatResult> => {
    if (model) config = { ...config, model }
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

  core.ipc.handle('configure', async ({ model, host }: ConfigurePayload = {}): Promise<void> => {
    if (model !== undefined) config.model = model
    if (host !== undefined) config.host = host
    await core.storage.write('config.json', { model: config.model, host: config.host })
  })
}
