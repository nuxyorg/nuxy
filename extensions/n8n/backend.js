const DEFAULT_BASE_URL = 'http://localhost:5678'

export async function register(core) {
  const config = {
    baseUrl: DEFAULT_BASE_URL,
    apiKey: '',
  }

  const saved = await core.storage.read('config.json')
  if (saved) {
    if (saved.baseUrl) config.baseUrl = saved.baseUrl
    if (saved.apiKey) config.apiKey = saved.apiKey
  }

  async function apiFetch(path, options = {}) {
    const res = await fetch(`${config.baseUrl}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'X-N8N-API-KEY': config.apiKey,
        ...(options.headers ?? {}),
      },
    })
    if (!res.ok) throw new Error(`n8n API ${res.status}: ${await res.text()}`)
    return res.json()
  }

  core.ipc.handle('n8n:configure', async ({ baseUrl, apiKey }) => {
    config.baseUrl = baseUrl
    config.apiKey = apiKey
    await core.storage.write('config.json', { baseUrl, apiKey })
  })

  core.ipc.handle('n8n:status', async () => {
    try {
      const res = await fetch(`${config.baseUrl}/api/v1/workflows?limit=1`, {
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': config.apiKey,
        },
      })
      if (!res.ok) return { ok: false }
      const data = await res.json()
      return { ok: true, version: data.version }
    } catch {
      return { ok: false }
    }
  })

  core.ipc.handle('n8n:listWorkflows', async () => {
    const data = await apiFetch('/api/v1/workflows')
    return data.data.map(({ id, name, active }) => ({ id, name, active }))
  })

  core.ipc.handle('n8n:triggerWebhook', async ({ webhookPath, payload }) => {
    const res = await fetch(`${config.baseUrl}/webhook/${webhookPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload ?? {}),
    })
    let body
    try {
      body = await res.json()
    } catch {
      body = await res.text()
    }
    return { status: res.status, body }
  })

  core.ipc.handle('n8n:executions', async ({ workflowId, limit = 20 }) => {
    const data = await apiFetch(`/api/v1/executions?workflowId=${workflowId}&limit=${limit}`)
    return data.data.map(({ id, workflowId: wId, status, startedAt }) => ({
      id,
      workflowId: wId,
      status,
      startedAt,
    }))
  })

  core.registry.registerTool({ name: 'n8n' })
}
