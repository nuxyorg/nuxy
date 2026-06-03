import type { IpcChannelMap } from '@nuxy/extension-sdk'

export interface QrGeneratePayload {
  text: string
  size?: number
  errorCorrectionLevel?: string
}

export interface QrGenerateResult {
  dataUrl: string
}

export interface QrCopyTextPayload {
  text: string
}

export interface QrCopyTextResult {
  copied: true
}

export interface IpcChannels extends IpcChannelMap {
  'qr:generate': { input: QrGeneratePayload; output: QrGenerateResult }
  'qr:copyText': { input: QrCopyTextPayload; output: QrCopyTextResult }
}
