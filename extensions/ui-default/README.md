# Default UIKit

> The built-in React component library that populates `window.UI` before the Nuxy shell boots.

**Type:** `uikit`  
**Version:** 1.0.0  
**ID:** `com.nuxy.ui-default`  
**Permissions:** None

---

## Overview

Default UIKit is the foundational component library for the Nuxy renderer. It bundles every shared React component — lists, cards, inputs, icons, navigation hooks, feedback components, and more — and exposes them on the global `window.UI` object so that extensions and the shell can consume them without bundling their own copies. It runs with `priority: 0`, meaning it is loaded first before any other uikit extension can override or extend it.

---

## Extension Type

### `uikit`
Overrides or extends `window.UI` components before the shell boots. There is no backend worker. The compiled `frontend.js` bundle is evaluated by the renderer at startup; it assigns all exported components and hooks to `window.UI`. Extensions access them as `(window.UI || {}).ComponentName`.

**Priority:** `0` — loaded first among all uikit extensions.

---

## Platform & Environment

| Platform | Supported | Notes |
|----------|-----------|-------|
| Linux (X11) | Yes | |
| Linux (Wayland) | Yes | |
| macOS | Yes | |

All platforms supported by Nuxy.

---

## Exported API

All exports are available on `window.UI` at runtime.

### Layout & Structure
`Card` `CardHeader` `CardBody` `CardFooter` `Stack` `Box` `Grid` `GridItem` `TwoPanel` `Divider` `ScrollArea` `SectionHeader`

### Lists & Items
`List` `ListItem` `ListItemBody` `ListItemText` `ListItemMeta` `ListItemActions` `ItemLeading`

### Form & Input
`Input` `Textarea` `Button` `IconButton` `Checkbox` `Switch` `RadioGroup` `Slider` `NumberInput` `SearchInput` `FileInput` `PinInput` `SelectBox`

### Navigation & Overlays
`TabBar` `Tabs` `Pagination` `Stepper` `Modal` `AlertDialog` `DropdownMenu` `DropdownItem` `DropdownDivider` `DropdownHeader`

### Display & Labeling
`Badge` `Kbd` `Tag` `Chip` `Label` `HelperText` `Tooltip` `CopyButton` `Code` `CodeBlock` `Avatar` `AvatarGroup` `Breadcrumb` `Heading` `Text` `Link`

### Feedback & Status
`Alert` `Toaster` `toast` `ProgressBar` `Spinner` `Skeleton` `LoadingState` `Callout` `CircularProgress` `ErrorState` `Banner`

### Icons
`IconFile` `IconImageFile` `IconCode` `IconDocument` `IconPdf` `IconArchive` `IconGlobe` `IconPin` `IconCalendar` `IconClock` `IconCopy` `IconCheck` `IconTrash` `IconEdit` `IconDownload` `IconUpload` `IconRefresh` `IconClose` `IconPlus` `IconMinus` `IconArrowLeft` `IconArrowRight` `IconChevronDown` `IconChevronUp` `IconMic` `IconLock` `IconUnlock` `IconEye` `IconEyeOff` `IconWarning` `IconInfo` `IconSend` `IconFilter` `IconTag` `IconUser` `IconZap` `IconVideo` `IconWorkflow` `IconSmile` `IconFolder` `IconBell` `IconStar` `IconStop`

### Hooks
`useToolKeyActions` `useListNavigation` `useTwoPanelNav`

### Specialised
`ShortcutBar` `ShortcutHint` `ShortcutSep` `EmptyState` `MediaPreview` `ConversionCard` `ChatMessage` `ChatList` `WizardSection` `PropertiesPanel` `MarkdownText`  
Primitives: `VisuallyHidden` `AspectRatio` `Portal` `DataList` `Stat` `Table` `TableRow` `TableCell`

---

## Manifest Reference

```json
{
  "id": "com.nuxy.ui-default",
  "name": "Default UIKit",
  "version": "1.0.0",
  "type": "uikit",
  "priority": 0,
  "permissions": [],
  "entry": {
    "frontend": "frontend.js"
  }
}
```
