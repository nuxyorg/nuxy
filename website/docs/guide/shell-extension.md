---
title: Shell Extension Reference
---

# Shell Extension Reference

The `com.nuxy.shell` extension is the core interface of the Nuxy desktop launcher. It serves as the main entry point for the user interface, rendering the input omnibar, displaying search results, mounting active tools, and routing global keyboard commands.

## Roles & Responsibilities

1. **Bootstrap Viewport Render**: Serves as the primary renderer of the launcher chrome, drawing the main layout frames, resize handles, visual card results, and shortcut bars.
2. **State Management**: Implements `ShellController` which maintains the central state machine of the launcher window (e.g., query strings, selected items, active tools, dragging states, sub-controller bindings).
3. **Query Dispatching & Debouncing**: Captures user input in the search bar, immediately dispatches queries to instant action providers, and debounces requests to list/search providers by 50ms.
4. **Window Mechanics**: Manages double-spring animations for window resizing and positioning, coordinates dragging/repositioning operations, and applies configuration values (zoom, theme colors, opacity) to the DOM.
5. **Keyboard Hotkey Routing**: Integrates global shortcut bindings, processes hold actions (using hold timing indicators), and maps navigation shortcuts (Escape, Enter, Arrow keys).
6. **Usage Caching & History**: Tracks recently activated tools and usage counters in namespaced JSON files (`tool-history.json` and `usage-stats.json`).

---

## Folder & Component Architecture

```
extensions/shell/
├── manifest.json
├── backend.ts
├── controller.ts
├── frontend.ts
├── types.ts
├── utils.ts
├── nuxy-shell.css
├── nuxy-shell.ts
├── nuxy-portal-host.ts
├── nuxy-shell-omni-bar.ts
├── nuxy-shell-resize-handles.ts
├── nuxy-command-palette.ts
├── controllers/
│   ├── command-palette-controller.ts
│   ├── init-controller.ts
│   ├── keyboard-controller.ts
│   ├── navigation-controller.ts
│   ├── provider-controller.ts
│   ├── query-controller.ts
│   ├── sync-controller.ts
│   ├── tool-controller.ts
│   └── window-controller.ts
└── utils/
    ├── keyboard.ts
    ├── listResults.ts
    ├── omniBarPlaceholder.ts
    ├── toolSearchPlaceholder.ts
    └── zoom.ts
```

---

## Root Files Reference

### `backend.ts`
Manages the backend worker process for the shell. It registers key IPC endpoints for history and metrics:
- **`register(core: CoreContext): void`**: Entry point that loads historical records on startup and registers the following three IPC handlers:
  - `getRecentTools`: Resolves the array of recently opened tool IDs.
  - `getUsageStats`: Resolves the usage count and query logs object.
  - `recordToolUsed`: Increments usage frequency stats, registers the query string used to launch the tool, and saves updates back to standard storage.

---

### `controller.ts`
Defines `ShellController`, the core conductor coordinating all frontend events and bindings.

#### Key Methods:
- **`connect(): void`**: Hooks up sub-controllers, registers listeners to the IPC/DOM bridge, and starts computing provider states.
- **`disconnect(): void`**: Safely detaches event handlers, removes intervals, and resets tool-scoped state properties.
- **`resolveOmniBarPlaceholder(): string`**: Computes the search input placeholder based on the active tool or localized fallbacks.
- **`handleQueryChange(val: string): void`**: Updates query strings, triggers immediate action provider evaluations, and debounces list provider searches by 200ms.
- **`openTool(toolId: string, initialQuery?: string): void`**: Animates window height, records usage history, mounts the chosen tool custom element, and clears stale list provider states.
- **`returnToShell(options?: { selectedIndex?: number }): void`**: Deactivates the active tool, clears query buffers, animates the window back to its resting height, and focuses the primary search input.
- **`handleItemClick(item: ListItem): Promise<void>`**: Invokes the corresponding execution channel payload for search results, or opens tool items.
- **`tryOrchestratorRoute(): Promise<void>`**: Sends the search text to registered orchestrators to query if they can auto-route input (e.g. mapping equations to the Calculator).
- **`handleOmniKeyDown(e: KeyboardEvent): void`**: Navigates items (Arrow keys), copies selected metadata (ArrowRight), runs the active command (Enter), or exits tools (Backspace on empty input).

---

### `frontend.ts`
Defines `NuxyShellViewElement` (`<nuxy-shell-view>`), the main visual container mounted at launcher bootstrap.

#### Key Render Functions:
- **`render()`**: Combines the backdrop, resizing boundaries, omnibar, results area, and footer layout into the main template.
- **`renderOmniBar()`**: Renders the input container, loading indicators, custom portal extensions, and registers keyboard listeners.
- **`renderResultsPanel()`**: Orchestrates card slots, lists, and skeleton loading grids.
- **`renderProviderResults()`**: Renders customized card views (result card, compare card).
- **`renderOmnibarSections()`**: Lists matches (like matching tools) inside sections.
- **`renderShortcutBar()`**: Shows localized statistics or active tool shortcuts (e.g. hold indicators).

---

### `nuxy-shell.ts`
Defines `<nuxy-shell>`, the visual wrapper containing background portals and border gradient configurations.
- **`SHELL_COMPOSITION_SLOTS`**: Declares layout slots for third-party extensions:
  - `background-layer`: Full-bleed canvas layout.
  - `footer-portal`: Utility footer overlay slots.
  - `omnibar-portal`: Omnibar accessory mounts.
- **`gradientModeFromState(state)`**: Translates composition states into visual modes (`off`, `light`, `rainbow`, `bit`).

---

### `nuxy-portal-host.ts`
Defines `<nuxy-portal-host>`. Helper component that accepts an HTML element reference (`portalElement`) and appends it dynamically into the DOM tree.

---

### `nuxy-shell-omni-bar.ts`
Defines `<nuxy-shell-omni-bar>`. Implements the text field element, searching icons, spinner graphics, and progress bars matching timed hold operations.

---

### `nuxy-shell-resize-handles.ts`
Defines `<nuxy-shell-resize-handles>`. Renders 8 interactive corner/edge anchors to trigger resizing events via mouse drag.

---

### `nuxy-command-palette.ts`
Defines `<nuxy-command-palette>`. Implements a searchable drop-down overlay that filters and executes actions contextually relevant to the current search query. Supports recursive submenus up to `MAX_DEPTH` (10).

---

## Controllers Reference (`controllers/`)

### `command-palette-controller.ts`
Manages open/closed states for the command palette.
- **Methods**: `toggle()`, `open()`, and `close()`.

---

### `init-controller.ts`
Bootstraps launcher configs, tools, themes, and locale data from the main process.
- **`load()`**: Dispatches initial startup queries:
  - `kernel:listTools` to get all tools.
  - `kernel:listProviders` to get all providers.
  - `kernel:listOrchestrators` to get all orchestrators.
  - `kernel:getConfig` to apply basic window configs.
  - `kernel:getTheme` to resolve active style/color values.
  - `settings:getSettings` to fetch user preferences.
  - Registers listeners to reload modules when `locale-changed` is emitted.

---

### `keyboard-controller.ts`
Handles global keyboard event dispatching.
- **Key Actions**:
  - `Ctrl+Q` / `Cmd+Q`: Calls the window quit process.
  - `Ctrl+K` / `Cmd+K`: Opens the command palette.
  - `Escape`: Closes overlays, returns to shell, or minimizes the launcher.
  - Scans and triggers registered tool hotkeys, translating holding clicks into progress bars.

---

### `navigation-controller.ts`
Maintains selected item index tracking inside lists.
- **Methods**: `setSelectedIndex(index)`, `moveDown(listLength)`, `moveUp()`, and `reset()`.

---

### `provider-controller.ts`
Manages querying active providers.
- **`syncActions(...)`**: Instantly fires evaluations to action-based providers.
- **`sync(...)`**: Queries list-based search providers, debounced at 50ms.
- **`_invokeProviderEval(...)`**: Executes the IPC query. Shows skeleton animations if queries take longer than 150ms.

---

### `query-controller.ts`
Stores search query variables (`_query`, `_savedQuery`) and dispatches updates to host templates.

---

### `sync-controller.ts`
Synchronizes state changes between the renderer and preload/main process.
- **`bindBridge()`**: Monitors and syncs portal changes or placeholder modifications from the shell bridge.
- **`bindSync()`**: Listens to style changes, focus signals, and configuration updates to repaint the DOM or reset active tools.
- **`updatePosition(force, heightOverride)`**: Positions the launcher window based on config coordinates.
- **`applySettingsToDOM(settings)`**: Translates settings (zoom, font-family, theme names, keyboard scheme) into style settings on the DOM.

---

### `tool-controller.ts`
Manages registry lookups for extensions.
- **Methods**: `setTools(tools)`, `setOrchestrators(orchestrators)`, `setRecentToolIds(ids)`, `setUsageStats(stats)`, and `setActiveTool(toolId)`.

---

### `window-controller.ts`
Handles physics-based spring animations for window geometry.
- **Properties**:
  - Uses spring algorithms to smoothly animate window heights (`HEIGHT_SPRING`) and positions (`POSITION_SPRING`).
  - **`handleDragMouseDown(...)`**: Performs repositioning calculations.
  - **`handleResizeMouseDown(...)`**: Coordinates mouse-resize events, keeping sizes clamped to minimum bounds (300px width, 100px height).

---

## Utilities Reference (`utils/`)

### `keyboard.ts`
- **`getDeepActiveElement(root)`**: Traverses shadow DOM boundaries to locate the focused element.
- **`isWritingElement(el)`**: Determines if a target element is a text input, textbox, or contenteditable node.

### `listResults.ts`
- **`buildOmnibarSections(tools, query, providerStates, recentToolIds, providers, usageStats)`**: Organizes, dedupes, and prioritizes matches based on usage patterns.
- **`affinityScore(toolId, query, usageStats)`**: Calculates usage metrics to rank matching items.

### `omniBarPlaceholder.ts`
- **`resolveOmniBarPlaceholder(bridge, activeToolName, activeToolPlaceholder, t)`**: Resolves input search placeholders.

### `toolSearchPlaceholder.ts`
- **`loadToolSearchPlaceholder(extId)`**: Retrieves a tool's custom placeholder from translations.
- **`syncToolSearchPlaceholder(extId, isStillActive)`**: Applies localized placeholders when a tool is activated.

### `zoom.ts`
- **`getZoom()`**: Reads the document element's zoom property to compute coordinates correctly.
