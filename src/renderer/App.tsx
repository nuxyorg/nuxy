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
    const core = window.core

    const dynamicImport = new Function('url', 'return import(url)')

    void (async () => {
      console.log(`[FLASH-DEBUG] App.tsx async init start at ${Date.now()}`)
      try {
        // 1. Fetch config first to know the custom theme name, zoom, and font
        const configRes = await core?.ipc?.invoke('kernel', 'getConfig', {}).catch(() => null)
        const config = configRes as IpcResult<{ zoom?: string; font?: string; theme?: string }> | undefined
        const themeName = config?.success && config.data?.theme ? config.data.theme : 'dark'

        // Apply zoom & font immediately on startup
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

        // 2. Fetch other kernel data in parallel
        const [toolsRes, themeRes, uikitRes] = await Promise.all([
          core?.ipc?.invoke('kernel', 'listTools', {}),
          core?.ipc?.invoke('kernel', 'getThemeByName', { name: themeName }),
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
        console.log(`[FLASH-DEBUG] loading shell at ${Date.now()}`)
        try {
          const mod = (await dynamicImport(`nuxy-ext://${BOOTSTRAP_ID}/frontend.js`)) as {
            default: React.ComponentType<{ query?: string }>
          }
          console.log(`[FLASH-DEBUG] shell loaded, setShellComponent at ${Date.now()}`)
          setShellComponent(() => mod.default)
          setLoadError(null)
        } catch (err) {
          const error = err as Error
          console.error('[Kernel] Failed to load shell extension:', error)
          setLoadError(error.message)
          setShellComponent(null)
        }
      } finally {
        requestAnimationFrame(() => {
          setTimeout(() => {
            console.log(`[FLASH-DEBUG] sending window:ready at ${Date.now()}`)
            window.core?.window?.ready()
          }, 50)
        })
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
