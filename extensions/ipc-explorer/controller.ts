import {
  buildIpcTargets,
  kernelTarget,
  selectedTarget,
  canInvokeChannel,
  EXPLORER_EXT_ID,
  type IpcTarget,
} from './utils/parse-targets.ts'

export interface IpcExplorerState {
  ready: boolean
  loading: boolean
  loadError: string
  targets: IpcTarget[]
  selectedExtId: string
  selectedChannel: string
  payloadText: string
  invoking: boolean
  resultText: string
  invokeError: string
}

function initialState(): IpcExplorerState {
  const kernel = kernelTarget()
  return {
    ready: false,
    loading: true,
    loadError: '',
    targets: [kernel],
    selectedExtId: kernel.extId,
    selectedChannel: 'listInstalledExtensions',
    payloadText: '{}',
    invoking: false,
    resultText: '',
    invokeError: '',
  }
}

function parsePayload(raw: string): { ok: true; value: unknown } | { ok: false; error: string } {
  const trimmed = raw.trim()
  if (!trimmed) return { ok: true, value: {} }
  try {
    return { ok: true, value: JSON.parse(trimmed) as unknown }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Invalid JSON' }
  }
}

async function ipcInvoke(extId: string, channel: string, payload?: unknown): Promise<unknown> {
  const res = (await window.core.ipc.invoke(extId, channel, payload, {
    callerExtId: EXPLORER_EXT_ID,
  })) as {
    success: boolean
    data?: unknown
    error?: string
    code?: string
  } | null
  return res ?? { success: false, error: 'IPC call failed' }
}

export class IpcExplorerController {
  state: IpcExplorerState = initialState()

  constructor(private readonly notify: () => void) {}

  connect(): void {
    void this.refreshTargets()
  }

  get selectedTarget(): IpcTarget | undefined {
    return selectedTarget(this.state.targets, this.state.selectedExtId)
  }

  /** False when the selected channel is private (or target is not callable) — mirrors kernel enforcement. */
  get canInvokeSelected(): boolean {
    return canInvokeChannel(this.selectedTarget, this.state.selectedChannel)
  }

  async refreshTargets(): Promise<void> {
    this.patch({ loading: true, loadError: '' })
    try {
      const res = (await window.core.ipc.invoke('kernel', 'listInstalledExtensions', {})) as {
        success: boolean
        data?: unknown
        error?: string
      }

      const targets = res?.success ? buildIpcTargets(res.data) : [kernelTarget()]
      const loadError = res?.success ? '' : (res?.error ?? 'Failed to list extensions')

      let selectedExtId = this.state.selectedExtId
      let selectedChannel = this.state.selectedChannel
      if (!targets.some((t) => t.extId === selectedExtId)) {
        selectedExtId = 'kernel'
        selectedChannel = 'listInstalledExtensions'
      } else {
        const target = selectedTarget(targets, selectedExtId)
        if (target && !target.channels.includes(selectedChannel)) {
          selectedChannel = target.channels[0] ?? ''
        }
      }

      this.patch({
        targets,
        loadError,
        selectedExtId,
        selectedChannel,
        ready: true,
      })
    } catch (err) {
      this.patch({
        targets: [kernelTarget()],
        loadError: err instanceof Error ? err.message : 'Failed to load targets',
        selectedExtId: 'kernel',
        selectedChannel: 'listInstalledExtensions',
        ready: true,
      })
    } finally {
      this.patch({ loading: false })
    }
  }

  selectExtension(extId: string): void {
    const target = selectedTarget(this.state.targets, extId)
    this.patch({
      selectedExtId: extId,
      selectedChannel: target?.channels[0] ?? '',
      resultText: '',
      invokeError: '',
    })
  }

  selectChannel(channel: string): void {
    this.patch({
      selectedChannel: channel,
      resultText: '',
      invokeError: '',
    })
  }

  setPayloadText(value: string): void {
    this.patch({ payloadText: value })
  }

  async invokeSelected(): Promise<void> {
    const { selectedExtId, selectedChannel, payloadText } = this.state
    if (!selectedExtId || !selectedChannel) return
    if (!this.canInvokeSelected) {
      this.patch({
        invokeError: 'Channel is not public on the target extension — invoke denied',
        resultText: '',
      })
      return
    }

    const parsed = parsePayload(payloadText)
    if (!parsed.ok) {
      this.patch({ invokeError: parsed.error, resultText: '' })
      return
    }

    this.patch({ invoking: true, invokeError: '', resultText: '' })
    try {
      const result = await ipcInvoke(selectedExtId, selectedChannel, parsed.value)
      this.patch({ resultText: JSON.stringify(result, null, 2) })
    } catch (err) {
      this.patch({
        invokeError: err instanceof Error ? err.message : 'Invoke failed',
      })
    } finally {
      this.patch({ invoking: false })
    }
  }

  private patch(partial: Partial<IpcExplorerState>): void {
    this.state = { ...this.state, ...partial }
    this.notify()
  }
}
