/** Messages sent from the extension worker to the host (main process). */
export type WorkerToHostMessage =
  | {
      kind: 'event'
      type: 'registry:sync'
      ipcChannels: string[]
      displayName?: string
      registeredEntries?: import('./types.js').RegistryEntry[]
    }
  | { kind: 'event'; type: 'registry:error'; error: string }
  | { kind: 'call'; type: 'host:call'; id: string; channel: string; payload?: unknown }
  | { kind: 'reply'; id: string; result?: unknown; error?: string }

/** Messages sent from the host to the extension worker. */
export type HostToWorkerMessage =
  | { kind: 'reply'; type: 'host:reply'; id: string; result?: unknown; error?: string }
  | { kind: 'call'; id: string; channel: string; payload?: unknown }
