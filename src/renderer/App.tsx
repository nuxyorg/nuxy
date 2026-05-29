import React, { useEffect, useState } from 'react'
import type { ThemeDefinition, IpcResult } from '@nuxy/core'
import { EmptyState } from '@nuxy/ui'

const BOOTSTRAP_ID = 'com.nuxy.shell'
const EXTENSIONS_PATH = '~/.nuxy/extensions'

export default function App() {
  const [ShellComponent, setShellComponent] = useState<React.ComponentType<{
    query?: string
  }> | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [extensionCount, setExtensionCount] = useState<number | null>(null)

  useEffect(() => {
    const core = (
      window as Window & {
        core?: {
          ipc?: {
            invoke: (
              extId: string,
              channel: string,
              payload: unknown
            ) => Promise<IpcResult<unknown>>
          }
          window?: { onShow?: (cb: () => void) => (() => void) | undefined }
        }
      }
    ).core

    const dynamicImport = new Function('url', 'return import(url)')

    void (async () => {
      // 1. Fetch kernel data in parallel.
      const [toolsRes, themeRes, uikitRes] = await Promise.all([
        core?.ipc?.invoke('kernel', 'listTools', {}),
        core?.ipc?.invoke('kernel', 'getTheme', {}),
        core?.ipc?.invoke('kernel', 'listUikitExtensions', {}),
      ]).catch((e: unknown) => {
        console.error('Failed to load kernel data:', e)
        return [null, null, null]
      })

      // Apply extension count.
      if (toolsRes?.success && Array.isArray(toolsRes.data)) {
        setExtensionCount(toolsRes.data.length)
      } else {
        setExtensionCount(0)
      }

      // Apply theme tokens.
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

      // 2. Load uikit extensions in priority order.
      //    Each frontend.js is a side-effect module that extends window.UI.
      //    This MUST complete before the shell bootstrap so extensions see
      //    the updated window.UI when their own frontends load.
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

      // 3. Load the shell bootstrap — window.UI is now fully resolved.
      try {
        const mod = (await dynamicImport(`nuxy-ext://${BOOTSTRAP_ID}/frontend.js`)) as {
          default: React.ComponentType<{ query?: string }>
        }
        setShellComponent(() => mod.default)
        setLoadError(null)
      } catch (err) {
        const error = err as Error
        console.error('[Kernel] Failed to load shell extension:', error)
        setLoadError(error.message)
        setShellComponent(null)
      }
    })()

    const handleWindowShow = () => {
      window.dispatchEvent(new CustomEvent('nuxy-shell-reset'))
    }
    const cleanup = core?.window?.onShow?.(handleWindowShow)
    return () => {
      if (cleanup) cleanup()
    }
  }, [])

  if (loadError) {
    return (
      <EmptyState
        page
        title="No shell extension"
        message={
          <>
            Install <code>{BOOTSTRAP_ID}</code> under {EXTENSIONS_PATH}.
          </>
        }
        error={loadError}
      />
    )
  }

  if (extensionCount === 0 && !ShellComponent) {
    return (
      <EmptyState
        page
        title="No extensions loaded"
        message={
          <>
            Place extensions in <code>{EXTENSIONS_PATH}</code> to give Nuxy functionality.
          </>
        }
      />
    )
  }

  if (!ShellComponent) {
    return <EmptyState page message="Loading Nuxy…" />
  }

  return <ShellComponent />
}
