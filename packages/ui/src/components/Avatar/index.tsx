import React from 'react'



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
  children: React.ReactNode
  max?: number
  size?: AvatarSize
  className?: string
}

export function Avatar(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.Avatar || (() => null);
  return <Impl {...props} />;
}

export function AvatarGroup(props: any): React.ReactElement {
  const Impl = (window.UI as any)?.AvatarGroup || (() => null);
  return <Impl {...props} />;
}

