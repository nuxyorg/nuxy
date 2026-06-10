export interface ResultCardProps extends Record<string, unknown> {
  itemId: string
  title: string
  value: string
  providerName?: string
  copied?: boolean
}
