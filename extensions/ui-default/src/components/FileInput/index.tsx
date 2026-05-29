import React from 'react'
import './index.css'

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

export function FileInput({
  onChange,
  onRemove,
  value = [],
  multiple = false,
  accept,
  disabled = false,
  label = 'Choose files or drag them here',
  hint,
  className,
  id,
}: FileInputProps) {
  const [dragOver, setDragOver] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList || disabled) return
    const newFiles = Array.from(fileList)
    onChange?.(multiple ? [...value, ...newFiles] : newFiles)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setDragOver(true)
  }

  const handleDragLeave = () => {
    setDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (!disabled) handleFiles(e.dataTransfer.files)
  }

  const removeFile = (idx: number) => {
    if (disabled) return
    onRemove?.(idx) ?? onChange?.(value.filter((_, i) => i !== idx))
  }

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return (
    <div className={`nuxy-file-input ${className || ''}`}>
      <div
        className={[
          'nuxy-file-input__zone',
          dragOver ? 'nuxy-file-input__zone--dragover' : '',
          value.length > 0 ? 'nuxy-file-input__zone--has-files' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !disabled && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          id={id}
          type="file"
          className="nuxy-file-input__native"
          multiple={multiple}
          accept={accept}
          disabled={disabled}
          onChange={(e) => handleFiles(e.target.files)}
        />
        <span className="nuxy-file-input__icon">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </span>
        <span className="nuxy-file-input__label">{label}</span>
        {hint && <span className="nuxy-file-input__hint">{hint}</span>}
      </div>

      {value.length > 0 && (
        <div className="nuxy-file-input__files">
          {value.map((file, idx) => (
            <div key={idx} className="nuxy-file-input__file">
              <span className="nuxy-file-input__file-name">{file.name}</span>
              <span className="nuxy-file-input__file-size">{formatSize(file.size)}</span>
              {!disabled && (
                <button
                  type="button"
                  className="nuxy-file-input__remove"
                  onClick={(e) => {
                    e.stopPropagation()
                    removeFile(idx)
                  }}
                  aria-label={`Remove ${file.name}`}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
