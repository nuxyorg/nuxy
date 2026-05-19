/** Messages sent from the extension worker to the host (main process). */
export type WorkerToHostMessage =
  | { type: 'registry:sync'; ipcChannels: string[]; displayName?: string }
  | { type: 'registry:error'; error: string }
  | { type: 'host:call'; id: string; channel: string; payload?: unknown }

/** Messages sent from the host to the extension worker. */
export type HostToWorkerMessage =
  | { type: 'host:reply'; id: string; result?: unknown; error?: string }
  | { id: string; channel: string; payload?: unknown }
