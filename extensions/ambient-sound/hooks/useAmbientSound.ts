const React = window.React

import type { SoundSettings } from '../types.ts'

const EXT_ID = 'com.nuxy.ambient-sound'

export function useAmbientSound(): void {
  const audioCtxRef = React.useRef<AudioContext | null>(null)
  const settingsRef = React.useRef<SoundSettings>({ enabled: true, volume: 0.2, style: 'click' })

  React.useEffect(() => {
    function getAudioCtx(): AudioContext {
      if (!audioCtxRef.current) audioCtxRef.current = new AudioContext()
      return audioCtxRef.current
    }

    function playSound(): void {
      if (!settingsRef.current.enabled) return
      const ctx = getAudioCtx()
      const { volume, style } = settingsRef.current

      if (style === 'click' || style === 'typewriter') {
        const bufferSize = ctx.sampleRate * (style === 'click' ? 0.02 : 0.01)
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
        const data = buffer.getChannelData(0)
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * (style === 'typewriter' ? 0.8 : 0.5)
        }
        const source = ctx.createBufferSource()
        source.buffer = buffer
        const gain = ctx.createGain()
        gain.gain.setValueAtTime(volume, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(
          0.0001,
          ctx.currentTime + (style === 'click' ? 0.02 : 0.01)
        )
        source.connect(gain)
        gain.connect(ctx.destination)
        source.start()
      } else {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        osc.type = 'sine'
        osc.frequency.setValueAtTime(600, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.04)
        gain.gain.setValueAtTime(volume * 0.3, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.04)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start()
        osc.stop(ctx.currentTime + 0.04)
      }
    }

    function loadSettings(): void {
      ;(window as any).core?.ipc
        ?.invoke(EXT_ID, 'getSettings', {})
        .then((res: any) => {
          if (res?.success && res?.data) settingsRef.current = res.data
        })
        .catch(() => {})
    }

    loadSettings()

    const onSettingsUpdated = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.extId === EXT_ID) loadSettings()
    }

    const onKeydown = () => {
      playSound()
    }

    window.addEventListener('nuxy-settings-updated', onSettingsUpdated)
    window.addEventListener('keydown', onKeydown)

    return () => {
      window.removeEventListener('nuxy-settings-updated', onSettingsUpdated)
      window.removeEventListener('keydown', onKeydown)
      if (audioCtxRef.current) {
        audioCtxRef.current.close()
        audioCtxRef.current = null
      }
    }
  }, [])
}
