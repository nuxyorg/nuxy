const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** Display form: FT-XXXX-XXXX (no ambiguous 0/O, 1/I). */
export function generateTransferCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(4))
  let raw = ''
  for (let i = 0; i < 8; i++) {
    const idx = bytes[i % 4] % CODE_CHARS.length
    raw += CODE_CHARS[idx]
  }
  return `FT-${raw.slice(0, 4)}-${raw.slice(4, 8)}`
}

/** PeerServer peer id: ft-xxxxxxxx (lowercase). */
export function transferCodeToPeerId(code: string): string | null {
  const normalized = code
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
  if (!/^FT[A-Z0-9]{8}$/.test(normalized)) return null
  return `ft-${normalized.slice(2).toLowerCase()}`
}

export function peerIdToDisplayCode(peerId: string): string {
  const raw = peerId.replace(/^ft-/, '').toUpperCase()
  if (raw.length !== 8) return peerId
  return `FT-${raw.slice(0, 4)}-${raw.slice(4, 8)}`
}
