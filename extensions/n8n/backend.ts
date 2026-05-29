import type { CoreContext } from '@nuxy/extension-sdk'
import type {
  N8nConfig,
  N8nWorkflow,
  N8nExecution,
  N8nStatusResult,
  N8nTriggerWebhookResult,
  N8nConfigurePayload,
  N8nTriggerWebhookPayload,
  N8nExecutionsPayload,
} from './types.ts'

const DEFAULT_BASE_URL = 'http://localhost:5678'

export async function register(core: CoreContext): Promise<void> {
  const config: N8nConfig = {
    baseUrl: DEFAULT_BASE_URL,
    apiKey: '',
  }

  const saved = await core.storage.read('config.json')
  if (saved && typeof saved === 'object' && saved !== null) {
    const s = saved as Partial<N8nConfig>
    if (s.baseUrl) config.baseUrl = s.baseUrl
    if (s.apiKey) config.apiKey = s.apiKey
  }

  async function apiFetch(path: string, options: RequestInit = {}): Promise<unknown> {
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

  core.ipc.handle('n8n:configure', async (payload: unknown) => {
    const { baseUrl, apiKey } = payload as N8nConfigurePayload
    config.baseUrl = baseUrl
    config.apiKey = apiKey
    await core.storage.write('config.json', { baseUrl, apiKey })
  })

  core.ipc.handle('n8n:status', async (): Promise<N8nStatusResult> => {
    try {
      const res = await fetch(`${config.baseUrl}/api/v1/workflows?limit=1`, {
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-API-KEY': config.apiKey,
        },
      })
      if (!res.ok) return { ok: false }
      const data = (await res.json()) as { version?: string }
      return { ok: true, version: data.version }
    } catch {
      return { ok: false }
    }
  })

  core.ipc.handle('n8n:listWorkflows', async (): Promise<N8nWorkflow[]> => {
    const data = (await apiFetch('/api/v1/workflows')) as { data: N8nWorkflow[] }
    return data.data.map(({ id, name, active }) => ({ id, name, active }))
  })

  core.ipc.handle(
    'n8n:triggerWebhook',
    async (payload: unknown): Promise<N8nTriggerWebhookResult> => {
      const { webhookPath, payload: webhookPayload } = payload as N8nTriggerWebhookPayload
      const res = await fetch(`${config.baseUrl}/webhook/${webhookPath}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(webhookPayload ?? {}),
      })
      let body: unknown
      try {
        body = await res.json()
      } catch {
        body = await res.text()
      }
      return { status: res.status, body }
    }
  )

  core.ipc.handle('n8n:executions', async (payload: unknown): Promise<N8nExecution[]> => {
    const { workflowId, limit = 20 } = payload as N8nExecutionsPayload
    const data = (await apiFetch(`/api/v1/executions?workflowId=${workflowId}&limit=${limit}`)) as {
      data: N8nExecution[]
    }
    return data.data.map(({ id, workflowId: wId, status, startedAt }) => ({
      id,
      workflowId: wId,
      status,
      startedAt,
    }))
  })

  core.registry.registerTool({ name: 'n8n' })
}
