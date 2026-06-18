/** DOM font-application helpers for the renderer/settings UI. Frontend-only — not used by extension backends. */

export const DEFAULT_FONT_FAMILY_MAP: Record<string, string> = {
  system: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif`,
  monospace: 'monospace',
}

export function resolveFontFamily(
  font: string,
  fontFamilyMap: Record<string, string> = DEFAULT_FONT_FAMILY_MAP
): string {
  if (fontFamilyMap[font]) return fontFamilyMap[font]
  if (font.includes(',') || font.includes("'") || font.includes('"')) return font
  return `'${font}', sans-serif`
}

export function applyUiFontSettings(options: {
  font?: string
  fontWeight?: string | number
  fontFamilyMap?: Record<string, string>
}): void {
  const root = document.documentElement
  if (options.font) {
    const stack = resolveFontFamily(options.font, options.fontFamilyMap ?? DEFAULT_FONT_FAMILY_MAP)
    root.style.setProperty('--font-sans', stack)
    document.body.style.fontFamily = stack
  }
  if (options.fontWeight != null && options.fontWeight !== '') {
    document.body.style.fontWeight = String(options.fontWeight)
  }
}
