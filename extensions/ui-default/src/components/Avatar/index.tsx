import React from 'react'
import './index.css'

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

export function Avatar({
  src,
  name = '',
  size = 'md',
  variant = 'circle',
  status,
  className,
}: AvatarProps) {
  const getInitials = (n: string) => {
    const parts = n.split(' ').filter(Boolean)
    if (parts.length === 0) return ''
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }

  const initials = getInitials(name)

  return (
    <span
      className={[
        'nuxy-avatar',
        `nuxy-avatar--${size}`,
        variant === 'square' ? 'nuxy-avatar--square' : '',
        className || '',
      ].filter(Boolean).join(' ')}
      title={name || undefined}
    >
      {src ? (
        <img src={src} alt={name || 'Avatar'} className="nuxy-avatar__img" />
      ) : (
        <span>{initials}</span>
      )}
      {status && (
        <span
          className={`nuxy-avatar__badge nuxy-avatar__badge--${status}`}
          role="presentation"
        />
      )}
    </span>
  )
}

export interface AvatarGroupProps {
  children: React.ReactNode
  max?: number
  size?: AvatarSize
  className?: string
}

export function AvatarGroup({ children, max = 5, size = 'md', className }: AvatarGroupProps) {
  const childrenArray = React.Children.toArray(children)
  const visibleAvatars = childrenArray.slice(0, max)
  const overflow = childrenArray.length - max

  const overflowSizes = {
    xs: { width: 20, height: 20, fontSize: 9 },
    sm: { width: 28, height: 28, fontSize: 11 },
    md: { width: 36, height: 36, fontSize: 12 },
    lg: { width: 48, height: 48, fontSize: 14 },
    xl: { width: 64, height: 64, fontSize: 16 },
  }

  const overflowStyle = overflowSizes[size]

  return (
    <div className={`nuxy-avatar-group ${className || ''}`}>
      {visibleAvatars.map((child, idx) => {
        if (React.isValidElement<AvatarProps>(child)) {
          return React.cloneElement(child, { size, key: idx })
        }
        return child
      })}
      {overflow > 0 && (
        <span
          className="nuxy-avatar-group__overflow"
          style={overflowStyle}
          title={`${overflow} more`}
        >
          +{overflow}
        </span>
      )}
    </div>
  )
}
