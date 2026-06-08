import './nuxy-gradient-layer.ts'

const GRADIENT_EXT_ID = 'com.nuxy.gradient'

let mountHandle: { setState: (state: Record<string, unknown>) => void; release: () => void } | null =
  null

const mountGradientLayer = async (): Promise<void> => {
  if (mountHandle) return
  if (!window.core?.composition?.mount) return

  const layer = document.createElement('nuxy-gradient-layer')
  try {
    mountHandle = await window.core.composition.mount('background-layer', layer, {
      extId: GRADIENT_EXT_ID,
      state: { active: false, mode: 'light' },
    })
  } catch (err) {
    console.warn('[gradient] composition mount failed:', err)
  }
}

const tryMount = () => {
  if (document.querySelector('nuxy-shell')) void mountGradientLayer()
}

/** Legacy bridge — React tools (e.g. ollama) still dispatch this window event. */
function applyLegacyGradientToggle(detail: unknown): void {
  if (!mountHandle) return
  if (detail === false || detail === null || detail === undefined) {
    mountHandle.setState({ active: false, mode: 'light' })
    return
  }
  if (detail === true) {
    mountHandle.setState({ active: true, mode: 'light' })
    return
  }
  if (typeof detail === 'object' && detail !== null) {
    const d = detail as { active?: boolean; mode?: string }
    mountHandle.setState({
      active: d.active !== false,
      mode: typeof d.mode === 'string' ? d.mode : 'light',
    })
  }
}

const onLegacyGradientToggle = (e: Event) => {
  void mountGradientLayer().then(() => {
    applyLegacyGradientToggle((e as CustomEvent).detail)
  })
}

window.addEventListener('nuxy-gradient-toggle', onLegacyGradientToggle)

window.core?.events?.on('composition-ready', tryMount)
tryMount()
