/** @typedef {import('@nuxy/extension-sdk').CoreContext} CoreContext */

const DEFAULT_MODEL = 'llama3'
const DEFAULT_HOST = 'http://localhost:11434'

/** @param {CoreContext} core */
export async function register(core) {
  let config = { model: DEFAULT_MODEL, host: DEFAULT_HOST }

  const saved = await core.storage.read('config.json')
  if (saved) config = { ...config, ...saved }

  async function chat({ messages }) {
    const response = await fetch(`${config.host}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: config.model, messages, stream: false }),
    })

    if (!response.ok) {
      const text = await response.text()
      throw new Error(`Ollama HTTP ${response.status}: ${text}`)
    }

    const data = await response.json()
    return { content: data.message?.content ?? '' }
  }

  core.registry.registerOrchestrator(async (rawText) => {
    return chat({ messages: [{ role: 'user', content: rawText }] })
  })

  core.ipc.handle('chat', chat)

  core.ipc.handle('query', async ({ model, prompt }) => {
    if (model) config = { ...config, model }
    return chat({ messages: [{ role: 'user', content: prompt }] })
  })

  core.ipc.handle('models', async () => {
    try {
      const response = await fetch(`${config.host}/api/tags`)
      if (!response.ok) return []
      const data = await response.json()
      return (data.models ?? []).map((m) => m.name)
    } catch {
      return []
    }
  })

  core.ipc.handle('health', async () => {
    try {
      const response = await fetch(`${config.host}/api/tags`)
      return { ok: response.ok }
    } catch {
      return { ok: false }
    }
  })

  core.ipc.handle('configure', async ({ model, host } = {}) => {
    if (model !== undefined) config.model = model
    if (host !== undefined) config.host = host
    await core.storage.write('config.json', { model: config.model, host: config.host })
  })
}
