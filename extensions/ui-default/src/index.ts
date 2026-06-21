// fallow-ignore-file code-duplication
// Side-effect registration (CSS + custom elements) lives in entry.ts for the Vite bundle only.

// --- Component prop types (Lit custom elements — use <nuxy-*> in templates) ---
export type { ButtonProps } from './components/Button'
export type { CardProps, CardHeaderProps, CardBodyProps, CardFooterProps } from './components/Card'
export type { InputProps } from './components/Input'
export type { ListProps } from './components/List'
export type { ListItemProps } from './components/ListItem'
export type { ListItemBodyProps } from './components/ListItemBody'
export type { ListItemTextProps } from './components/ListItemText'
export type { ListItemMetaProps } from './components/ListItemMeta'
export type { ListItemActionsProps } from './components/ListItemActions'
export type { ShortcutBarProps } from './components/ShortcutBar'
export type { ShortcutHintProps } from './components/ShortcutHint'
export type { SelectBoxProps, SelectOption } from './components/SelectBox'
export type { ItemLeadingProps } from './components/ItemLeading'
export type { GridProps, GridItemProps } from './components/Grid'
export type { TwoPanelProps } from './components/TwoPanel'
export type { ToastOptions } from './components/Toaster'
export type { AlertProps } from './components/Alert'
export type { IconProps, IconName } from './components/Icon'
export type { TextareaProps } from './components/Textarea'
export type { CheckboxProps } from './components/Checkbox'
export type { SwitchProps } from './components/Switch'
export type { RadioGroupProps, RadioOption } from './components/RadioGroup'
export type { SliderProps } from './components/Slider'
export type { NumberInputProps } from './components/NumberInput'
export type { SearchInputProps } from './components/SearchInput'
export type { IconButtonProps } from './components/IconButton'
export type { FileInputProps } from './components/FileInput'
export type { PinInputProps } from './components/PinInput'
export type { TagProps } from './components/Tag'
export type { LabelProps, HelperTextProps } from './components/Label'
export type { TooltipProps, TooltipPlacement } from './components/Tooltip'
export type { CopyButtonProps } from './components/CopyButton'
export type { CodeProps, CodeBlockProps } from './components/Code'
export type { AvatarProps, AvatarGroupProps, AvatarSize, AvatarStatus } from './components/Avatar'
export type { BreadcrumbProps, BreadcrumbItem } from './components/Breadcrumb'
export type { ScrollAreaProps } from './components/ScrollArea'
export type { CollapsibleProps, AccordionProps, AccordionItem } from './components/Collapsible'
export type { TabsProps, TabItem } from './components/Tabs'
export type { PaginationProps } from './components/Tabs/Pagination'
export type { StepperProps, StepItem } from './components/Tabs/Stepper'
export type { ModalProps } from './components/Modal'
export type { AlertDialogProps } from './components/Modal/AlertDialog'
export type {
  DropdownMenuProps,
  DropdownItemProps,
  DropdownHeaderProps,
} from './components/DropdownMenu'
export type {
  TableProps,
  TableRowProps,
  TableCellProps,
  DataListProps,
  DataListItem,
  StatProps,
} from './components/Table'
export type { ProgressBarProps } from './components/ProgressBar'
export type { SpinnerProps } from './components/Spinner'
export type { SkeletonProps } from './components/Skeleton'
export type { LoadingStateProps } from './components/LoadingState'
export type { CalloutProps } from './components/Callout'
export type {
  CircularProgressProps,
  ErrorStateProps,
  BannerProps,
} from './components/CircularProgress'
export type { TextProps } from './components/Text'
export type { HeadingProps } from './components/Heading'
export type { LinkProps } from './components/Link'
export type { VisuallyHiddenProps } from './components/Text/VisuallyHidden'
export type { AspectRatioProps } from './components/Text/AspectRatio'
export type { PortalProps } from './components/Text/Portal'
export type { MediaPreviewProps } from './components/MediaPreview'
export type { ChatMessageProps, ChatListProps } from './components/ChatMessage'
export type { WizardSectionProps } from './components/WizardSection'
export type { PropertiesPanelProps, PropertyRow } from './components/PropertiesPanel'
export type { ConversionCardProps } from './components/ConversionCard'
export type { ResultCardProps } from './components/ResultCard'
export type { CompareCardProps, CompareMeta } from './components/CompareCard'
export type { MarkdownEditorProps } from './components/MarkdownEditor'
export type { MarkdownTextProps } from './components/MarkdownText'
export type { EmptyStateProps } from './components/EmptyState'
export type { KbdProps } from './components/Kbd'
export type { SectionHeaderProps } from './components/SectionHeader'

// --- Runtime API (hooks, toast, scroll) ---
export { useToolKeyActions, KeyActionsController } from './hooks/useToolKeyActions'
export type { KeyAction } from './hooks/useToolKeyActions'
export { useListNavigation } from './hooks/useListNavigation'
export type { UseListNavigationOptions, UseListNavigationResult } from './hooks/useListNavigation'
export { createGridKeyActions } from './hooks/grid-navigation'
export type { GridNavigationOptions } from './hooks/grid-navigation'
export { useTwoPanelNav } from './hooks/useTwoPanelNav'
export type {
  TwoPanelNavSection,
  TwoPanelFocusArea,
  UseTwoPanelNavOptions,
  UseTwoPanelNavResult,
} from './hooks/useTwoPanelNav'
export { toast, toastStore } from './components/Toaster'
export { useTranslation } from './hooks/useTranslation'
export type { UseTranslationResult } from './hooks/useTranslation'
export {
  smoothScrollIntoViewIfNeeded,
  smoothScrollElementToStart,
  scrollListActiveItem,
} from './hooks/scroll-into-view'
export type {
  ScrollBias,
  SmoothScrollIntoViewOptions,
  ScrollListActiveItemOptions,
} from './hooks/scroll-into-view'
