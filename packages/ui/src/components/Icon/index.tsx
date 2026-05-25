import React from 'react'

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string
  opacity?: number
}

const defaultProps = {
  width: 18,
  height: 18,
  opacity: 0.65,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: '1.5',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
}

function mergeProps(props: IconProps) {
  const { size, style, opacity, ...rest } = props
  const baseStyle = { opacity: opacity ?? defaultProps.opacity, ...style }
  const width = size ?? defaultProps.width
  const height = size ?? defaultProps.height

  return {
    ...defaultProps,
    width,
    height,
    style: baseStyle,
    ...rest,
  }
}

export function IconFile(props: IconProps) {
  return (
    <svg {...mergeProps(props)}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  )
}

export function IconImageFile(props: IconProps) {
  return (
    <svg {...mergeProps(props)}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  )
}

export function IconCode(props: IconProps) {
  return (
    <svg {...mergeProps(props)}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <polyline points="10 13 8 15 10 17" />
      <polyline points="14 13 16 15 14 17" />
    </svg>
  )
}

export function IconDocument(props: IconProps) {
  return (
    <svg {...mergeProps(props)}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  )
}

export function IconPdf(props: IconProps) {
  const merged = mergeProps(props)
  // IconPdf originally had opacity: 0.75 and color: '#e55' in frontend.js
  const style = { ...merged.style, opacity: props.opacity ?? 0.75, color: props.color ?? '#e55' }
  return (
    <svg {...merged} style={style}>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <path d="M9 13h1.5a1 1 0 0 1 0 2H9v-4h1.5a1 1 0 0 1 1 1" />
    </svg>
  )
}

export function IconArchive(props: IconProps) {
  return (
    <svg {...mergeProps(props)}>
      <polyline points="21 8 21 21 3 21 3 8" />
      <rect x="1" y="3" width="22" height="5" />
      <line x1="10" y1="12" x2="14" y2="12" />
    </svg>
  )
}

export function IconGlobe(props: IconProps) {
  return (
    <svg {...mergeProps(props)}>
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}

export function IconPin(props: IconProps) {
  return (
    <svg {...mergeProps(props)}>
      <line x1="12" y1="17" x2="12" y2="22" />
      <path d="M5 17h14v-1.76a2 2 0 0 0-.44-1.24l-2.78-3.5A2 2 0 0 1 15 9.24V5a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v4.24c0 .43-.15.85-.44 1.24l-2.78 3.5a2 2 0 0 0-.44 1.24V17z" />
    </svg>
  )
}

