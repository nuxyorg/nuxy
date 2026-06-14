export interface TwoPanelProps extends Record<string, unknown> {
  left: unknown
  right: unknown
  split?: string
  hideLeft?: boolean
}
