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

    Promise.all([
      core?.ipc?.invoke('kernel', 'listTools', {}),
      core?.ipc?.invoke('kernel', 'getTheme', {}),
    ])
      .then(([toolsRes, themeRes]) => {
        if (toolsRes?.success && Array.isArray(toolsRes.data)) {
          setExtensionCount(toolsRes.data.length)
        } else {
          setExtensionCount(0)
        }
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
      })
      .catch((e: unknown) => {
        console.error('Failed to load kernel data:', e)
        setExtensionCount(0)
      })

    const dynamicImport = new Function('url', 'return import(url)')
    dynamicImport(`nuxy-ext://${BOOTSTRAP_ID}/frontend.js`)
      .then((mod: { default: React.ComponentType<{ query?: string }> }) => {
        setShellComponent(() => mod.default)
        setLoadError(null)
      })
      .catch((err: Error) => {
        console.error('[Kernel] Failed to load shell extension:', err)
        setLoadError(err.message)
        setShellComponent(null)
      })

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
