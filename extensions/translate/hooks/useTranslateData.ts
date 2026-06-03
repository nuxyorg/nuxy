const React = window.React

import type { TranslateResult, SupportedLanguage } from '../types.ts'

const EXT_ID = 'com.nuxy.translate'

export const TARGET_LANGUAGES: SupportedLanguage[] = ['en', 'tr', 'de', 'fr', 'es', 'ja', 'zh']

export interface TranslateData {
  result: TranslateResult | null
  setResult: React.Dispatch<React.SetStateAction<TranslateResult | null>>
  loading: boolean
  setLoading: React.Dispatch<React.SetStateAction<boolean>>
  error: string | null
  setError: React.Dispatch<React.SetStateAction<string | null>>
  targetLang: SupportedLanguage
  setTargetLang: React.Dispatch<React.SetStateAction<SupportedLanguage>>
  targetLanguages: SupportedLanguage[]
  invoke: <T = unknown>(channel: string, payload?: unknown) => Promise<T>
}

function makeInvoker<T = unknown>(channel: string, payload?: unknown): Promise<T> {
  return window.core.ipc.invoke(EXT_ID, channel, payload).then((res) => {
    const r = res as { success: boolean; data?: T; error?: string } | null
    if (!r?.success) throw new Error(r?.error ?? 'IPC call failed')
    return r.data as T
  })
}

export function useTranslateData(): TranslateData {
  const [result, setResult] = React.useState<TranslateResult | null>(null)
  const [loading, setLoading] = React.useState<boolean>(false)
  const [error, setError] = React.useState<string | null>(null)
  const [targetLang, setTargetLang] = React.useState<SupportedLanguage>('en')

  return {
    result,
    setResult,
    loading,
    setLoading,
    error,
    setError,
    targetLang,
    setTargetLang,
    targetLanguages: TARGET_LANGUAGES,
    invoke: makeInvoker,
  }
}
