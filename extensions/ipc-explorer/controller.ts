import type { ShellAction } from '@nuxyorg/core'
import { pairedKeyAction } from '../ui-default/src/hooks/paired-key-action.ts'
import {
  buildIpcTargets,
  kernelTarget,
  selectedTarget,
  canInvokeChannel,
  flatChannels,
  EXPLORER_EXT_ID,
  type IpcTarget,
} from './utils/parse-targets.ts'
import { payloadSampleForChannel } from './utils/payload-sample.ts'

export type IpcExplorerFocusArea = 'targets' | 'channels' | 'payload'
export type IpcExplorerPayloadView = 'request' | 'response'

export interface IpcExplorerState {
  ready: boolean
  loading: boolean
  loadError: string
  targets: IpcTarget[]
  selectedExtId: string
  selectedChannel: string
  channelIndex: number
  focusArea: IpcExplorerFocusArea
  payloadText: string
  payloadView: IpcExplorerPayloadView
  invoking: boolean
  resultText: string
  invokeError: string
}

function initialState(): IpcExplorerState {
  const kernel = kernelTarget()
  const channels = flatChannels(kernel)
  const firstChannel = channels[0]?.channel ?? ''

  return {
    ready: false,
    loading: true,
    loadError: '',
    targets: [kernel],
    selectedExtId: kernel.extId,
    selectedChannel: firstChannel,
    channelIndex: channels.length > 0 ? 0 : -1,
    focusArea: 'channels',
    payloadText: payloadSampleForChannel(kernel, firstChannel),
    payloadView: 'request',
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
    this.bindKeyActions()
    void this.refreshTargets()
  }

  disconnect(): void {
    window.core?.shell?.registerShellActions(null)
  }

  get selectedTarget(): IpcTarget | undefined {
    return selectedTarget(this.state.targets, this.state.selectedExtId)
  }

  get targetIndex(): number {
    const idx = this.state.targets.findIndex((target) => target.extId === this.state.selectedExtId)
    return idx >= 0 ? idx : 0
  }

  get flatChannelsForTarget(): ReturnType<typeof flatChannels> {
    return flatChannels(this.selectedTarget)
  }

  get canInvokeSelected(): boolean {
    return canInvokeChannel(this.selectedTarget, this.state.selectedChannel)
  }

  getKeyActions(): ShellAction[] {
    return this.buildKeyActions()
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
        selectedChannel = flatChannels(kernelTarget())[0]?.channel ?? ''
      } else {
        const target = selectedTarget(targets, selectedExtId)
        if (target && !target.channels.includes(selectedChannel)) {
          selectedChannel = flatChannels(target)[0]?.channel ?? ''
        }
      }

      const channelIndex = this.resolveChannelIndex(
        selectedTarget(targets, selectedExtId),
        selectedChannel
      )
      const target = selectedTarget(targets, selectedExtId)

      this.patch({
        targets,
        loadError,
        selectedExtId,
        selectedChannel,
        channelIndex,
        payloadText: payloadSampleForChannel(target, selectedChannel),
        ready: true,
      })
    } catch (err) {
      this.patch({
        targets: [kernelTarget()],
        loadError: err instanceof Error ? err.message : 'Failed to load targets',
        selectedExtId: 'kernel',
        selectedChannel: flatChannels(kernelTarget())[0]?.channel ?? '',
        channelIndex: 0,
        ready: true,
      })
    } finally {
      this.patch({ loading: false })
    }
  }

  selectTargetIndex(index: number, focusArea: IpcExplorerFocusArea = 'channels'): void {
    const target = this.state.targets[index]
    if (!target) return
    const channels = flatChannels(target)
    const firstChannel = channels[0]?.channel ?? ''
    this.patch({
      selectedExtId: target.extId,
      selectedChannel: firstChannel,
      channelIndex: channels.length > 0 ? 0 : -1,
      focusArea,
      payloadText: payloadSampleForChannel(target, firstChannel),
      resultText: '',
      payloadView: 'request',
      invokeError: '',
    })
  }

  selectExtension(extId: string): void {
    const index = this.state.targets.findIndex((target) => target.extId === extId)
    if (index >= 0) this.selectTargetIndex(index, 'channels')
  }

  selectChannelIndex(index: number, focusArea: IpcExplorerFocusArea = 'channels'): void {
    const entry = this.flatChannelsForTarget[index]
    if (!entry) return
    this.patch({
      channelIndex: index,
      selectedChannel: entry.channel,
      focusArea,
      payloadText: payloadSampleForChannel(this.selectedTarget, entry.channel),
      resultText: '',
      payloadView: 'request',
      invokeError: '',
    })
  }

  moveTarget(delta: -1 | 1): void {
    const { targets } = this.state
    if (targets.length === 0) return
    const next = Math.max(0, Math.min(this.targetIndex + delta, targets.length - 1))
    if (next !== this.targetIndex) this.selectTargetIndex(next, 'targets')
  }

  moveChannel(delta: -1 | 1): void {
    const channels = this.flatChannelsForTarget
    if (channels.length === 0) return

    const current = this.state.channelIndex
    const next =
      current < 0
        ? delta > 0
          ? 0
          : channels.length - 1
        : Math.max(0, Math.min(current + delta, channels.length - 1))

    this.selectChannelIndex(next, 'channels')
  }

  focusTargets(): void {
    this.patch({ focusArea: 'targets' })
  }

  focusChannels(): void {
    const channels = this.flatChannelsForTarget
    this.patch({
      focusArea: 'channels',
      channelIndex:
        this.state.channelIndex >= 0 ? this.state.channelIndex : channels.length > 0 ? 0 : -1,
    })
  }

  focusPayload(): void {
    this.patch({ focusArea: 'payload' })
  }

  setPayloadText(value: string): void {
    if (this.state.payloadView !== 'request') return
    this.patch({ payloadText: value })
  }

  dismissResponseView(): void {
    if (this.state.payloadView !== 'response') return
    this.patch({ payloadView: 'request', resultText: '', invokeError: '' })
  }

  leavePayloadPanel(): void {
    if (this.state.payloadView === 'response') {
      this.dismissResponseView()
      return
    }
    this.focusChannels()
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
      this.patch({
        resultText: JSON.stringify(result, null, 2),
        payloadView: 'response',
        focusArea: 'payload',
      })
    } catch (err) {
      this.patch({
        invokeError: err instanceof Error ? err.message : 'Invoke failed',
      })
    } finally {
      this.patch({ invoking: false })
    }
  }

  private bindKeyActions(): void {
    window.core?.shell?.registerShellActions(() => this.buildKeyActions())
  }

  private buildKeyActions(): ShellAction[] {
    const { focusArea } = this.state
    const shared = this.sharedActions()

    switch (focusArea) {
      case 'targets':
        return [...this.buildTargetsPanelActions(), ...shared]
      case 'payload':
        return [...this.buildPayloadPanelActions(), ...shared]
      default:
        return [...this.buildChannelsPanelActions(), ...shared]
    }
  }

  private buildTargetsPanelActions(): ShellAction[] {
    const { targets } = this.state
    return [
      pairedKeyAction({
        id: 'ipc-explorer-navigate-targets',
        label: 'Navigate targets',
        allowRepeat: true,
        activeOn: () => targets.length > 0,
        negative: () => this.moveTarget(-1),
        positive: () => this.moveTarget(1),
      }),
      {
        key: 'ArrowRight',
        label: 'Focus channels',
        handler: () => this.focusChannels(),
      },
      {
        key: 'Enter',
        label: 'Focus channels',
        hint: '↵',
        handler: () => this.focusChannels(),
      },
    ]
  }

  private buildChannelsPanelActions(): ShellAction[] {
    const channels = this.flatChannelsForTarget
    return [
      {
        key: 'ArrowLeft',
        label: 'Focus targets',
        handler: () => this.focusTargets(),
      },
      pairedKeyAction({
        id: 'ipc-explorer-navigate-channels',
        label: 'Navigate channels',
        allowRepeat: true,
        activeOn: () => channels.length > 0,
        negative: () => this.moveChannel(-1),
        positive: () => this.moveChannel(1),
      }),
      {
        key: 'ArrowRight',
        label: 'Focus payload',
        handler: () => this.focusPayload(),
      },
      {
        id: 'ipc-explorer-invoke',
        key: 'Enter',
        label: 'Invoke',
        hint: '↵',
        section: 'actions',
        showInMenu: true,
        activeOn: () => this.canInvokeSelected && !this.state.invoking,
        handler: () => void this.invokeSelected(),
      },
    ]
  }

  private buildPayloadPanelActions(): ShellAction[] {
    return [
      {
        key: 'ArrowLeft',
        label: 'Focus channels',
        handler: () => this.leavePayloadPanel(),
      },
      {
        key: 'Escape',
        label: this.state.payloadView === 'response' ? 'Back to request' : 'Focus channels',
        handler: () => this.leavePayloadPanel(),
      },
      {
        id: 'ipc-explorer-invoke',
        key: 'Enter',
        modifiers: ['ctrl'],
        label: 'Invoke',
        hint: '⌃↵',
        section: 'actions',
        showInMenu: true,
        activeOn: () => this.canInvokeSelected && !this.state.invoking,
        handler: () => void this.invokeSelected(),
      },
    ]
  }

  private sharedActions(): ShellAction[] {
    return [
      {
        id: 'ipc-explorer-refresh',
        key: 'r',
        modifiers: ['ctrl'],
        label: 'Refresh targets',
        hint: '⌃R',
        section: 'actions',
        showInMenu: true,
        activeOn: () => !this.state.loading,
        handler: () => void this.refreshTargets(),
      },
    ]
  }

  private resolveChannelIndex(target: IpcTarget | undefined, channel: string): number {
    const channels = flatChannels(target)
    const idx = channels.findIndex((entry) => entry.channel === channel)
    return idx >= 0 ? idx : channels.length > 0 ? 0 : -1
  }

  private patch(partial: Partial<IpcExplorerState>): void {
    this.state = { ...this.state, ...partial }
    this.notify()
    window.core?.shell?.refreshShellActions()
  }
}
