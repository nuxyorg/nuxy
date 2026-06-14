export interface SelectOption {
  value: string
  label: string
}
export interface SelectBoxProps {
  options: SelectOption[]
  value?: string
  open: boolean
  focusedIndex: number
  onSelect: (value: string) => void
  onClose: () => void
  onOpen?: (startIndex: number) => void
  placeholder?: string
  searchable?: boolean
  /** Lookahead scroll padding in px for keyboard navigation. */
  scrollLookahead?: number
  /** Scroll animation speed (0–1, fraction per frame). Default 0.1. */
  scrollSpeed?: number
  className?: string
}
