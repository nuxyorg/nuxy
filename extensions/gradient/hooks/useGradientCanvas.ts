const React = window.React

import { applyGradientColors } from '../utils/gradientColors.ts'

const EXT_ID = 'com.nuxy.gradient'
const CANVAS_ID = 'nuxy-gradient-canvas'

interface GradientInstance {
  height: number
  initGradient: (selector: string) => GradientInstance
  pause?: () => void
  play?: () => void
  resize?: () => void
  disconnect?: () => void
}

export function useGradientCanvas(): void {
  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-gradient-toggle', { detail: true }))

    const canvas = document.getElementById(CANVAS_ID)
    if (!canvas) return

    applyGradientColors(canvas as HTMLElement)

    const dynamicImport = new Function('url', 'return import(url)') as (
      url: string
    ) => Promise<{ Gradient: new () => GradientInstance }>

    let toolGInstance: GradientInstance | null = null
    dynamicImport(`nuxy-ext://${EXT_ID}/gradient.ts`)
      .then(({ Gradient }) => {
        const g = new Gradient()
        g.height = window.innerHeight
        g.initGradient(`#${CANVAS_ID}`)
        toolGInstance = g
      })
      .catch(() => {})

    return () => {
      window.dispatchEvent(new CustomEvent('nuxy-gradient-toggle', { detail: false }))
      toolGInstance?.pause?.()
    }
  }, [])
}
