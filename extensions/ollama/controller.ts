import type { ShellAction } from '@nuxyorg/core'
import { setToolSearchPlaceholder, BaseExtensionController } from '@nuxyorg/extension-sdk'
import type { ChatMessage, OllamaConfig } from './types.ts'
import { invoke } from './utils/ipc.ts'

const EXT_ID = 'com.nuxy.ollama'
const DEFAULT_HOST = 'http://localhost:11434'

export interface OllamaState {
  messages: ChatMessage[]
  models: string[]
  selectedModel: string
  loading: boolean
  error: string | null
  queuedMessage: string | null
  query: string
}

export class OllamaController extends BaseExtensionController<OllamaState> {
  private abortController: AbortController | null = null
  private queuedText: string | null = null
  private prevQuery = ''

  constructor(onUpdate: () => void) {
    super(
      EXT_ID,
      {
        messages: [],
        models: [],
        selectedModel: '',
        loading: false,
        error: null,
        queuedMessage: null,
        query: '',
      },
      onUpdate
    )
  }

  connect(): void {
    if (!window.core?.ipc) return
    this.syncSearchPlaceholder()
    this.bindKeyboard()

    Promise.all([
      invoke<OllamaConfig>('getConfig').catch(() => null),
      invoke<ChatMessage[]>('history:load').catch(() => [] as ChatMessage[]),
      invoke<string[]>('models').catch(() => [] as string[]),
    ]).then(([cfg, history, models]) => {
      const list = Array.isArray(models) ? models : []
      const savedModel = cfg?.model ?? ''
      const activeModel = savedModel && list.includes(savedModel) ? savedModel : (list[0] ?? '')
      this.store.setState({
        models: list,
        selectedModel: activeModel,
        messages: Array.isArray(history) && history.length > 0 ? history : this.state.messages,
      })
      window.core?.shell?.refreshShellActions()
    })
  }

  disconnect(): void {
    this.abortController?.abort()
    this.cleanups.forEach((fn) => fn())
    this.cleanups = []
    this.t.destroy()
    window.core?.shell?.registerShellActions(null)
  }

  syncSearchPlaceholder(): void {
    setToolSearchPlaceholder(this.t.t, 'empty.hint')
  }

  setQuery(query: string): void {
    if (query === this.prevQuery) return
    this.prevQuery = query
    this.store.setState({ query })
  }

  setSelectedModel(model: string): void {
    this.store.setState({ selectedModel: model })
    window.core?.shell?.refreshShellActions()
  }

  /**
   * Re-fetches the model list from Ollama (e.g. after pulling a new model
   * while the app is open) and falls back to the first available model if
   * the currently selected one no longer exists.
   */
  async refreshModels(): Promise<void> {
    const list = await invoke<string[]>('models').catch(() => [] as string[])
    const models = Array.isArray(list) ? list : []
    const selectedModel = models.includes(this.state.selectedModel)
      ? this.state.selectedModel
      : (models[0] ?? '')
    this.store.setState({ models, selectedModel })
    window.core?.shell?.refreshShellActions()
  }

  async handleSend(overrideText?: string): Promise<void> {
    const text = overrideText ?? this.state.query.trim()
    if (!text || this.state.loading) return

    if (!overrideText) {
      window.core?.shell?.controlOmniBar('clear')
    }

    const next: ChatMessage[] = [...this.state.messages, { role: 'user', content: text }]
    this.store.setState({ messages: next, error: null })
    await this.streamChat(next)
  }

  /**
   * Regenerates the assistant's reply for the most recent user turn — drops
   * the existing assistant message (if any) without duplicating the user
   * message, then re-streams from Ollama.
   */
  async handleRetry(): Promise<void> {
    if (this.state.loading) return
    const messages = this.state.messages
    if (messages.length === 0) return
    const last = messages[messages.length - 1]
    const base = last?.role === 'assistant' ? messages.slice(0, -1) : messages
    if (base.length === 0 || base[base.length - 1]?.role !== 'user') return
    this.store.setState({ messages: base, error: null })
    await this.streamChat(base)
  }

  /**
   * Copies the most recent message's text to the system clipboard via the
   * renderer's own clipboard access (extensions use `core.clipboard` only
   * from the backend Worker context).
   */
  handleCopyLastMessage(): void {
    const last = this.state.messages.at(-1)
    if (!last?.content) return
    navigator.clipboard.writeText(last.content).catch(() => {})
  }

  private async streamChat(next: ChatMessage[]): Promise<void> {
    const controller = new AbortController()
    this.abortController = controller
    this.store.setState({ loading: true })

    let assistantContent = ''

    try {
      if (this.state.selectedModel) {
        await invoke('configure', { model: this.state.selectedModel })
      }
      const cfg = await invoke<OllamaConfig>('getConfig')
      const host = cfg?.host ?? DEFAULT_HOST
      const model = cfg?.model ?? this.state.selectedModel

      this.store.setState({ messages: [...next, { role: 'assistant', content: '' }] })

      const response = await fetch(`${host}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: next, stream: true }),
        signal: controller.signal,
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(`Ollama HTTP ${response.status}: ${errText}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('Ollama response had no readable body')
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.trim()) continue
          try {
            const chunk = JSON.parse(line) as { message?: { content: string } }
            if (chunk.message?.content) {
              assistantContent += chunk.message.content
              const updated = [...this.state.messages]
              const last = updated[updated.length - 1]
              if (last?.role === 'assistant') {
                updated[updated.length - 1] = { ...last, content: assistantContent }
              }
              this.store.setState({ messages: updated })
            }
          } catch {
            // ignore malformed stream chunk
          }
        }
      }

      const finalMessages: ChatMessage[] = [
        ...next,
        { role: 'assistant', content: assistantContent },
      ]
      this.store.setState({ messages: finalMessages })
      invoke('history:save', { messages: finalMessages }).catch(() => {})
    } catch (err) {
      const e = err as Error
      if (e?.name === 'AbortError') {
        if (assistantContent) {
          const partial: ChatMessage[] = [...next, { role: 'assistant', content: assistantContent }]
          this.store.setState({ messages: partial })
          invoke('history:save', { messages: partial }).catch(() => {})
        } else {
          this.store.setState({ messages: next })
        }
      } else {
        const message = e?.message ?? String(err)
        if (/Ollama HTTP 404/.test(message)) {
          this.store.setState({
            error: this.t.t('error.modelNotFound', { model: this.state.selectedModel }),
          })
          void this.refreshModels()
        } else {
          this.store.setState({ error: message })
        }
        const messages = this.state.messages
        const last = messages[messages.length - 1]
        if (last?.role === 'assistant' && last.content === '') {
          this.store.setState({ messages: messages.slice(0, -1) })
        }
      }
    } finally {
      this.store.setState({ loading: false })
      this.abortController = null
    }
  }

  handleQueue(text: string): void {
    this.queuedText = text
    this.store.setState({ queuedMessage: text })
    window.core?.shell?.controlOmniBar('clear')
  }

  handleAbort(): void {
    this.abortController?.abort()
  }

  handleClearChat(): void {
    this.store.setState({ messages: [] })
    invoke('history:clear').catch(() => {})
  }

  getKeyActions(): ShellAction[] {
    return this.buildActions()
  }

  protected onStoreChange(): void {
    const { loading, queuedMessage } = this.state
    if (!loading && this.queuedText) {
      const text = this.queuedText
      this.queuedText = null
      this.store.setState({ queuedMessage: null })
      void this.handleSend(text)
    }
    window.core?.shell?.refreshShellActions()
    void queuedMessage
    super.onStoreChange()
  }

  private buildActions(): ShellAction[] {
    const { loading, query, models } = this.state
    const t = this.t.t

    const actions: ShellAction[] = [
      {
        id: 'ollama-send',
        key: 'Enter',
        label: loading && query.trim().length > 0 ? t('actions.queue') : t('actions.send'),
        hint: '↵',
        activeOn: () => this.state.query.trim().length > 0,
        handler: () => {
          const text = this.state.query.trim()
          if (!text) return
          if (this.state.loading) this.handleQueue(text)
          else void this.handleSend()
        },
      },
      {
        id: 'ollama-stop',
        key: 'Escape',
        label: t('actions.stop'),
        hint: 'Esc',
        activeOn: () => this.state.loading,
        handler: () => this.handleAbort(),
      },
      {
        id: 'ollama-clear-history',
        label: t('actions.clearHistory'),
        section: 'actions',
        showInMenu: true,
        handler: () => this.handleClearChat(),
      },
      {
        id: 'ollama-refresh-models',
        label: t('actions.refreshModels'),
        section: 'actions',
        showInMenu: true,
        handler: () => void this.refreshModels(),
      },
      {
        id: 'ollama-copy-last-message',
        key: 'c',
        modifiers: ['ctrl'],
        label: t('actions.copyLastMessage'),
        section: 'actions',
        showInMenu: true,
        activeOn: () => this.state.messages.length > 0,
        handler: () => this.handleCopyLastMessage(),
      },
      {
        id: 'ollama-retry',
        key: 'r',
        modifiers: ['ctrl'],
        label: t('actions.retry'),
        section: 'actions',
        showInMenu: true,
        activeOn: () => {
          if (this.state.loading) return false
          const last = this.state.messages.at(-1)
          const base =
            last?.role === 'assistant' ? this.state.messages.slice(0, -1) : this.state.messages
          return base.length > 0 && base[base.length - 1]?.role === 'user'
        },
        handler: () => void this.handleRetry(),
      },
    ]

    if (models.length > 0) {
      actions.push({
        id: 'ollama-models',
        label: t('actions.models'),
        section: 'actions',
        showInMenu: true,
        handler: () => {},
        children: models.map((m) => ({
          id: `ollama-select-model-${m}`,
          label: m,
          handler: () => this.setSelectedModel(m),
        })),
      })
    }

    return actions
  }

  private bindKeyboard(): void {
    window.core?.shell?.registerShellActions(() => this.buildActions())
    this.cleanups.push(() => {
      window.core?.shell?.registerShellActions(null)
    })
  }
}
