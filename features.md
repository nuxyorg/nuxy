# Nuxy — Feature Tracker

> Nuxy is a frameless, transparent Electron-based launcher shell with an extension-driven architecture.

---

## ✅ Completed Features

### 🏗️ Core / Infrastructure

- [x] **Electron frameless overlay window** — Full-screen transparent `BrowserWindow` acting as a system-wide overlay
- [x] **`nuxy-ext://` protocol** — Custom privileged Electron protocol for serving extension assets (`frontend.js`, CSS, etc.)
- [x] **Worker thread isolation** — Each extension backend runs in a separate Worker thread; communicates with the main thread via `host:call` / `host:reply` messaging
- [x] **IPC router** — Routes messages from the `ext:invoke` channel to kernel built-ins and extension workers
- [x] **Extension scanner** — Scans `~/.nuxy/extensions/`, parses manifests, and registers extensions by type
- [x] **UNIX socket daemon** — Accepts `toggle` / `show` commands over `/tmp/nuxy.sock` (`nuxy.sh` integration)
- [x] **Single instance lock** — Prevents more than one Nuxy instance from running simultaneously
- [x] **Dev sync** — When running `pnpm dev`, copies the `extensions/` directory into `~/.nuxy/extensions/`; supports `NUXY_EXTENSIONS_SRC` and `NUXY_DEV_OVERWRITE` env variables

### 🧩 Extension System

- [x] **Tool extension type** — Standalone tools launched from the omnibar (Clipboard, Emoji Picker, ANGRYsearch, Settings…)
- [x] **Provider extension type** — Passive extensions that produce results for omnibar queries
  - `list` provider — Produces navigable list items
  - `result` provider — Shows a computed/instant result (Calculator)
  - `compare` provider — Shows comparative data (Time Calculator)
- [x] **Orchestrator extension type** — AI routing layer that dispatches queries (`com.nuxy.ai-orchestrator`)
- [x] **Theme extension** (`type: "theme"`) — Theme package that provides a set of CSS custom properties via `theme.json`
- [x] **Icon pack extension** (`type: "iconpack"`) — Registers SVG icons into the global registry via `icons.json`
- [x] **Cross-extension IPC** — `core.extensions.invoke(targetId, channel, payload)` for calling between extensions
- [x] **Extension permissions** — `clipboard`, `storage`, `media`, and other permissions declared in `manifest.json`
- [x] **`@nuxy/extension-sdk`** — SDK package wrapping the CoreContext API for extension authors

### 🐚 Shell Extension (Main UI)

- [x] **Omnibar** — Central search/command bar with a custom cursor animation, placeholder, and active tool breadcrumb
- [x] **Tool activation** — When a tool is selected from the omnibar, its `nuxy-ext://<id>/frontend.js` is loaded via dynamic import
- [x] **Exit from tool** — Exit the active tool with `Backspace` (on empty input) or `Esc`, returning to the omnibar
- [x] **Provider integration** — All active providers are queried in parallel on query change; race conditions prevented with a `queryGeneration` ref
- [x] **Keyboard navigation** — `↑ ↓` for list navigation, `→` to select first result, `Enter` to confirm
- [x] **Global keydown forwarding** — While a tool is active, omnibar key events are forwarded to the tool via the `nuxy-shell-omni-bar-keydown` custom event
- [x] **Drag** — Shell container is draggable with zoom-aware mouse handling; zoom factor is accounted for during drag
- [x] **Zoom-aware repositioning** — Automatically re-centers the window based on `windowPosition` config when zoom changes
- [x] **Screen boundary clamping** — Container cannot move off-screen; clamp calculation is synchronized with zoom and layout
- [x] **`windowPosition` parsing** — Supports `center`, `50%`, `1/3`, `200px`, and `"x y"` dual-coordinate formats
- [x] **Ctrl+K Command Palette** — Command palette listing tool-defined actions for the active tool; searchable, `↑↓` navigation, `Enter` to run, `Esc` to close
- [x] **Backdrop click** — Clicking outside the shell triggers `window.core.window.esc()`
- [x] **`nuxy-shell-reset` event** — Resets state and focuses the omnibar when the window is shown again
- [x] **Live settings update** — `windowPosition`, zoom, and other settings are applied instantly via the `nuxy-settings-updated` event

### ⚙️ Settings Extension

- [x] **GUI settings panel** — Keyboard-controlled settings screen using `@nuxy/ui` List + SelectBox components
- [x] **Theme selection** — Pick from installed themes; CSS custom properties updated instantly
- [x] **Icon pack selection** — Pick from installed icon packs
- [x] **Zoom control** — Step-by-step zoom selection from 75% to 150%; applied via `document.documentElement.style.zoom`
- [x] **Font selection** — System, Monospace, JetBrains Mono, Fira Code options
- [x] **Esc / Blur action** — `hide`, `minimize`, `quit`, `none` options
- [x] **Window width** — Step-by-step selection from 600–1200 px; applied instantly
- [x] **Maximum height** — Step-by-step selection from 400–800 px; applied instantly
- [x] **Opacity** — Opacity control from 70%–100%; applied instantly
- [x] **Always on Top** — Keep window always on top (applied instantly via kernel IPC)
- [x] **Show in Taskbar** — Show/hide in taskbar (applied instantly via kernel IPC)
- [x] **Show on Startup** — Show window on application launch
- [x] **`settings.json` persistent storage** — Settings saved to `~/.nuxy/settings.json` and loaded on every startup
- [x] **NuxyConfig deprecation** — Legacy `nuxyconfig` file removed; all window settings migrated to `settings.json`
- [x] **SelectBox focus guard** — Omnibar focus is not lost while a SelectBox is open; tab index and click focus disabled

### 🗂️ Clipboard Extension

- [x] **Clipboard history monitoring** — Monitors the system clipboard in the background and stores entries
- [x] **Text / image content classification** — Classifies clipboard items as text or image
- [x] **Split-pane UI** — Left panel: item list; right panel: preview of the selected item
- [x] **Image preview** — If the selected item contains an image, it is shown with metadata
- [x] **Copy to clipboard** — Clicking an item copies the selected entry back to the clipboard

### 🔍 ANGRYsearch Extension

- [x] **Fast file search** — System-wide file search against the ANGRYsearch database
- [x] **Ctrl+K actions** — In-tool command palette integration (Update Database, etc.)
- [x] **Keyboard navigation** — Navigate results with `↑↓`

### 🔢 Calculator Extension (Provider)

- [x] **Instant evaluation** — Evaluates mathematical expressions typed in the omnibar using `safe-eval`
- [x] **Result provider** — Returns the computed result as a provider; no separate tool window needed

### 😀 Emoji Picker Extension

- [x] **Emoji search** — Search across a large emoji dataset
- [x] **Select and copy** — Selected emoji is copied to the clipboard
- [x] **Favorites** — Usage statistics are saved to storage

### ⏱️ Time Calculator Extension

- [x] **Time difference calculation** — Calculates and displays the difference between two times/dates comparatively
- [x] **Compare provider** — Operates as a custom `compare` provider type

### 🎨 Theme and Icon System

- [x] **`theme-ocean` extension** — Built-in Ocean color theme
- [x] **`icons-default` extension** — Default SVG icon set
- [x] **JSON theme format** — Supports `colors` and `tokens` fields; applied as CSS custom properties
- [x] **Renderer theme API** — `window.core.themes.list()`, `window.core.icons.get(name, pack?)`, `window.core.icons.listPacks()`
- [x] **`gradient` extension** — CSS gradient generator tool

### 📦 UI Component Library (`@nuxy/ui`)

- [x] **`List`, `ListItem`, `ListItemBody`, `ListItemText`, `ListItemActions`** — Navigable list components
- [x] **`SelectBox`** — Fully controlled keyboard-driven dropdown; `open`, `focusedIndex`, `onSelect`, `onClose`, `onOpen` props
- [x] **`ShortcutBar`, `ShortcutHint`, `Kbd`** — Bottom shortcut bar components
- [x] **`Card`** — Card component

### 🪟 Window Management

- [x] **Spring physics animation** — Physics-based window resizing triggered by `window:resize` IPC events
- [x] **`windowPosition` config** — `center`, percentage, fraction, pixel, or `"x y"` dual-coordinate format
- [x] **`window.core.window.*` API** — Renderer-side `resize`, `hide`, `esc`, `drag`, `center`, `onShow` operations
- [x] **Positioning mode** — Electron window is a full-screen overlay; shell box is positioned via CSS

---

## 🚧 Planned / Upcoming Features

### 🏗️ Core / Infrastructure

- [ ] **Extension marketplace** — Discover, install, and update community extensions
- [ ] **Extension hot-reload** — Automatically reload extensions when their files change during development
- [ ] **Extension versioning** — Dependency resolution and breaking-change management
- [ ] **Extension settings schema** — Each extension can declare its own `settings.json` schema; Settings UI renders it automatically
- [ ] **Electron Builder packaging** — Distribution packages for all platforms: `.deb`, `.AppImage`, macOS `.dmg`
- [ ] **Auto-update** — In-app updates via `electron-updater`
- [ ] **Multi-display support** — Choose which monitor to show the shell on
- [ ] **Startup daemon** — Auto-start in the background on system boot (systemd service or autostart)

### 🐚 Shell Extension

- [ ] **Pinned tools / favorites** — Pin frequently used tools above the omnibar
- [ ] **Tool history** — Remember recently used tools and surface them at the top of the list
- [ ] **Multi-provider ranking** — Intelligently rank provider results by relevance/importance
- [ ] **Glassmorphism theme mode** — Modern backdrop-filter UI with a frosted glass blur effect
- [ ] **Animated transitions** — Smooth slide/fade animations for opening and closing tools
- [ ] **Omnibar token tags** — Display active filters or categories as chips/badges

### ⚙️ Settings Extension

- [ ] **Window position picker** — Visual dot picker for `windowPosition` (instead of a text input)
- [ ] **Shortcut key customization** — Configure the global toggle shortcut (`Super+Space`, etc.)
- [ ] **Extension management tab** — List installed extensions, enable/disable them
- [ ] **Import/Export** — Export and import settings as a `.json` file
- [ ] **Reset** — Restore all settings to factory defaults

### 🤖 AI Orchestrator Extension

- [ ] **LLM integration** — Connect to a local or cloud-based model (Ollama, OpenAI API, etc.)
- [ ] **Tool routing** — Automatically select the appropriate extension/tool by analyzing natural-language queries
- [ ] **Context memory** — Maintain conversation history throughout a session for context-aware responses
- [ ] **Streaming responses** — Real-time token-by-token response streaming; results appear line by line
- [ ] **Tool calling** — AI model can invoke an extension via IPC

### 🔍 ANGRYsearch Extension

- [ ] **Automatic database update** — Update the database in the background when the filesystem changes
- [ ] **File type filtering** — Filter search results by extension or MIME type
- [ ] **Open file / reveal in manager** — Open the file with an application or show it in the file manager from a result

### 😀 Emoji Picker Extension

- [ ] **Category filtering** — Filter emojis by category groups (Animals, Food, etc.)
- [ ] **Skin tone selection** — Skin tone options for human emojis

### 📋 Clipboard Extension

- [ ] **Persistent history** — Reload clipboard history when the application restarts
- [ ] **Pinning** — Pin important clipboard entries to protect them from being cleared
- [ ] **Search** — Text search within clipboard history
- [ ] **Template system** — Save frequently used text snippets as reusable templates

### 🎨 Theme and Icon System

- [ ] **Theme editor** — Edit color tokens from the UI and create custom themes
- [ ] **Dynamic color** — Automatically derive a theme from the system accent color or wallpaper
- [ ] **Additional icon packs** — Popular icon sets such as Phosphor, Lucide, and Material Icons

### 🧪 Testing and Quality

- [ ] **Expand E2E test coverage** — Comprehensive Playwright e2e test suite covering all extension flows
- [ ] **Extension integration tests** — Isolated test environment for cross-extension IPC calls
- [ ] **CI pipeline** — Automated testing and linting via GitHub Actions; required to pass on PRs

### 🌐 Community and Documentation

- [ ] **Extension developer guide** — Step-by-step extension creation documentation with a starter template
- [ ] **API reference documentation** — Full reference for `CoreContext`, `window.core.*`, and IPC channels
- [ ] **README update** — Comprehensive README with installation, usage, and screenshot/demo GIFs

---

## 🗂️ Current Extension Inventory

| Extension                  | Type               | Description                              |
| -------------------------- | ------------------ | ---------------------------------------- |
| `com.nuxy.shell`           | Shell              | Main UI — omnibar, drag, command palette |
| `com.nuxy.settings`        | Tool               | Application settings panel               |
| `com.nuxy.clipboard`       | Tool               | Clipboard history manager                |
| `com.nuxy.angrysearch`     | Tool               | Fast system-wide file search             |
| `com.nuxy.emoji-picker`    | Tool               | Emoji search and copy                    |
| `com.nuxy.gradient`        | Tool               | CSS gradient generator                   |
| `com.nuxy.calculator`      | Provider (result)  | Instant mathematical evaluation          |
| `com.nuxy.time-calculator` | Provider (compare) | Time difference calculator               |
| `com.nuxy.ai-orchestrator` | Orchestrator       | AI-based query router                    |
| `theme-ocean`              | Theme              | Ocean color theme                        |
| `icons-default`            | Icon Pack          | Default SVG icon set                     |
