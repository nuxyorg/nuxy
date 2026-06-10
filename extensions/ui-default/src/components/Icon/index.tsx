import { h } from '../../h'
import './nuxy-icon.ts'

export interface IconProps extends Record<string, unknown> {
  size?: number | string
  opacity?: number
}

function mapProps({ size, opacity, className, color, style, ...rest }: IconProps) {
  const attrs: Record<string, unknown> = { ...rest }
  if (size != null) attrs.size = String(size)
  if (opacity != null) attrs.opacity = String(opacity)
  if (className) attrs.class = className
  if (color != null) attrs.color = String(color)
  if (style) attrs.style = style
  return attrs
}

function icon(name: string) {
  return (props: IconProps) => h('nuxy-icon', { name, ...mapProps(props) })
}

export const IconFile = icon('File')
export const IconImageFile = icon('ImageFile')
export const IconCode = icon('Code')
export const IconDocument = icon('Document')
export const IconPdf = icon('Pdf')
export const IconArchive = icon('Archive')
export const IconGlobe = icon('Globe')
export const IconPin = icon('Pin')
export const IconCalendar = icon('Calendar')
export const IconClock = icon('Clock')
export const IconCopy = icon('Copy')
export const IconCheck = icon('Check')
export const IconTrash = icon('Trash')
export const IconEdit = icon('Edit')
export const IconDownload = icon('Download')
export const IconUpload = icon('Upload')
export const IconRefresh = icon('Refresh')
export const IconClose = icon('Close')
export const IconPlus = icon('Plus')
export const IconMinus = icon('Minus')
export const IconArrowLeft = icon('ArrowLeft')
export const IconArrowRight = icon('ArrowRight')
export const IconChevronDown = icon('ChevronDown')
export const IconChevronUp = icon('ChevronUp')
export const IconMic = icon('Mic')
export const IconLock = icon('Lock')
export const IconUnlock = icon('Unlock')
export const IconEye = icon('Eye')
export const IconEyeOff = icon('EyeOff')
export const IconWarning = icon('Warning')
export const IconInfo = icon('Info')
export const IconSend = icon('Send')
export const IconFilter = icon('Filter')
export const IconTag = icon('Tag')
export const IconUser = icon('User')
export const IconZap = icon('Zap')
export const IconVideo = icon('Video')
export const IconWorkflow = icon('Workflow')
export const IconSmile = icon('Smile')
export const IconFolder = icon('Folder')
export const IconBell = icon('Bell')
export const IconStar = icon('Star')
export const IconStop = icon('Stop')

export type IconName =
  | 'Archive'
  | 'ArrowLeft'
  | 'ArrowRight'
  | 'Bell'
  | 'Calendar'
  | 'Check'
  | 'ChevronDown'
  | 'ChevronUp'
  | 'Clock'
  | 'Close'
  | 'Code'
  | 'Copy'
  | 'Document'
  | 'Download'
  | 'Edit'
  | 'Eye'
  | 'EyeOff'
  | 'File'
  | 'Filter'
  | 'Folder'
  | 'Globe'
  | 'ImageFile'
  | 'Info'
  | 'Lock'
  | 'Mic'
  | 'Minus'
  | 'Pdf'
  | 'Pin'
  | 'Plus'
  | 'Refresh'
  | 'Send'
  | 'Smile'
  | 'Star'
  | 'Stop'
  | 'Tag'
  | 'Trash'
  | 'Unlock'
  | 'Upload'
  | 'User'
  | 'Video'
  | 'Warning'
  | 'Workflow'
  | 'Zap'

export function Icon({ name, ...props }: IconProps & { name: string }): HTMLElement | null {
  if (!name) return null
  return h('nuxy-icon', { name, ...mapProps(props) })
}
