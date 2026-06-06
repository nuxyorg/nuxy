import React from 'react'

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string
  opacity?: number
}

export type IconName =
  | 'Archive' | 'ArrowLeft' | 'ArrowRight' | 'Bell' | 'Calendar'
  | 'Check' | 'ChevronDown' | 'ChevronUp' | 'Clock' | 'Close'
  | 'Code' | 'Copy' | 'Document' | 'Download' | 'Edit'
  | 'Eye' | 'EyeOff' | 'File' | 'Filter' | 'Folder'
  | 'Globe' | 'ImageFile' | 'Info' | 'Lock' | 'Mic'
  | 'Minus' | 'Pdf' | 'Pin' | 'Plus' | 'Refresh'
  | 'Send' | 'Smile' | 'Star' | 'Stop' | 'Tag'
  | 'Trash' | 'Unlock' | 'Upload' | 'User' | 'Video'
  | 'Warning' | 'Workflow' | 'Zap'

export function Icon({ name, ...props }: IconProps & { name: IconName }): React.ReactElement {
  const Impl = (window.UI as any)?.Icon ?? (() => null)
  return <Impl name={name} {...props} />
}
