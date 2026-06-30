import type { ThemeDefinition, IpcResult } from '@nuxyorg/core'
import { logCaughtError } from '@nuxyorg/core'
import { applyUiFontSettings } from '@nuxyorg/extension-sdk'

const BOOTSTRAP_ID = 'com.nuxy.shell'
const EXTENSIONS_PATH = '~/.nxy/extensions'

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

async function bootstrapNuxy(): Promise<void> {
  const core = window.core
  showLoading('Loading Nuxy…')

  try {
    const configRes = await core?.ipc?.invoke('kernel', 'getConfig', {}).catch((err) => {
      logCaughtError(BOOTSTRAP_ID, err, 'getConfig')
      return null
    })
    const config = configRes as
      | IpcResult<{
          zoom?: string
          font?: string
          fontWeight?: string
          theme?: string
          backgroundBehavior?: string
        }>
      | undefined
    const configTheme = config?.success && config.data?.theme ? config.data.theme : null
    let themeName: string
    if (configTheme) {
      themeName = configTheme
    } else {
      const defaultRes = await core?.ipc
        ?.invoke('kernel', 'getDefaultThemeName', {})
        .catch((err) => {
          logCaughtError(BOOTSTRAP_ID, err, 'getDefaultThemeName')
          return null
        })
      const defaultTheme = defaultRes as { success: boolean; data?: string } | null
      themeName = defaultTheme?.success && defaultTheme.data ? defaultTheme.data : 'dark'
    }

    if (config?.success && config.data) {
      const { zoom, font, fontWeight } = config.data
      if (zoom) document.documentElement.style.zoom = zoom
      applyUiFontSettings({ font, fontWeight })
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
      const configRes = (await core?.ipc?.invoke('kernel', 'getConfig', {}).catch((err) => {
        logCaughtError(BOOTSTRAP_ID, err, 'getConfig')
        return null
      })) as IpcResult<{ backgroundBehavior?: string }> | null
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
