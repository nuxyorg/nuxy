const React = window.React
const { useState, useEffect, useMemo } = React

import type { N8nWorkflow, N8nExecution, N8nStatusResult } from './types.ts'

const EXT_ID = 'com.nuxy.n8n'

const _useListNavigation =
  (window.UI || {}).useListNavigation ||
  (() => ({ selectedIndex: -1, setSelectedIndex: () => {}, selectedItem: null }))
const _useToolKeyActions = (window.UI || {}).useToolKeyActions || (() => {})

interface Props {
  query: string
}

async function invoke<T>(channel: string, payload?: unknown): Promise<T> {
  const res = await window.core.ipc.invoke(EXT_ID, channel, payload)
  const r = res as { success: boolean; data?: T; error?: string } | null
  if (r && r.success) return r.data as T
  throw new Error(r?.error || 'IPC call failed')
}

export default function N8nApp({ query }: Props) {
  const {
    List,
    ListItem,
    ListItemBody,
    ListItemText,
    ListItemMeta,
    ListItemActions,
    Button,
    Input,
    EmptyState,
    Alert,
    Card,
    Badge,
    SectionHeader,
  } = window.UI || {}

  const [configured, setConfigured] = useState<boolean>(false)
  const [showConfig, setShowConfig] = useState<boolean>(false)
  const [status, setStatus] = useState<N8nStatusResult | null>(null)
  const [workflows, setWorkflows] = useState<N8nWorkflow[]>([])
  const [selected, setSelected] = useState<N8nWorkflow | null>(null)
  const [executions, setExecutions] = useState<N8nExecution[]>([])
  const [loading, setLoading] = useState<boolean>(false)
  const [baseUrl, setBaseUrl] = useState<string>('http://localhost:5678')
  const [apiKey, setApiKey] = useState<string>('')

  const filteredWorkflows = useMemo(() => {
    if (!query.trim()) return workflows
    const q = query.toLowerCase()
    return workflows.filter((wf) => wf.name.toLowerCase().includes(q))
  }, [workflows, query])

  useEffect(() => {
    invoke<N8nStatusResult>('n8n:status')
      .then((st) => {
        if (st.ok) {
          setConfigured(true)
          setStatus(st)
          invoke<N8nWorkflow[]>('n8n:listWorkflows')
            .then(setWorkflows)
            .catch(() => {})
        }
      })
      .catch(() => {})
  }, [])

  async function handleSaveConfig(): Promise<void> {
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
  }

  async function handleRefresh(): Promise<void> {
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
  }

  async function handleSelectWorkflow(wf: N8nWorkflow): Promise<void> {
    setSelected(wf)
    const execs = await invoke<N8nExecution[]>('n8n:executions', {
      workflowId: wf.id,
      limit: 5,
    }).catch(() => [] as N8nExecution[])
    setExecutions(execs)
  }

  async function handleRunWebhook(wf: N8nWorkflow): Promise<void> {
    await invoke('n8n:triggerWebhook', { webhookPath: wf.id }).catch(() => {})
  }

  const { selectedIndex } = _useListNavigation(filteredWorkflows, {
    onEnter: (wf: N8nWorkflow) => {
      void handleSelectWorkflow(wf)
    },
    enterLabel: 'Select',
    enterHint: 'Enter',
    extraActions: [
      {
        key: 'r',
        label: 'Refresh',
        hint: 'R',
        handler: () => {
          void handleRefresh()
        },
      },
    ],
  })

  _useToolKeyActions([
    {
      key: 'c',
      label: 'Configure',
      hint: 'C',
      handler: () => setShowConfig((v) => !v),
    },
  ])

  if (showConfig || !configured) {
    return (
      <>
        {SectionHeader && <SectionHeader title="Configure n8n" />}
        {Card && (
          <Card>
            {Input && (
              <Input
                label="Base URL"
                value={baseUrl}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBaseUrl(e.target.value)}
                placeholder="http://localhost:5678"
              />
            )}
            {Input && (
              <Input
                label="API Key"
                type="password"
                value={apiKey}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setApiKey(e.target.value)}
                placeholder="n8n_api_…"
              />
            )}
            {Button && (
              <Button
                onClick={() => {
                  void handleSaveConfig()
                }}
              >
                Save
              </Button>
            )}
            {showConfig && Button && <Button onClick={() => setShowConfig(false)}>Cancel</Button>}
          </Card>
        )}
      </>
    )
  }

  return (
    <>
      {status && !status.ok && Alert && <Alert variant="danger">n8n unreachable</Alert>}
      {SectionHeader && (
        <SectionHeader
          title="Workflows"
          action={
            Button ? (
              <Button
                onClick={() => {
                  void handleRefresh()
                }}
                disabled={loading}
              >
                {loading ? '…' : 'Refresh'}
              </Button>
            ) : undefined
          }
        />
      )}
      <List>
        {filteredWorkflows.length === 0 ? (
          <EmptyState message={query ? 'No matching workflows.' : 'No workflows found.'} />
        ) : (
          filteredWorkflows.map((wf, idx) => (
            <ListItem
              key={wf.id}
              active={idx === selectedIndex}
              onClick={() => {
                void handleSelectWorkflow(wf)
              }}
            >
              <ListItemBody>
                <ListItemText>{wf.name}</ListItemText>
                <ListItemMeta>{wf.active ? 'active' : 'inactive'}</ListItemMeta>
              </ListItemBody>
              <ListItemActions>
                {Badge && (
                  <Badge variant={wf.active ? 'success' : 'default'}>
                    {wf.active ? 'active' : 'inactive'}
                  </Badge>
                )}
                {Button && (
                  <Button
                    onClick={() => {
                      void handleRunWebhook(wf)
                    }}
                  >
                    Run
                  </Button>
                )}
              </ListItemActions>
            </ListItem>
          ))
        )}
      </List>
      {selected && (
        <>
          {SectionHeader && <SectionHeader title={`Executions: ${selected.name}`} />}
          <List>
            {executions.length === 0 ? (
              <EmptyState message="No executions found." />
            ) : (
              executions.map((ex) => (
                <ListItem key={ex.id}>
                  <ListItemBody>
                    <ListItemText>{ex.status}</ListItemText>
                    <ListItemMeta>{ex.startedAt}</ListItemMeta>
                  </ListItemBody>
                  {Badge && (
                    <Badge
                      variant={
                        ex.status === 'success'
                          ? 'success'
                          : ex.status === 'error'
                            ? 'danger'
                            : 'default'
                      }
                    >
                      {ex.status}
                    </Badge>
                  )}
                </ListItem>
              ))
            )}
          </List>
        </>
      )}
    </>
  )
}
