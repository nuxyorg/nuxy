export interface TwoPanelProps extends Record<string, unknown> {
  left: unknown
  right: unknown
  minScale?: string
  defaultPosition?: string
  hideLeft?: boolean
}
