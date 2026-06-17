export interface DevExtensionInfo {
  id: string
  name: string
  element: string
}

export interface DevIconPack {
  version: number
  name: string
  extId: string
  icons: string[]
  meta?: Record<string, { defaultOpacity?: number; defaultColor?: string }>
}

export interface DevTheme {
  colors?: Record<string, string>
  tokens?: Record<string, string>
}

export function applyThemeVariables(theme: DevTheme): void {
  const root = document.documentElement
  if (theme.colors) {
    for (const [key, val] of Object.entries(theme.colors)) {
      root.style.setProperty(`--${key}`, val)
    }
  }
  if (theme.tokens) {
    for (const [key, val] of Object.entries(theme.tokens)) {
      root.style.setProperty(`--${key}`, val)
    }
  }
}

export async function waitForShellTool(
  shellView: HTMLElement & {
    controller?: { tools: { tools: unknown[] }; openTool: (id: string) => void }
  },
  extId: string,
  timeoutMs = 5000
): Promise<void> {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const ctrl = shellView.controller
    if (ctrl?.tools.tools.some((t: { id?: string }) => t.id === extId)) {
      ctrl.openTool(extId)
      return
    }
    await new Promise((r) => setTimeout(r, 50))
  }
  console.warn(`[ext-devserver] Timed out waiting to open tool "${extId}"`)
}

export function toIconKebab(name: string): string {
  return name.replace(/([A-Z])/g, (c, l, i: number) => (i ? '-' : '') + l.toLowerCase())
}
