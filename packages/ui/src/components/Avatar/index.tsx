
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

export function Avatar(...args: any[]): unknown {
  return (window.UI as any)?.Avatar?.(...args) ?? null
}

export function AvatarGroup(...args: any[]): unknown {
  return (window.UI as any)?.AvatarGroup?.(...args) ?? null
}
