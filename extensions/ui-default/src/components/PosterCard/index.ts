export interface PosterCardProps extends Record<string, unknown> {
  poster?: string
  title: string
  subtitle?: string
  favorite?: boolean
  active?: boolean
  className?: string
}
