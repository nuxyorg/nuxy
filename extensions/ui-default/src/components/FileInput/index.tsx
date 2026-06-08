import { host } from '../../host'
import './nuxy-file-input.ts'
import type { FileMeta } from './nuxy-file-input.ts'

export interface FileInputProps {
  onChange?: (files: File[]) => void
  onRemove?: (index: number) => void
  value?: File[]
  multiple?: boolean
  accept?: string
  disabled?: boolean
  label?: string
  hint?: string
  className?: string
  id?: string
}

const EMPTY_FILES: File[] = []

function filesToMeta(files: File[]): string {
  const meta: FileMeta[] = files.map((f) => ({
    name: f.name,
    size: f.size,
    lastModified: f.lastModified,
  }))
  return JSON.stringify(meta)
}

export function FileInput({
  onChange,
  onRemove,
  value = EMPTY_FILES,
  multiple = false,
  accept,
  disabled = false,
  label = 'Choose files or drag them here',
  hint,
  className,
  id,
}: FileInputProps): HTMLElement {
  const meta = filesToMeta(value)
  const el = host('nuxy-file-input', {
    class: className,
    'files-meta': meta,
    ...(multiple ? { multiple: '' } : {}),
    ...(accept ? { accept } : {}),
    ...(disabled ? { disabled: '' } : {}),
    label,
    ...(hint ? { hint } : {}),
    ...(id ? { id } : {}),
  })
  if (onChange) {
    el.addEventListener('nuxy-file-input-change', (e) => {
      const detail = (e as CustomEvent<{ files: File[] }>).detail
      onChange(detail.files)
    })
  }
  if (onRemove || onChange) {
    el.addEventListener('nuxy-file-input-remove', (e) => {
      const detail = (e as CustomEvent<{ index: number }>).detail
      if (onRemove) onRemove(detail.index)
      else onChange?.(value.filter((_, i) => i !== detail.index))
    })
  }
  return el
}
