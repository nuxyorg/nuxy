import fileMocks from 'virtual:ext-mocks'

type IpcResult = { success: boolean; data?: unknown; error?: string; hasHandler?: boolean }

export type MockSource = 'ui' | 'backend' | 'file' | 'null'

export interface LogEntry {
  extId: string
  channel: string
  payload: unknown
  data: unknown
  source: MockSource
  ts: number
}

export const ipcLog: LogEntry[] = []

// Runtime mocks set via MockPanel UI — highest priority
export const runtimeMocks: Record<string, unknown> = {}

export function setMock(channel: string, value: unknown): void {
  runtimeMocks[channel] = value
}

export function clearMock(channel: string): void {
  delete runtimeMocks[channel]
}

async function mockInvoke(extId: string, channel: string, payload?: unknown): Promise<IpcResult> {
  if (extId === 'kernel') {
    if (channel === 'getExtensionTranslations') return { success: true, data: { translations: {} } }
    if (channel === 'getThemeByName') return { success: true, data: null }
    return { success: true, data: null }
  }

  // 1. UI mocks — user explicitly set these
  if (Object.prototype.hasOwnProperty.call(runtimeMocks, channel)) {
    const m = runtimeMocks[channel]
    const data = typeof m === 'function' ? await (m as (p: unknown) => unknown)(payload) : m
    ipcLog.push({ extId, channel, payload, data, source: 'ui', ts: Date.now() })
    return { success: true, data }
  }

  // 2. Real backend — calls the extension's actual handler via Vite dev server
  try {
    const res = await fetch('/api/invoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, payload }),
    })
    if (res.ok) {
      const result: IpcResult = await res.json()
      const source: MockSource = result.hasHandler ? 'backend' : 'null'
      ipcLog.push({ extId, channel, payload, data: result.data, source, ts: Date.now() })
      return { success: result.success, data: result.data }
    }
  } catch {
    /* server not ready yet, fall through */
  }

  // 3. File-based mocks (dev/mocks.ts)
  const fm = (fileMocks as Record<string, unknown>)[channel]
  if (fm !== undefined) {
    const data = typeof fm === 'function' ? await (fm as (p: unknown) => unknown)(payload) : fm
    ipcLog.push({ extId, channel, payload, data, source: 'file', ts: Date.now() })
    return { success: true, data }
  }

  ipcLog.push({ extId, channel, payload, data: null, source: 'null', ts: Date.now() })
  return { success: true, data: null }
}

export function setupMockCore() {
  ;(window as any).core = {
    ipc: { invoke: mockInvoke },
    window: {
      hide: () => {},
      resize: () => {},
      center: () => {},
      drag: () => {},
      onShow: () => () => {},
      esc: () => {},
    },
    icons: { get: () => '', listPacks: () => [] },
    themes: { list: () => [] },
  }
}
