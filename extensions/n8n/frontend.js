const { useState, useEffect } = window.React
const h = window.React.createElement

const invoke = (channel, payload) =>
  window.core.ipc.invoke('com.nuxy.n8n', channel, payload)

const STATUS_COLORS = { success: '#4ade80', error: '#f87171', running: '#facc15' }

function ConfigForm({ onSaved }) {
  const [baseUrl, setBaseUrl] = useState('http://localhost:5678')
  const [apiKey, setApiKey] = useState('')

  async function handleSave() {
    await invoke('n8n:configure', { baseUrl, apiKey })
    onSaved()
  }

  return h('div', { style: { padding: 16 } },
    h('h3', { style: { marginBottom: 12 } }, 'Configure n8n'),
    h('label', { style: { display: 'block', marginBottom: 8 } },
      'Base URL',
      h('input', {
        value: baseUrl,
        onChange: (e) => setBaseUrl(e.target.value),
        style: { display: 'block', width: '100%', marginTop: 4 },
      })
    ),
    h('label', { style: { display: 'block', marginBottom: 12 } },
      'API Key',
      h('input', {
        type: 'password',
        value: apiKey,
        onChange: (e) => setApiKey(e.target.value),
        style: { display: 'block', width: '100%', marginTop: 4 },
      })
    ),
    h('button', { onClick: handleSave }, 'Save')
  )
}

export default function N8nApp() {
  const [configured, setConfigured] = useState(false)
  const [status, setStatus] = useState(null)
  const [workflows, setWorkflows] = useState([])
  const [selected, setSelected] = useState(null)
  const [executions, setExecutions] = useState([])
  const [loading, setLoading] = useState(false)

  async function init() {
    const st = await invoke('n8n:status')
    setStatus(st)
    if (st.ok) {
      const wfs = await invoke('n8n:listWorkflows')
      setWorkflows(wfs)
    }
  }

  useEffect(() => {
    invoke('n8n:status').then((st) => {
      if (st.ok) {
        setConfigured(true)
        setStatus(st)
        invoke('n8n:listWorkflows').then(setWorkflows).catch(() => {})
      }
    }).catch(() => {})
  }, [])

  async function handleRefresh() {
    setLoading(true)
    await init().catch(() => {})
    setLoading(false)
  }

  async function handleSelectWorkflow(wf) {
    setSelected(wf)
    const execs = await invoke('n8n:executions', { workflowId: wf.id, limit: 5 }).catch(() => [])
    setExecutions(execs)
  }

  async function handleRunWebhook(wf, e) {
    e.stopPropagation()
    await invoke('n8n:triggerWebhook', { webhookPath: wf.id }).catch(() => {})
  }

  if (!configured) {
    return h(ConfigForm, {
      onSaved: () => {
        setConfigured(true)
        init().catch(() => {})
      },
    })
  }

  return h('div', { style: { padding: 12, fontFamily: 'sans-serif' } },
    h('div', { style: { display: 'flex', alignItems: 'center', marginBottom: 8 } },
      h('h3', { style: { margin: 0, flex: 1 } }, 'Workflows'),
      h('button', { onClick: handleRefresh, disabled: loading }, loading ? '...' : 'Refresh')
    ),
    status && !status.ok && h('p', { style: { color: '#f87171' } }, 'n8n unreachable'),
    h('ul', { style: { listStyle: 'none', padding: 0, margin: 0 } },
      workflows.map((wf) =>
        h('li', {
          key: wf.id,
          onClick: () => handleSelectWorkflow(wf),
          style: {
            display: 'flex', alignItems: 'center', padding: '6px 8px',
            cursor: 'pointer', background: selected?.id === wf.id ? 'rgba(255,255,255,0.1)' : 'transparent',
            borderRadius: 4, marginBottom: 2,
          },
        },
          h('span', { style: { flex: 1 } }, wf.name),
          h('span', {
            style: {
              fontSize: 11, padding: '2px 6px', borderRadius: 10,
              background: wf.active ? '#16a34a' : '#6b7280', color: '#fff', marginRight: 6,
            },
          }, wf.active ? 'active' : 'inactive'),
          h('button', { onClick: (e) => handleRunWebhook(wf, e), style: { fontSize: 11 } }, 'Run')
        )
      )
    ),
    selected && h('div', { style: { marginTop: 12 } },
      h('h4', { style: { marginBottom: 6 } }, `Executions: ${selected.name}`),
      executions.length === 0
        ? h('p', { style: { color: '#9ca3af', fontSize: 12 } }, 'No executions found')
        : h('ul', { style: { listStyle: 'none', padding: 0, margin: 0 } },
            executions.map((ex) =>
              h('li', {
                key: ex.id,
                style: { display: 'flex', alignItems: 'center', gap: 8, padding: '3px 0', fontSize: 12 },
              },
                h('span', {
                  style: {
                    width: 8, height: 8, borderRadius: '50%',
                    background: STATUS_COLORS[ex.status] ?? '#9ca3af', flexShrink: 0,
                  },
                }),
                h('span', {}, ex.status),
                h('span', { style: { color: '#9ca3af' } }, ex.startedAt)
              )
            )
          )
    )
  )
}
