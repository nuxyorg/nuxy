export type HoldMsPreset = 'short' | 'long'

export const HOLD_MS_BY_PRESET: Record<HoldMsPreset, number> = {
  short: 400,
  long: 800,
}

export function resolveHoldMs(
  preset: HoldMsPreset | string | undefined,
  fallback: number = HOLD_MS_BY_PRESET.long
): number {
  if (preset === 'short') return HOLD_MS_BY_PRESET.short
  if (preset === 'long') return HOLD_MS_BY_PRESET.long
  return fallback
}
