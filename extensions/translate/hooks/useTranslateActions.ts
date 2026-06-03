const React = window.React

import type { TranslateResult, SupportedLanguage } from '../types.ts'
import { TARGET_LANGUAGES } from './useTranslateData.ts'

interface Params {
  query: string
  targetLang: SupportedLanguage
  result: TranslateResult | null
  setResult: React.Dispatch<React.SetStateAction<TranslateResult | null>>
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  setError: React.Dispatch<React.SetStateAction<string | null>>
  setTargetLang: React.Dispatch<React.SetStateAction<SupportedLanguage>>
  invoke: <T = unknown>(channel: string, payload?: unknown) => Promise<T>
  t: (key: string, vars?: Record<string, string>) => string
}

export interface TranslateActions {
  handleTranslate: () => Promise<void>
  handleCopy: () => Promise<void>
  handleCycleTarget: () => void
  copied: boolean
}

export function useTranslateActions({
  query,
  targetLang,
  result,
  setResult,
  setLoading,
  setError,
  setTargetLang,
  invoke,
  t,
}: Params): TranslateActions {
  const [copied, setCopied] = React.useState<boolean>(false)
  const copiedTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  async function handleTranslate(): Promise<void> {
    const text = query.trim()
    if (!text) return

    setLoading(true)
    setError(null)
    setResult(null)

    try {
      const res = await invoke<TranslateResult>('translate', { text, to: targetLang })
      setResult(res)
    } catch (err) {
      const msg = (err as Error).message ?? t('error.failed', { message: String(err) })
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy(): Promise<void> {
    if (!result?.translatedText) return

    try {
      await invoke('translate:copy', { text: result.translatedText })
    } catch {
      // Silently fail — clipboard may be unavailable
    }

    setCopied(true)
    if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    copiedTimerRef.current = setTimeout(() => setCopied(false), 1500)
  }

  function handleCycleTarget(): void {
    const currentIdx = TARGET_LANGUAGES.indexOf(targetLang)
    const nextIdx = (currentIdx + 1) % TARGET_LANGUAGES.length
    setTargetLang(TARGET_LANGUAGES[nextIdx])
    // Re-translate with new target if we already have a query
    setResult(null)
  }

  // Cleanup timer on unmount
  React.useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current)
    }
  }, [])

  return { handleTranslate, handleCopy, handleCycleTarget, copied }
}
