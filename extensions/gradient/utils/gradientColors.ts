export const GRADIENT_COLORS: Record<string, string> = {
  '--gradient-color-1': 'var(--gradient-1, #c3e4f5)',
  '--gradient-color-2': 'var(--gradient-2, #6ec3f4)',
  '--gradient-color-3': 'var(--gradient-3, #eae2ff)',
  '--gradient-color-4': 'var(--gradient-4, #b2c7f8)',
}

export function applyGradientColors(el: HTMLElement): void {
  for (const [k, v] of Object.entries(GRADIENT_COLORS)) {
    el.style.setProperty(k, v)
  }
}
