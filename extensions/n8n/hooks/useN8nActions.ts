const React = window.React

import type { N8nWorkflow, N8nExecution, N8nStatusResult } from '../types.ts'

const EXT_ID = 'com.nuxy.n8n'

async function invoke<T>(channel: string, payload?: unknown): Promise<T> {
  const res = await window.core.ipc.invoke(EXT_ID, channel, payload)
  const r = res as { success: boolean; data?: T; error?: string } | null
  if (r && r.success) return r.data as T
  throw new Error(r?.error || 'IPC call failed')
}

interface Params {
  baseUrl: string
  apiKey: string
  setConfigured: React.Dispatch<React.SetStateAction<boolean>>
  setShowConfig: React.Dispatch<React.SetStateAction<boolean>>
  setStatus: React.Dispatch<React.SetStateAction<N8nStatusResult | null>>
  setWorkflows: React.Dispatch<React.SetStateAction<N8nWorkflow[]>>
  setSelected: React.Dispatch<React.SetStateAction<N8nWorkflow | null>>
  setExecutions: React.Dispatch<React.SetStateAction<N8nExecution[]>>
}

interface N8nActions {
  handleSaveConfig: () => Promise<void>
  handleRefresh: () => Promise<void>
  handleSelectWorkflow: (wf: N8nWorkflow) => Promise<void>
  handleRunWebhook: (wf: N8nWorkflow) => Promise<void>
}

export function useN8nActions({
  baseUrl,
  apiKey,
  setConfigured,
  setShowConfig,
  setStatus,
  setWorkflows,
  setSelected,
  setExecutions,
}: Params): N8nActions {
  const [, setLoading] = React.useState<boolean>(false)
  const handleSaveConfig = React.useCallback(async (): Promise<void> => {
    await invoke('n8n:configure', { baseUrl, apiKey })
    setShowConfig(false)
    setConfigured(true)
    const st = await invoke<N8nStatusResult>('n8n:status').catch(() => ({ ok: false }))
    setStatus(st)
    if (st.ok) {
      invoke<N8nWorkflow[]>('n8n:listWorkflows')
        .then(setWorkflows)
        .catch(() => {})
    }
  }, [baseUrl, apiKey])

  const handleRefresh = React.useCallback(async (): Promise<void> => {
    setLoading(true)
    try {
      const st = await invoke<N8nStatusResult>('n8n:status')
      setStatus(st)
      if (st.ok) {
        const wfs = await invoke<N8nWorkflow[]>('n8n:listWorkflows')
        setWorkflows(wfs)
      }
    } catch {}
    setLoading(false)
  }, [])

  const handleSelectWorkflow = React.useCallback(async (wf: N8nWorkflow): Promise<void> => {
    setSelected(wf)
    const execs = await invoke<N8nExecution[]>('n8n:executions', {
      workflowId: wf.id,
      limit: 5,
    }).catch(() => [] as N8nExecution[])
    setExecutions(execs)
  }, [])

  const handleRunWebhook = React.useCallback(async (wf: N8nWorkflow): Promise<void> => {
    await invoke('n8n:triggerWebhook', { webhookPath: wf.id }).catch(() => {})
  }, [])

  return { handleSaveConfig, handleRefresh, handleSelectWorkflow, handleRunWebhook }
}
