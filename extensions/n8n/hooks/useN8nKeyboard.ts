const React = window.React

import type { N8nWorkflow } from '../types.ts'

import { _useListNavigation, _useToolKeyActions } from '../../ui-hooks.ts'

interface Params {
  filteredWorkflows: N8nWorkflow[]
  showConfig: boolean
  configured: boolean
  setShowConfig: React.Dispatch<React.SetStateAction<boolean>>
  handleSaveConfig: () => Promise<void>
  handleRefresh: () => Promise<void>
  handleSelectWorkflow: (wf: N8nWorkflow) => Promise<void>
  handleRunWebhook: (wf: N8nWorkflow) => Promise<void>
  t: (key: string) => string
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
  t,
}: Params): N8nKeyboardResult {
  const { selectedIndex } = _useListNavigation(filteredWorkflows, {
    onEnter: (wf: N8nWorkflow) => {
      void handleSelectWorkflow(wf)
    },
    enterLabel: t('actions.select'),
    enterHint: 'Enter',
  })

  _useToolKeyActions([
    {
      key: ',',
      modifiers: ['ctrl'] as ('ctrl' | 'shift' | 'alt' | 'meta')[],
      label: t('actions.configure'),
      hint: '⌃,',
      handler: () => setShowConfig((v) => !v),
    },
    {
      key: 'Enter',
      modifiers: ['ctrl'] as ('ctrl' | 'shift' | 'alt' | 'meta')[],
      label: t('actions.save'),
      hint: '⌃↵',
      activeOn: () => showConfig || !configured,
      handler: () => {
        void handleSaveConfig()
      },
    },
    {
      key: 'Escape',
      label: t('actions.cancel'),
      activeOn: () => showConfig,
      handler: () => setShowConfig(false),
    },
  ])

  React.useEffect(() => {
    const actions: { id: string; label: string; onExecute: () => void }[] = [
      {
        id: 'n8n-configure',
        label: showConfig ? t('actions.showWorkflows') : t('actions.configureConnection'),
        onExecute: () => setShowConfig((v) => !v),
      },
    ]
    if (!showConfig && configured) {
      actions.push({
        id: 'n8n-refresh',
        label: t('actions.refreshWorkflows'),
        onExecute: () => {
          void handleRefresh()
        },
      })
    }
    const activeWorkflow = filteredWorkflows[selectedIndex]
    if (activeWorkflow) {
      actions.push({
        id: 'n8n-run-webhook',
        label: `${t('actions.runWebhookPrefix')} ${activeWorkflow.name}`,
        onExecute: () => {
          void handleRunWebhook(activeWorkflow)
        },
      })
    }
    window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: actions }))
    return () => {
      window.dispatchEvent(new CustomEvent('nuxy-register-actions', { detail: [] }))
    }
  }, [showConfig, configured, selectedIndex, filteredWorkflows, t])

  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [selectedIndex])

  return { selectedIndex }
}
