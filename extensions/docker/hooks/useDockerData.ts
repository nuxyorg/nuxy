const React = window.React

import type { DockerContainer, DockerImage } from '../types.ts'

const EXT_ID = 'com.nuxy.docker'

function invoke<T = unknown>(channel: string, payload?: unknown): Promise<T> {
  return window.core.ipc.invoke(EXT_ID, channel, payload).then((res) => {
    const r = res as { success: boolean; data?: T; error?: string } | null
    if (!r?.success) throw new Error(r?.error ?? 'IPC call failed')
    return r.data as T
  })
}

export interface DockerDataState {
  containers: DockerContainer[]
  images: DockerImage[]
  loading: boolean
  error: string | null
  logs: string | null
  logsContainerId: string | null
  showAll: boolean
  setShowAll: (v: boolean) => void
  setLogs: (logs: string | null, id: string | null) => void
  refresh: () => void
}

export function useDockerData(view: 'containers' | 'images'): DockerDataState {
  const [containers, setContainers] = React.useState<DockerContainer[]>([])
  const [images, setImages] = React.useState<DockerImage[]>([])
  const [loading, setLoading] = React.useState<boolean>(false)
  const [error, setError] = React.useState<string | null>(null)
  const [logs, setLogsState] = React.useState<string | null>(null)
  const [logsContainerId, setLogsContainerId] = React.useState<string | null>(null)
  const [showAll, setShowAll] = React.useState<boolean>(false)

  const setLogs = React.useCallback((l: string | null, id: string | null): void => {
    setLogsState(l)
    setLogsContainerId(id)
  }, [])

  const loadContainers = React.useCallback((): void => {
    setLoading(true)
    setError(null)
    invoke<DockerContainer[]>('docker:containers', { all: showAll })
      .then(setContainers)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [showAll])

  const loadImages = React.useCallback((): void => {
    setLoading(true)
    setError(null)
    invoke<DockerImage[]>('docker:images')
      .then(setImages)
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false))
  }, [])

  const refresh = React.useCallback((): void => {
    if (view === 'containers') {
      loadContainers()
    } else {
      loadImages()
    }
  }, [view, loadContainers, loadImages])

  React.useEffect(() => {
    refresh()
  }, [refresh])

  return {
    containers,
    images,
    loading,
    error,
    logs,
    logsContainerId,
    showAll,
    setShowAll,
    setLogs,
    refresh,
  }
}
