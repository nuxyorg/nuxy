export interface N8nConfig {
  baseUrl: string
  apiKey: string
}

export interface N8nWorkflow {
  id: string
  name: string
  active: boolean
}

export interface N8nExecution {
  id: string
  workflowId: string
  status: string
  startedAt: string
}

export interface N8nStatusResult {
  ok: boolean
  version?: string
}

export interface N8nTriggerWebhookResult {
  status: number
  body: unknown
}

export interface N8nConfigurePayload {
  baseUrl: string
  apiKey: string
}

export interface N8nTriggerWebhookPayload {
  webhookPath: string
  payload?: unknown
}

export interface N8nExecutionsPayload {
  workflowId: string
  limit?: number
}
