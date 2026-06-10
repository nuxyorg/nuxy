export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
export type AvatarStatus = 'online' | 'busy' | 'away' | 'offline'
export interface AvatarProps {
  src?: string
  name?: string
  size?: AvatarSize
  variant?: 'circle' | 'square'
  status?: AvatarStatus
  className?: string
}
export interface AvatarGroupProps {
  children: unknown
  max?: number
  size?: AvatarSize
  className?: string
}
