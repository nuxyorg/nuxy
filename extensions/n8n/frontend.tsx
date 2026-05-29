const React = window.React
const { useState, useEffect } = React

import type { N8nWorkflow, N8nExecution, N8nStatusResult } from './types.ts'

const STATUS_COLORS: Record<string, string> = {
  success: 'var(--color-success, #4ade80)',
  error: 'var(--color-danger, #f87171)',
  running: 'var(--color-warning, #facc15)',
}

async function invoke<T>(channel: string, payload?: unknown): Promise<T> {
  const res = await window.core.ipc.invoke('com.nuxy.n8n', channel, payload)
  const r = res as { success: boolean; data?: T; error?: string } | null
  if (r && r.success) {
    return r.data as T
  }
  throw new Error(r?.error || 'IPC call failed')
}

interface ConfigFormProps {
  onSaved: () => void
}

function ConfigForm({ onSaved }: ConfigFormProps) {
  const [baseUrl, setBaseUrl] = useState<string>('http://localhost:5678')
  const [apiKey, setApiKey] = useState<string>('')

  async function handleSave(): Promise<void> {
    await invoke('n8n:configure', { baseUrl, apiKey })
    onSaved()
  }

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ marginBottom: 12 }}>Configure n8n</h3>
      <label style={{ display: 'block', marginBottom: 8 }}>
        Base URL
        <input
          value={baseUrl}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBaseUrl(e.target.value)}
          style={{ display: 'block', width: '100%', marginTop: 4 }}
        />
      </label>
      <label style={{ display: 'block', marginBottom: 12 }}>
        API Key
        <input
          type="password"
          value={apiKey}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
          style={{ display: 'block', width: '100%', marginTop: 4 }}
        />
      </label>
      <button onClick={handleSave}>Save</button>
    </div>
  )
}

export default function N8nApp() {
  const [configured, setConfigured] = useState<boolean>(false)
  const [status, setStatus] = useState<N8nStatusResult | null>(null)
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([])
  const [selected, setSelected] = useState<N8nWorkflow | null>(null)
  const [executions, setExecutions] = useState<N8nExecution[]>([])
  const [loading, setLoading] = useState<boolean>(false)

  async function init(): Promise<void> {
    const st = await invoke<N8nStatusResult>('n8n:status')
    setStatus(st)
    if (st.ok) {
      const wfs = await invoke<N8nWorkflow[]>('n8n:listWorkflows')
      setWorkflows(wfs)
    }
  }

  useEffect(() => {
    invoke<N8nStatusResult>('n8n:status')
      .then((st) => {
        if (st.ok) {
          setConfigured(true)
          setStatus(st)
          invoke<N8nWorkflow[]>('n8n:listWorkflows').then(setWorkflows).catch(() => {})
        }
      })
      .catch(() => {})
  }, [])

  async function handleRefresh(): Promise<void> {
    setLoading(true)
    await init().catch(() => {})
    setLoading(false)
  }

  async function handleSelectWorkflow(wf: N8nWorkflow): Promise<void> {
    setSelected(wf)
    const execs = await invoke<N8nExecution[]>('n8n:executions', {
      workflowId: wf.id,
      limit: 5,
    }).catch(() => [] as N8nExecution[])
    setExecutions(execs)
  }

  async function handleRunWebhook(wf: N8nWorkflow, e: React.MouseEvent): Promise<void> {
    e.stopPropagation()
    await invoke('n8n:triggerWebhook', { webhookPath: wf.id }).catch(() => {})
  }

  if (!configured) {
    return (
      <ConfigForm
        onSaved={() => {
          setConfigured(true)
          init().catch(() => {})
        }}
      />
    )
  }

  return (
    <div style={{ padding: 12, fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
        <h3 style={{ margin: 0, flex: 1 }}>Workflows</h3>
        <button onClick={handleRefresh} disabled={loading}>
          {loading ? '...' : 'Refresh'}
        </button>
      </div>
      {status && !status.ok && <p style={{ color: '#f87171' }}>n8n unreachable</p>}
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {workflows.map((wf) => (
          <li
            key={wf.id}
            onClick={() => handleSelectWorkflow(wf)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '6px 8px',
              cursor: 'pointer',
              background: selected?.id === wf.id ? 'rgba(255,255,255,0.1)' : 'transparent',
              borderRadius: 4,
              marginBottom: 2,
            }}
          >
            <span style={{ flex: 1 }}>{wf.name}</span>
            <span
              style={{
                fontSize: 11,
                padding: '2px 6px',
                borderRadius: 10,
                background: wf.active ? '#16a34a' : '#6b7280',
                color: '#fff',
                marginRight: 6,
              }}
            >
              {wf.active ? 'active' : 'inactive'}
            </span>
            <button onClick={(e: React.MouseEvent) => handleRunWebhook(wf, e)} style={{ fontSize: 11 }}>
              Run
            </button>
          </li>
        ))}
      </ul>
      {selected && (
        <div style={{ marginTop: 12 }}>
          <h4 style={{ marginBottom: 6 }}>Executions: {selected.name}</h4>
          {executions.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: 12 }}>No executions found</p>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {executions.map((ex) => (
                <li
                  key={ex.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '3px 0',
                    fontSize: 12,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: STATUS_COLORS[ex.status] ?? '#9ca3af',
                      flexShrink: 0,
                    }}
                  />
                  <span>{ex.status}</span>
                  <span style={{ color: '#9ca3af' }}>{ex.startedAt}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
