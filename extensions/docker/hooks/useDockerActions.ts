const React = window.React

import type { DockerContainer } from '../types.ts'
import { ipc as invoke } from '../utils/ipc.ts'

interface Params {
  refresh: () => void
  setLogs: (logs: string | null, id: string | null) => void
}

interface DockerActions {
  handleToggle: (container: DockerContainer) => void
  handleRestart: (container: DockerContainer) => void
  handleRemove: (container: DockerContainer) => void
  handleLogs: (container: DockerContainer) => void
}

export function useDockerActions({ refresh, setLogs }: Params): DockerActions {
  const handleToggle = React.useCallback(
    (container: DockerContainer): void => {
      const channel = container.state === 'running' ? 'docker:stop' : 'docker:start'
      invoke<{ success: boolean }>(channel, { id: container.id })
        .then(() => refresh())
        .catch(() => {})
    },
    [refresh]
  )

  const handleRestart = React.useCallback(
    (container: DockerContainer): void => {
      invoke<{ success: boolean }>('docker:restart', { id: container.id })
        .then(() => refresh())
        .catch(() => {})
    },
    [refresh]
  )

  const handleRemove = React.useCallback(
    (container: DockerContainer): void => {
      invoke<{ success: boolean }>('docker:remove', { id: container.id })
        .then(() => refresh())
        .catch(() => {})
    },
    [refresh]
  )

  const handleLogs = React.useCallback(
    (container: DockerContainer): void => {
      invoke<{ logs: string }>('docker:logs', { id: container.id, tail: 100 })
        .then((res) => setLogs(res.logs, container.id))
        .catch(() => {})
    },
    [setLogs]
  )

  return { handleToggle, handleRestart, handleRemove, handleLogs }
}
