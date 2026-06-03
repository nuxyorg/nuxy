const React = window.React

import type { N8nWorkflow } from '../types.ts'

const _useListNavigation =
  (window.UI || {}).useListNavigation ||
  (() => ({ selectedIndex: -1, setSelectedIndex: () => {}, selectedItem: null }))

const _useToolKeyActions = (window.UI || {}).useToolKeyActions || (() => {})

interface Params {
  filteredWorkflows: N8nWorkflow[]
  showConfig: boolean
  configured: boolean
  setShowConfig: React.Dispatch<React.SetStateAction<boolean>>
  handleSaveConfig: () => Promise<void>
  handleRefresh: () => Promise<void>
  handleSelectWorkflow: (wf: N8nWorkflow) => Promise<void>
  handleRunWebhook: (wf: N8nWorkflow) => Promise<void>
}

interface N8nKeyboardResult {
  selectedIndex: number
}

export function useN8nKeyboard({
  filteredWorkflows,
  showConfig,
  configured,
  setShowConfig,
  handleSaveConfig,
  handleRefresh,
  handleSelectWorkflow,
  handleRunWebhook,
}: Params): N8nKeyboardResult {
  const { selectedIndex } = _useListNavigation(filteredWorkflows, {
    onEnter: (wf: N8nWorkflow) => {
      void handleSelectWorkflow(wf)
    },
    enterLabel: 'Select',
    enterHint: 'Enter',
  })

  _useToolKeyActions([
    {
      key: ',',
      modifiers: ['ctrl'] as ('ctrl' | 'shift' | 'alt' | 'meta')[],
      label: 'Configure',
      hint: '⌃,',
      handler: () => setShowConfig((v) => !v),
    },
    {
      key: 'Enter',
      modifiers: ['ctrl'] as ('ctrl' | 'shift' | 'alt' | 'meta')[],
      label: 'Save',
      hint: '⌃↵',
      activeOn: () => showConfig || !configured,
      handler: () => {
        void handleSaveConfig()
      },
    },
    {
      key: 'Escape',
      label: 'Cancel',
      activeOn: () => showConfig,
      handler: () => setShowConfig(false),
    },
  ])

  React.useEffect(() => {
    const actions: { id: string; label: string; onExecute: () => void }[] = [
      {
        id: 'n8n-configure',
        label: showConfig ? 'Show Workflows' : 'Configure Connection',
        onExecute: () => setShowConfig((v) => !v),
      },
    ]
    if (!showConfig && configured) {
      actions.push({
        id: 'n8n-refresh',
        label: 'Refresh Workflows',
        onExecute: () => {
          void handleRefresh()
        },
      })
    }
    const activeWorkflow = filteredWorkflows[selectedIndex]
    if (activeWorkflow) {
      actions.push({
        id: 'n8n-run-webhook',
        label: `Run Webhook: ${activeWorkflow.name}`,
        onExecute: () => {
          void handleRunWebhook(activeWorkflow)
        },
      })
    }
    window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: actions }))
    return () => {
      window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: [] }))
    }
  }, [showConfig, configured, selectedIndex, filteredWorkflows])

  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [selectedIndex])

  return { selectedIndex }
}
