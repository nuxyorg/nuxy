const React = window.React

import type { N8nWorkflow, N8nStatusResult } from '../types.ts'
import { ipc as invoke } from '../utils/ipc.ts'

interface N8nData {
  configured: boolean
  setConfigured: React.Dispatch<React.SetStateAction<boolean>>
  status: N8nStatusResult | null
  setStatus: React.Dispatch<React.SetStateAction<N8nStatusResult | null>>
  workflows: N8nWorkflow[]
  setWorkflows: React.Dispatch<React.SetStateAction<N8nWorkflow[]>>
  baseUrl: string
  setBaseUrl: React.Dispatch<React.SetStateAction<string>>
  apiKey: string
  setApiKey: React.Dispatch<React.SetStateAction<string>>
}

export function useN8nData(): N8nData {
  const [configured, setConfigured] = React.useState<boolean>(false)
  const [status, setStatus] = React.useState<N8nStatusResult | null>(null)
  const [workflows, setWorkflows] = React.useState<N8nWorkflow[]>([])
  const [baseUrl, setBaseUrl] = React.useState<string>('http://localhost:5678')
  const [apiKey, setApiKey] = React.useState<string>('')

  React.useEffect(() => {
    invoke<{ baseUrl: string; apiKey: string }>('n8n:getConfig')
      .then(({ baseUrl: url, apiKey: key }) => {
        if (url) setBaseUrl(url)
        if (key) setApiKey(key)
      })
      .catch(() => {})
  }, [])

  React.useEffect(() => {
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

  return {
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
  }
}
