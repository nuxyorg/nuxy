import type { ShellKeyAction } from '@nuxyorg/core'
import { setToolSearchPlaceholder, BaseExtensionController } from '@nuxyorg/extension-sdk'
import { createInvoker } from './utils/ipc.ts'
import {
  generateTransferCode,
  peerIdToDisplayCode,
  transferCodeToPeerId,
} from './utils/transfer-code.ts'
import { PeerServerClient } from './utils/peer-server-client.ts'
import { WebRtcFileSession } from './utils/webrtc-session.ts'
import type {
  FileMeta,
  TransferMode,
  TransferPhase,
  TransferProgress,
  TransferSettings,
} from './types.ts'

const EXT_ID = 'com.nuxy.file-transfer'

export interface FileTransferState {
  mode: TransferMode
  phase: TransferPhase
  menuIndex: number
  transferCode: string
  selectedFile: FileMeta | null
  file: File | null
  progress: TransferProgress
  error: string | null
  savedPath: string | null
  query: string
  settings: TransferSettings | null
}

export class FileTransferController extends BaseExtensionController<FileTransferState> {
  private invoke = createInvoker()
  private signaling: PeerServerClient | null = null
  private session: WebRtcFileSession | null = null
  private receiveSessionId: string | null = null
  private localPeerId = ''
  private fileInputEl: HTMLInputElement | null = null

  constructor(onUpdate: () => void) {
    super(
      EXT_ID,
      {
        mode: 'menu',
        phase: 'idle',
        menuIndex: 0,
        transferCode: '',
        selectedFile: null,
        file: null,
        progress: {
          bytesTransferred: 0,
          totalBytes: 0,
          speedBps: 0,
          etaSeconds: null,
        },
        error: null,
        savedPath: null,
        query: '',
        settings: null,
      },
      onUpdate
    )
  }

  connect(): void {
    if (!window.core?.ipc) return
    this.syncSearchPlaceholder()
    void this.invoke('getSettings')
      .then((settings) => {
        this.store.setState({ settings })
      })
      .catch(() => {
        this.store.setState({
          settings: {
            downloadDir: '~/Downloads',
            maxFileSizeMb: 512,
            signalingHost: '0.peerjs.com',
            signalingPort: 443,
            stunServer: 'stun:stun.l.google.com:19302',
          },
        })
      })
    this.bindKeyboard()
  }

  disconnect(): void {
    void this.cleanupSession()
    this.fileInputEl?.remove()
    this.fileInputEl = null
    this.cleanups.forEach((fn) => fn())
    this.cleanups = []
    this.t.destroy()
    window.core?.shell?.registerKeyActions(null)
  }

  syncSearchPlaceholder(): void {
    const { mode, phase } = this.state
    let key = 'menu.placeholder'
    if (mode === 'receive' && phase === 'idle') key = 'receive.placeholder'
    else if (mode === 'send' && phase === 'idle') key = 'send.placeholder'
    setToolSearchPlaceholder(this.t.t, key)
  }

  setQuery(query: string): void {
    const next = query ?? ''
    if (this.state.query === next) return
    this.store.setState({ query: next })
    window.core?.shell?.refreshKeyHints()
  }

  setMenuIndex(index: number): void {
    this.store.setState({ menuIndex: Math.max(0, Math.min(1, index)) })
    window.core?.shell?.refreshKeyHints()
  }

  async selectMode(mode: 'send' | 'receive'): Promise<void> {
    await this.cleanupSession()
    this.store.setState({
      mode,
      phase: 'idle',
      error: null,
      savedPath: null,
      transferCode: '',
      selectedFile: null,
      file: null,
      progress: {
        bytesTransferred: 0,
        totalBytes: 0,
        speedBps: 0,
        etaSeconds: null,
      },
    })
    this.syncSearchPlaceholder()
    window.core?.shell?.refreshKeyHints()
  }

  async backToMenu(): Promise<void> {
    await this.cleanupSession()
    this.store.setState({
      mode: 'menu',
      phase: 'idle',
      menuIndex: 0,
      error: null,
      savedPath: null,
      transferCode: '',
      selectedFile: null,
      file: null,
      query: '',
      progress: {
        bytesTransferred: 0,
        totalBytes: 0,
        speedBps: 0,
        etaSeconds: null,
      },
    })
    this.syncSearchPlaceholder()
    window.core?.shell?.controlOmniBar?.('clear')
    window.core?.shell?.refreshKeyHints()
  }

  handleFileSelected(files: File[]): void {
    const file = files[0]
    if (!file || this.state.mode !== 'send' || this.state.phase !== 'idle') return
    this.store.setState({
      selectedFile: {
        name: file.name,
        size: file.size,
        lastModified: file.lastModified,
      },
      file,
    })
    window.core?.shell?.refreshKeyHints()
  }

  pickFile(): void {
    if (this.state.mode !== 'send' || this.state.phase !== 'idle') return
    if (!this.fileInputEl) {
      const input = document.createElement('input')
      input.type = 'file'
      input.style.display = 'none'
      input.addEventListener('change', () => {
        const file = input.files?.[0]
        if (file) this.handleFileSelected([file])
        input.value = ''
      })
      this.fileInputEl = input
    }
    if (!this.fileInputEl.isConnected) {
      document.body.appendChild(this.fileInputEl)
    }
    this.fileInputEl.click()
  }

  async startSend(): Promise<void> {
    const { file, settings } = this.state
    if (!settings) {
      this.store.setState({
        phase: 'error',
        error: this.t.t('send.error.settings'),
      })
      return
    }
    if (!file) {
      this.pickFile()
      return
    }

    const maxBytes = settings.maxFileSizeMb * 1024 * 1024
    if (file.size > maxBytes) {
      this.store.setState({
        phase: 'error',
        error: this.t.t('send.error.tooLarge', { max: settings.maxFileSizeMb }),
      })
      return
    }

    const displayCode = generateTransferCode()
    const peerId = transferCodeToPeerId(displayCode)
    if (!peerId) return

    this.store.setState({
      phase: 'waiting',
      transferCode: displayCode,
      error: null,
      progress: {
        bytesTransferred: 0,
        totalBytes: file.size,
        speedBps: 0,
        etaSeconds: null,
      },
    })

    try {
      this.localPeerId = peerId
      this.signaling = new PeerServerClient(peerId, {
        host: settings.signalingHost,
        port: settings.signalingPort,
        key: 'peerjs',
        secure: settings.signalingPort === 443,
      })
      await this.signaling.connect()

      this.session = new WebRtcFileSession({
        peerId,
        role: 'sender',
        signaling: this.signaling,
        stunServer: settings.stunServer,
        file,
        onProgress: (progress) => this.store.setState({ phase: 'transferring', progress }),
        onDone: () => {
          this.store.setState({ phase: 'done' })
          void this.cleanupSession()
        },
        onError: (err) => this.handleError(err.message),
      })
      await this.session.start()
    } catch (err) {
      await this.cleanupSession()
      this.handleError(err instanceof Error ? err.message : 'send.error.connection')
    }
  }

  async startReceive(codeInput: string): Promise<void> {
    const { settings } = this.state
    if (!settings) return

    const peerId = transferCodeToPeerId(codeInput)
    if (!peerId) {
      this.store.setState({
        phase: 'error',
        error: this.t.t('receive.error.invalidCode'),
      })
      return
    }

    const displayCode = peerIdToDisplayCode(peerId)
    this.store.setState({
      phase: 'connecting',
      transferCode: displayCode,
      error: null,
    })

    try {
      this.localPeerId = `ft-${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`
      this.signaling = new PeerServerClient(this.localPeerId, {
        host: settings.signalingHost,
        port: settings.signalingPort,
        key: 'peerjs',
        secure: settings.signalingPort === 443,
      })
      await this.signaling.connect()

      this.session = new WebRtcFileSession({
        peerId: this.localPeerId,
        remotePeerId: peerId,
        role: 'receiver',
        signaling: this.signaling,
        stunServer: settings.stunServer,
        onProgress: (progress) => this.store.setState({ progress }),
        onMeta: (meta) => void this.prepareReceive(meta.name, meta.size),
        onChunk: (chunk) => this.writeChunk(chunk),
        onDone: () => void this.finishReceive(),
        onError: (err) => this.handleError(err.message),
      })

      await this.session.start()
      this.store.setState({ phase: 'connecting' })
    } catch (err) {
      await this.cleanupSession()
      this.handleError(err instanceof Error ? err.message : 'receive.error.connection')
    }
  }

  async copyCode(): Promise<void> {
    const { transferCode } = this.state
    if (!transferCode) return
    await this.invoke('copyCode', { code: transferCode })
  }

  private async prepareReceive(fileName: string, totalSize: number): Promise<void> {
    try {
      const result = await this.invoke('initReceive', { fileName, totalSize })
      this.receiveSessionId = result.sessionId
      this.store.setState({
        phase: 'transferring',
        progress: {
          bytesTransferred: 0,
          totalBytes: totalSize,
          speedBps: 0,
          etaSeconds: null,
        },
      })
    } catch (err) {
      this.handleError(err instanceof Error ? err.message : 'receive.error.save')
    }
  }

  private async writeChunk(chunk: ArrayBuffer): Promise<void> {
    if (!this.receiveSessionId) return
    const bytes = new Uint8Array(chunk)
    let binary = ''
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]!)
    const chunkBase64 = btoa(binary)
    await this.invoke('writeChunk', {
      sessionId: this.receiveSessionId,
      chunkBase64,
    })
  }

  private async finishReceive(): Promise<void> {
    if (!this.receiveSessionId) return
    try {
      const result = await this.invoke('finishReceive', {
        sessionId: this.receiveSessionId,
      })
      this.receiveSessionId = null
      this.store.setState({
        phase: 'done',
        savedPath: result.filePath,
      })
      await this.cleanupSession()
    } catch (err) {
      this.handleError(err instanceof Error ? err.message : 'receive.error.save')
    }
  }

  private handleError(message: string): void {
    const translated =
      message.startsWith('send.') ||
      message.startsWith('receive.') ||
      message.startsWith('signaling.') ||
      message.startsWith('webrtc.')
        ? this.t.t(message)
        : message
    this.store.setState({ phase: 'error', error: translated })
    void this.cleanupSession()
  }

  private async cleanupSession(): Promise<void> {
    this.session?.close()
    this.session = null
    this.signaling?.close()
    this.signaling = null

    if (this.receiveSessionId) {
      try {
        await this.invoke('abortReceive', { sessionId: this.receiveSessionId })
      } catch {
        /* ignore */
      }
      this.receiveSessionId = null
    }
  }

  bindKeyboard(): void {
    const register = () => window.core?.shell?.registerKeyActions(() => this.getKeyActions())
    register()
    this.cleanups.push(() => window.core?.shell?.registerKeyActions(null))
  }

  getKeyActions(): ShellKeyAction[] {
    const s = this.state
    const t = this.t.t

    if (s.mode === 'menu') {
      return [
        {
          key: 'ArrowUp',
          label: t('keys.navigate'),
          hint: '↑↓',
          handler: () => this.setMenuIndex(s.menuIndex - 1),
        },
        {
          key: 'ArrowDown',
          label: '',
          handler: () => this.setMenuIndex(s.menuIndex + 1),
        },
        {
          key: 'Enter',
          label: t('keys.select'),
          hint: '↵',
          handler: () => void this.selectMode(s.menuIndex === 0 ? 'send' : 'receive'),
        },
      ]
    }

    if (s.phase === 'error' || s.phase === 'done') {
      return [
        {
          key: 'Escape',
          label: t('keys.back'),
          hint: 'Esc',
          handler: () => void this.backToMenu(),
        },
      ]
    }

    if (s.mode === 'send') {
      const actions: ShellKeyAction[] = [
        {
          key: 'Escape',
          label: t('keys.back'),
          hint: 'Esc',
          activeOn: () => s.phase === 'idle' || s.phase === 'waiting',
          handler: () => void this.backToMenu(),
        },
      ]

      if (s.phase === 'idle') {
        actions.push({
          key: 'Enter',
          label: s.selectedFile ? t('keys.startSend') : t('keys.pickFile'),
          hint: '↵',
          handler: () => void this.startSend(),
        })
        actions.push({
          key: 'o',
          label: t('keys.pickFile'),
          hint: 'O',
          handler: () => this.pickFile(),
        })
      }

      if (s.transferCode && (s.phase === 'waiting' || s.phase === 'transferring')) {
        actions.push({
          key: 'c',
          label: t('keys.copyCode'),
          hint: 'C',
          handler: () => void this.copyCode(),
        })
      }

      return actions
    }

    if (s.mode === 'receive') {
      const actions: ShellKeyAction[] = [
        {
          key: 'Escape',
          label: t('keys.back'),
          hint: 'Esc',
          activeOn: () => s.phase === 'idle',
          handler: () => void this.backToMenu(),
        },
      ]

      if (s.phase === 'idle' && s.query.trim()) {
        actions.push({
          key: 'Enter',
          label: t('keys.connect'),
          hint: '↵',
          handler: () => void this.startReceive(s.query.trim()),
        })
      }

      return actions
    }

    return []
  }
}
