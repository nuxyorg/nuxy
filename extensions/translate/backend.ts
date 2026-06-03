import type { CoreContext } from '@nuxy/extension-sdk'
import type { TranslatePayload, TranslateResult } from './types.ts'

const DEFAULT_API_URL = 'https://libretranslate.com'

export async function register(core: CoreContext): Promise<void> {
  core.registry.registerTool({ name: core.i18n.t('tool.name') })

  core.ipc.handle('translate', async (payload: unknown): Promise<TranslateResult> => {
    const { text, from, to } = payload as TranslatePayload

    if (!text || !text.trim()) {
      return { translatedText: '' }
    }

    const apiUrl = (await core.settings.read<string>('apiUrl')) ?? DEFAULT_API_URL
    const apiKey = (await core.settings.read<string>('apiKey')) ?? ''
    const settingsSource = (await core.settings.read<string>('sourceLanguage')) ?? 'auto'
    const settingsTarget = (await core.settings.read<string>('targetLanguage')) ?? 'en'

    const source = from ?? settingsSource
    const target = to ?? settingsTarget

    const url = `${apiUrl.replace(/\/$/, '')}/translate`

    const body: Record<string, string> = {
      q: text,
      source,
      target,
      format: 'text',
    }

    if (apiKey) {
      body['api_key'] = apiKey
    }

    core.logger.silly('Translate request', { url, source, target, textLength: text.length })

    let response: Response
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    } catch (err) {
      const msg = (err as Error).message ?? String(err)
      core.logger.error('Translation fetch error', { msg })
      throw new Error(core.i18n.t('error.failed', { message: msg }))
    }

    if (!response.ok) {
      let errMsg = `HTTP ${response.status}`
      try {
        const errData = (await response.json()) as { error?: string }
        if (errData.error) errMsg = errData.error
      } catch {}
      core.logger.warn('Translation HTTP error', { status: response.status, errMsg })
      throw new Error(core.i18n.t('error.failed', { message: errMsg }))
    }

    const data = (await response.json()) as {
      translatedText?: string
      detectedLanguage?: { language: string; confidence: number }
      error?: string
    }

    if (data.error) {
      core.logger.warn('Translation API error', { error: data.error })
      throw new Error(core.i18n.t('error.failed', { message: data.error }))
    }

    const result: TranslateResult = {
      translatedText: data.translatedText ?? '',
    }

    if (data.detectedLanguage?.language) {
      result.detectedLanguage = data.detectedLanguage.language
    }

    core.logger.info('Translation successful', {
      source,
      target,
      detected: result.detectedLanguage,
    })

    return result
  })

  core.ipc.handle('translate:copy', async (payload: unknown): Promise<void> => {
    const { text } = payload as { text: string }
    if (!text) return
    await core.clipboard.writeText(text)
  })
}
