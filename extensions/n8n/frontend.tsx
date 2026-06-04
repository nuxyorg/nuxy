const React = window.React

const EXT_ID = 'com.nuxy.n8n'
const _useTranslation =
  (window.UI || {}).useTranslation ||
  (() => ({ t: (key: string) => key, locale: 'en', dir: 'ltr' as const }))

import type { N8nWorkflow, N8nExecution } from './types.ts'
import { useN8nData } from './hooks/useN8nData.ts'
import { useN8nActions } from './hooks/useN8nActions.ts'
import { useN8nKeyboard } from './hooks/useN8nKeyboard.ts'
import { N8nConfigPanel } from './components/N8nConfigPanel.tsx'
import { N8nWorkflowList } from './components/N8nWorkflowList.tsx'
import { N8nExecutionList } from './components/N8nExecutionList.tsx'

interface Props {
  query: string
}

export default function N8nApp({ query }: Props) {
  const { Alert } = window.UI || {}
  const { t } = _useTranslation(EXT_ID)

  const [showConfig, setShowConfig] = React.useState<boolean>(false)
  const [selected, setSelected] = React.useState<N8nWorkflow | null>(null)
  const [executions, setExecutions] = React.useState<N8nExecution[]>([])

  const {
    configured,
    setConfigured,
    status,
    setStatus,
    workflows,
    setWorkflows,
    baseUrl,
    setBaseUrl,
    apiKey,
    setApiKey,
  } = useN8nData()

  const filteredWorkflows = React.useMemo(() => {
    if (!query.trim()) return workflows
    const q = query.toLowerCase()
    return workflows.filter((wf) => wf.name.toLowerCase().includes(q))
  }, [workflows, query])

  const { handleSaveConfig, handleRefresh, handleSelectWorkflow, handleRunWebhook } = useN8nActions(
    {
      baseUrl,
      apiKey,
      setConfigured,
      setShowConfig,
      setStatus,
      setWorkflows,
      setSelected,
      setExecutions,
    }
  )

  const { selectedIndex } = useN8nKeyboard({
    filteredWorkflows,
    showConfig,
    configured,
    setShowConfig,
    handleSaveConfig,
    handleRefresh,
    handleSelectWorkflow,
    handleRunWebhook,
    t,
  })

  if (showConfig || !configured) {
    return (
      <N8nConfigPanel
        baseUrl={baseUrl}
        apiKey={apiKey}
        onBaseUrlChange={setBaseUrl}
        onApiKeyChange={setApiKey}
      />
    )
  }

  return (
    <>
      {status && !status.ok && Alert && <Alert variant="danger">{t('status.unreachable')}</Alert>}
      <N8nWorkflowList
        workflows={filteredWorkflows}
        selectedIndex={selectedIndex}
        query={query}
        onSelect={(wf) => void handleSelectWorkflow(wf)}
      />
      {selected && <N8nExecutionList selected={selected} executions={executions} />}
    </>
  )
}
