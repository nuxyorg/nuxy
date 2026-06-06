// fallow-ignore-file code-duplication
import './styles/base.css'

// --- Existing components ---
export { Card, CardHeader, CardBody, CardFooter } from './components/Card'
export { Input } from './components/Input'
export { Button } from './components/Button'
export type { ButtonProps } from './components/Button'
export { List } from './components/List'
export { ListItem } from './components/ListItem'
export { Badge } from './components/Badge'
export { Kbd } from './components/Kbd'
export { EmptyState } from './components/EmptyState'
export { ListItemBody } from './components/ListItemBody'
export { ListItemText } from './components/ListItemText'
export { ListItemMeta } from './components/ListItemMeta'
export { ListItemActions } from './components/ListItemActions'
export { ShortcutBar } from './components/ShortcutBar'
export { ShortcutHint, ShortcutSep } from './components/ShortcutHint'
export { SelectBox } from './components/SelectBox'
export type { SelectBoxProps, SelectOption } from './components/SelectBox'
export { useToolKeyActions } from './hooks/useToolKeyActions'
export type { KeyAction } from './hooks/useToolKeyActions'
export { ItemLeading } from './components/ItemLeading'
export { TabBar } from './components/TabBar'
export type { TabOption } from './components/TabBar'
export { Grid, GridItem } from './components/Grid'
export { TwoPanel } from './components/TwoPanel'
export { SectionHeader } from './components/SectionHeader'
export { useListNavigation } from './hooks/useListNavigation'
export type { UseListNavigationOptions, UseListNavigationResult } from './hooks/useListNavigation'
export { useTwoPanelNav } from './hooks/useTwoPanelNav'
export type {
  TwoPanelNavSection,
  TwoPanelFocusArea,
  UseTwoPanelNavOptions,
  UseTwoPanelNavResult,
} from './hooks/useTwoPanelNav'
export { Toaster, toast } from './components/Toaster'
export type { ToastOptions } from './components/Toaster'
export { Alert } from './components/Alert'
export type { AlertProps } from './components/Alert'
export { Icon } from './components/Icon'
export type { IconProps, IconName } from './components/Icon'

// --- Form & Input (Grup A) ---
export { Textarea } from './components/Textarea'
export { Checkbox } from './components/Checkbox'
export type { CheckboxProps } from './components/Checkbox'
export { Switch } from './components/Switch'
export type { SwitchProps } from './components/Switch'
export { RadioGroup } from './components/RadioGroup'
export type { RadioGroupProps, RadioOption } from './components/RadioGroup'
export { Slider } from './components/Slider'
export type { SliderProps } from './components/Slider'
export { NumberInput } from './components/NumberInput'
export type { NumberInputProps } from './components/NumberInput'
export { SearchInput } from './components/SearchInput'
export type { SearchInputProps } from './components/SearchInput'
export { IconButton } from './components/IconButton'
export type { IconButtonProps } from './components/IconButton'
export { FileInput } from './components/FileInput'
export type { FileInputProps } from './components/FileInput'
export { PinInput } from './components/PinInput'
export type { PinInputProps } from './components/PinInput'

// --- Display & Labeling (Grup B) ---
export { Tag, Chip } from './components/Tag'
export type { TagProps } from './components/Tag'
export { Label, HelperText } from './components/Label'
export type { LabelProps, HelperTextProps } from './components/Label'
export { Tooltip } from './components/Tooltip'
export type { TooltipProps, TooltipPlacement } from './components/Tooltip'
export { CopyButton } from './components/CopyButton'
export type { CopyButtonProps } from './components/CopyButton'
export { Code, CodeBlock } from './components/Code'
export type { CodeProps, CodeBlockProps } from './components/Code'
export { Avatar, AvatarGroup } from './components/Avatar'
export type { AvatarProps, AvatarGroupProps, AvatarSize, AvatarStatus } from './components/Avatar'
export { Breadcrumb } from './components/Breadcrumb'
export type { BreadcrumbProps, BreadcrumbItem } from './components/Breadcrumb'

// --- Layout & Structure (Grup C) ---
export { Divider } from './components/Divider'
export type { DividerProps } from './components/Divider'
export { Stack } from './components/Stack'
export type { StackProps } from './components/Stack'
export { ScrollArea } from './components/ScrollArea'
export type { ScrollAreaProps } from './components/ScrollArea'
export { Collapsible, Accordion } from './components/Collapsible'
export type { CollapsibleProps, AccordionProps, AccordionItem } from './components/Collapsible'

// --- Navigation & Overlays ---
export { Tabs } from './components/Tabs'
export type { TabsProps, TabItem } from './components/Tabs'
export { Pagination } from './components/Tabs/Pagination'
export type { PaginationProps } from './components/Tabs/Pagination'
export { Stepper } from './components/Tabs/Stepper'
export type { StepperProps, StepItem } from './components/Tabs/Stepper'
export { Modal } from './components/Modal'
export type { ModalProps } from './components/Modal'
export { AlertDialog } from './components/Modal/AlertDialog'
export type { AlertDialogProps } from './components/Modal/AlertDialog'
export {
  DropdownMenu,
  DropdownItem,
  DropdownDivider,
  DropdownHeader,
} from './components/DropdownMenu'
export type {
  DropdownMenuProps,
  DropdownItemProps,
  DropdownHeaderProps,
} from './components/DropdownMenu'

// --- Data Display ---
export { Table, TableRow, TableCell, DataList, Stat } from './components/Table'
export type {
  TableProps,
  TableRowProps,
  TableCellProps,
  DataListProps,
  DataListItem,
  StatProps,
} from './components/Table'

// --- Feedback & Status (Grup D) ---
export { ProgressBar } from './components/ProgressBar'
export type { ProgressBarProps } from './components/ProgressBar'
export { Spinner } from './components/Spinner'
export type { SpinnerProps } from './components/Spinner'
export { Skeleton } from './components/Skeleton'
export type { SkeletonProps } from './components/Skeleton'
export { LoadingState } from './components/LoadingState'
export type { LoadingStateProps } from './components/LoadingState'
export { Callout } from './components/Callout'
export type { CalloutProps } from './components/Callout'
export { CircularProgress, ErrorState, Banner } from './components/CircularProgress'
export type {
  CircularProgressProps,
  ErrorStateProps,
  BannerProps,
} from './components/CircularProgress'

// --- Primitives (Grup E) ---
export { Text } from './components/Text'
export type { TextProps } from './components/Text'
export { Heading } from './components/Heading'
export type { HeadingProps } from './components/Heading'
export { Link } from './components/Link'
export type { LinkProps } from './components/Link'
export { Box } from './components/Box'
export type { BoxProps } from './components/Box'
export { VisuallyHidden } from './components/Text/VisuallyHidden'
export type { VisuallyHiddenProps } from './components/Text/VisuallyHidden'
export { AspectRatio } from './components/Text/AspectRatio'
export type { AspectRatioProps } from './components/Text/AspectRatio'
export { Portal } from './components/Text/Portal'
export type { PortalProps } from './components/Text/Portal'

// --- Media ---
export { MediaPreview } from './components/MediaPreview'
export type { MediaPreviewProps } from './components/MediaPreview'

// --- Chat ---
export { ChatMessage, ChatList } from './components/ChatMessage'
export type { ChatMessageProps, ChatListProps } from './components/ChatMessage'

// --- Wizard ---
export { WizardSection } from './components/WizardSection'
export type { WizardSectionProps } from './components/WizardSection'

// --- Properties ---
export { PropertiesPanel } from './components/PropertiesPanel'
export type { PropertiesPanelProps, PropertyRow } from './components/PropertiesPanel'

// --- ConversionCard ---
export { ConversionCard } from './components/ConversionCard'
export type { ConversionCardProps } from './components/ConversionCard'

// --- Markdown ---
export { MarkdownText } from './components/MarkdownText'
export type { MarkdownTextProps } from './components/MarkdownText'

// --- i18n ---
export { useTranslation } from './hooks/useTranslation'
export type { UseTranslationResult } from './hooks/useTranslation'

// --- Scroll Utilities ---
export { smoothScrollIntoViewIfNeeded } from './utils/scroll'
