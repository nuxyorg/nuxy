import type { IpcChannelMap } from '@nuxy/extension-sdk'

export interface TranslatePayload {
  text: string
  from?: string
  to?: string
}

export interface TranslateResult {
  translatedText: string
  detectedLanguage?: string
}

export interface IpcChannels extends IpcChannelMap {
  translate: { input: TranslatePayload; output: TranslateResult }
}

export type SupportedLanguage = 'en' | 'tr' | 'de' | 'fr' | 'es' | 'ja' | 'zh'
export type SourceLanguage = 'auto' | SupportedLanguage

export interface LanguageOption {
  value: string
  label: string
}
