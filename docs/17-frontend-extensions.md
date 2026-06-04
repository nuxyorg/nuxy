# 17 - Frontend Extensions & The UI Library

## 1. Visual Consistency & Performance

While the backend logic of an extension runs in an isolated Node `Worker` thread, the frontend React UI (`frontend.js`) is injected into Nuxy's main Chromium Renderer process.

If every extension bundled its own version of React, Tailwind, and UI components, the application would become incredibly bloated and visually inconsistent. To prevent this, Nuxy enforces a **Shared UI Paradigm**.

## 2. The `@nuxy/ui` Package

When developing an extension, you do not install UI libraries. Nuxy acts as the host and provides its predefined Shadcn UI components globally at runtime.

### 2.1 Building the Extension UI

During development, the extension author installs `@nuxy/ui` as a `devDependency` to get TypeScript autocomplete, but configures their bundler (Vite/Webpack) to treat it as `external`.

```tsx
// frontend.tsx (The Extension's React Code)
// These are not bundled! Nuxy provides them at runtime.
import React, { useEffect, useState } from 'react'
import { Card, Button, Input, ScrollArea } from '@nuxy/ui'

export default function ExtensionView() {
  const [data, setData] = useState('')

  return (
    <Card className="p-4 bg-transparent border-none">
      <Input placeholder="Type something..." onChange={(e) => setData(e.target.value)} />
      <ScrollArea className="h-[200px] mt-4">
        {/* Dynamic HTML elements rendered seamlessly into the Nuxy DOM */}
        <div className="text-muted-foreground">{data}</div>
      </ScrollArea>
      <Button
        variant="default"
        onClick={() => {
          // Communicate securely with the isolated Backend Worker
          window.core.ipc.invoke('my-ext:action', data)
        }}
      >
        Execute
      </Button>
    </Card>
  )
}
```

## 3. How Nuxy Renders Extension UIs

Nuxy provides specific "Canvas Zones" where extensions can render their HTML elements.

### Zone A: The Dropdown Result (`Provider`)

If an extension is a `Provider` (e.g., App Launcher), it doesn't render a full screen. It returns lightweight React nodes or standard JSON that Nuxy formats using its predefined `<Command.Item>` Shadcn components.

### Zone B: The Main Canvas (`Tool` / Dedicated View)

If a user explicitly opens the Clipboard Manager, Nuxy replaces the area below the OmniBar with the extension's default exported React Component. Because the extension uses `@nuxy/ui`, it automatically inherits:

- The user's active Theme (Dark/Light mode).
- CSS Custom Properties (Colors, Radius, Fonts).
- Hover and Focus animations.

## 4. Contextual Keyboard Shortcuts & The Footer

Nuxy's main interface features a dynamic **Footer** that displays available actions and their keyboard shortcuts (e.g., `Enter` to Select, `Cmd+K` for Actions, `Cmd+Del` to Delete).

Extensions do not render their own footers. Instead, they dynamically pass their supported keyboard shortcuts to the Nuxy Core, which renders them uniformly.

### 4.1 The `useExtensionContext` Hook

Using the `@nuxy/ui` package, the frontend of the extension registers shortcuts based on its current UI state. Nuxy takes care of displaying them in the footer AND automatically binds the DOM keyboard event listeners.

```tsx
import React, { useEffect } from 'react'
import { Card, useExtensionContext } from '@nuxy/ui'

export default function ClipboardView({ activeItemId }) {
  const { setShortcuts } = useExtensionContext()

  useEffect(() => {
    // Dynamically update the footer based on what the user is doing
    setShortcuts([
      {
        key: 'Enter',
        label: 'Paste Item',
        onTrigger: () => paste(activeItemId),
      },
      {
        key: 'Cmd+Del',
        label: 'Delete from History',
        onTrigger: () => remove(activeItemId),
      },
    ])

    // Cleanup when component unmounts or active item changes
    return () => setShortcuts([])
  }, [activeItemId])

  return <Card>...</Card>
}
```

By centralizing shortcut management in the Core UI:

1. **Consistency**: The user always looks at the exact same footer design.
2. **Conflict Prevention**: If two components try to bind `Enter`, Nuxy manages the scope and prevents double-firing.
3. **Accessibility**: The Core can automatically map these actions into an "Action Menu" (Cmd+K menu) for users who prefer searching for actions rather than memorizing shortcuts.

## 5. Frontend Security Limitations

Although the React component renders in the main DOM, it is still securely restricted:

1. **No Node API**: The React component has `nodeIntegration: false`. It cannot read the filesystem.
2. **Context Bridge Only**: The _only_ way the UI can do anything system-level is by calling `window.core.ipc.invoke()`.
3. **Backend Firewall**: When the UI calls `invoke()`, the message goes to the Nuxy Kernel. The Kernel verifies the request and forwards it to the extension's isolated `Worker` thread. Thus, the Frontend UI cannot bypass the Kernel's security rules.

---

## Related Documents

| Topic                                   | Document                                                     | Notes                                                      |
| --------------------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------- |
| Plugin system and backend isolation     | [15-modular-plugin-system.md](./15-modular-plugin-system.md) | Worker thread loading and CoreContext injection            |
| Omni-input arbitration and canvas zones | [16-omni-input-system.md](./16-omni-input-system.md)         | Provider vs Tool rendering zones                           |
| Extension access and renderer APIs      | [21-extension-access.md](./21-extension-access.md)           | Full `window.core` API reference and implementation status |
