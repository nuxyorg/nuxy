const React = window.React
const { useEffect, useRef } = React

const EXT_ID = 'com.nuxy.gradient'
const CANVAS_ID = 'nuxy-gradient-canvas'

const COLORS = {
  '--gradient-color-1': '#c3e4f5',
  '--gradient-color-2': '#6ec3f4',
  '--gradient-color-3': '#eae2ff',
  '--gradient-color-4': '#b2c7f8',
}

export default function GradientView() {
  const gradientRef = useRef(null)

  useEffect(() => {
    const canvas = document.getElementById(CANVAS_ID)
    if (!canvas) return

    Object.entries(COLORS).forEach(([k, v]) => canvas.style.setProperty(k, v))

    const dynamicImport = new Function('url', 'return import(url)')
    dynamicImport(`nuxy-ext://${EXT_ID}/gradient.js`)
      .then(({ Gradient }) => {
        const g = new Gradient()
        g.height = window.innerHeight
        g.initGradient(`#${CANVAS_ID}`)
        gradientRef.current = g
      })
      .catch(console.error)

    return () => {
      gradientRef.current?.pause?.()
      gradientRef.current = null
    }
  }, [])

  return React.createElement('canvas', {
    id: CANVAS_ID,
    style: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      display: 'block',
      zIndex: 9999,
    },
  })
}
