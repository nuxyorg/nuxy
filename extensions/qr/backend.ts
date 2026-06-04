import type { CoreContext } from '@nuxy/extension-sdk'
import QRCode from 'qrcode'

import type {
  QrGeneratePayload,
  QrGenerateResult,
  QrCopyTextPayload,
  QrCopyTextResult,
} from './types.ts'

export async function register(core: CoreContext): Promise<void> {
  core.registry.registerTool({ name: core.i18n.t('tool.name') })

  core.ipc.handle('qr:generate', async (payload: unknown): Promise<QrGenerateResult> => {
    const { text, size, errorCorrectionLevel } = payload as QrGeneratePayload

    const configSize = parseInt((await core.settings.read<string>('size')) ?? '256', 10)
    const configEc = (await core.settings.read<string>('errorCorrection')) ?? 'M'

    const dataUrl = await QRCode.toDataURL(text || ' ', {
      width: size ?? configSize,
      errorCorrectionLevel: (errorCorrectionLevel ?? configEc) as 'L' | 'M' | 'Q' | 'H',
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    })

    core.logger.info('Generated QR code', { length: text?.length ?? 0 })
    return { dataUrl }
  })

  core.ipc.handle('qr:copyText', async (payload: unknown): Promise<QrCopyTextResult> => {
    const { text } = payload as QrCopyTextPayload
    await core.clipboard.writeText(text)
    core.logger.info('Copied QR text to clipboard')
    return { copied: true }
  })
}
