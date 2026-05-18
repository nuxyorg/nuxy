interface Window {
  core: {
    ipc: {
      invoke: <R = any>(extId: string, channel: string, payload?: any) => Promise<{ success: boolean; data?: R; error?: string }>;
    }
  }
}
