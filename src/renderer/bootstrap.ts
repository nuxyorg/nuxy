import type { ThemeDefinition, IpcResult } from '@nuxy/core'

const BOOTSTRAP_ID = 'com.nuxy.shell'
const EXTENSIONS_PATH = '~/.nuxy/extensions'

const dynamicImport = new Function('url', 'return import(url)') as (url: string) => Promise<unknown>

function showError(title: string, message: string, error?: string): void {
  const root = document.getElementById('root')
  if (!root) return
  root.replaceChildren()
  const empty = document.createElement('nuxy-empty-state')
  empty.setAttribute('page', '')
  empty.setAttribute('title', title)
  empty.setAttribute('message', message)
  if (error) empty.setAttribute('error', error)
  root.appendChild(empty)
}

function showLoading(message: string): void {
  const root = document.getElementById('root')
  if (!root) return
  root.replaceChildren()
  const empty = document.createElement('nuxy-empty-state')
  empty.setAttribute('page', '')
  empty.setAttribute('message', message)
  root.appendChild(empty)
}

export async function bootstrapNuxy(): Promise<void> {
  const core = window.core
  showLoading('Loading Nuxy…')

  try {
    const configRes = await core?.ipc?.invoke('kernel', 'getConfig', {}).catch(() => null)
    const config = configRes as
      | IpcResult<{ zoom?: string; font?: string; theme?: string; backgroundBehavior?: string }>
      | undefined
    const themeName = config?.success && config.data?.theme ? config.data.theme : 'dark'

    if (config?.success && config.data) {
      const { zoom, font } = config.data
      if (zoom) document.documentElement.style.zoom = zoom
      if (font) {
        const FONT_FAMILY_MAP: Record<string, string> = {
          system: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
          monospace: 'monospace',
        }
        document.body.style.fontFamily = FONT_FAMILY_MAP[font] || font
      }
    }

    const [toolsRes, themeRes, uikitRes] = await Promise.all([
      core?.ipc?.invoke('kernel', 'listTools', {}),
      core?.ipc?.invoke('kernel', 'getThemeByName', { name: themeName }),
      core?.ipc?.invoke('kernel', 'listUikitExtensions', {}),
    ]).catch((e: unknown) => {
      console.error('Failed to load kernel data:', e)
      return [null, null, null]
    })

    const extensionCount =
      toolsRes && (toolsRes as IpcResult<unknown[]>).success
        ? ((toolsRes as IpcResult<unknown[]>).data?.length ?? 0)
        : 0

    const theme = themeRes as IpcResult<ThemeDefinition> | undefined
    if (theme?.success && theme.data) {
      const root = document.documentElement
      const { colors, tokens } = theme.data
      if (colors) {
        Object.entries(colors).forEach(([key, val]) => {
          root.style.setProperty(`--${key}`, val as string)
        })
      }
      if (tokens) {
        Object.entries(tokens).forEach(([key, val]) => {
          root.style.setProperty(`--${key}`, val as string)
        })
      }
    }

    const uikitExts = uikitRes as IpcResult<Array<{ id: string }>> | undefined
    if (uikitExts?.success && Array.isArray(uikitExts.data)) {
      for (const ext of uikitExts.data) {
        try {
          await dynamicImport(`nuxy-ext://${ext.id}/frontend.js`)
        } catch (err) {
          console.warn(`[UIKit] Failed to load uikit extension "${ext.id}":`, err)
        }
      }
    }

    if (extensionCount === 0) {
      showError(
        'No extensions loaded',
        `Place extensions in ${EXTENSIONS_PATH} to give Nuxy functionality.`
      )
      return
    }

    try {
      await dynamicImport(`nuxy-ext://${BOOTSTRAP_ID}/frontend.js`)
      const root = document.getElementById('root')
      if (root) {
        root.replaceChildren()
        root.appendChild(document.createElement('nuxy-shell-view'))
      }
    } catch (err) {
      const error = err as Error
      console.error('[Kernel] Failed to load shell extension:', error)
      showError(
        'No shell extension',
        `Install ${BOOTSTRAP_ID} under ${EXTENSIONS_PATH}.`,
        error.message
      )
      return
    }
  } finally {
    requestAnimationFrame(() => {
      setTimeout(() => {
        window.core?.window?.ready()
      }, 50)
    })
  }

  const handleWindowShow = () => {
    void (async () => {
      const configRes = (await core?.ipc
        ?.invoke('kernel', 'getConfig', {})
        .catch(() => null)) as IpcResult<{ backgroundBehavior?: string }> | null
      const resume = configRes?.success && configRes.data?.backgroundBehavior === 'resume-session'
      if (resume) {
        window.dispatchEvent(new Event('focus'))
      } else {
        window.core?.events?.emit('shell-reset')
      }
    })()
  }
  core?.window?.onShow?.(handleWindowShow)
}

void bootstrapNuxy()
