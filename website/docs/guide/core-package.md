---
title: Core Package Reference
---

# Core Package Reference

The `@nuxy/core` workspace package is the foundational layer of the Nuxy monorepo. It is the contract shared between the Electron host (main process, preload script) and extension code that runs with **no DOM** — backend Worker threads and the frontend bundles that load them. It contains shared types, schema definitions, and runtime modules, but deliberately **no DOM-dependent behavior**: helpers that manipulate `document`/`window` (font application, focus trapping, UI timing presets) live in `@nuxyorg/extension-sdk` or the consuming extension instead, since workers have no DOM to operate on. See [Core Package Responsibility Audit](#responsibility-boundary) below.

## Roles & Responsibilities

1. **System Type Declarations**: Defines the core interfaces of the application, including the `CoreContext` API proxy, `ExtensionManifest`, `LoadedExtension`, and IPC schemas.
2. **Input Query Classification**: Parses and infers the category of user queries (URLs, filesystem paths, colors, math expressions, emails, media extensions) to direct processing routing.
3. **ANSI-Colored Logging**: Implements a configurable child-namespace logger supporting levels of verbosity (`silly`, `info`, `warn`, `error`).
4. **UI Composition Management**: Defines slots, mounts, and claim validations to safely overlays HTML elements on top of the launcher's layout frame.
5. **Internationalization Helpers**: Implements BCP-47 locale matching, pluralization formatting, dot-notation translation flattener, and text direction resolvers.
6. **Preload Typed Event Bus**: Exposes typed event signatures to coordinate communication between the preload environment and the shell renderer.

## Responsibility boundary

`@nuxyorg/core` is consumed by extension **backends** running in Worker threads, which have no `document`/`window`. DOM-behavior helpers therefore do not belong here, even though earlier versions of this package included a few:

- `trapTabKey` / `getFocusableElements` (focus trapping) moved to `@nuxyorg/extension-sdk` — consumed by `extensions/ui-default` (modal dialogs) and `extensions/shell` (command palette), two independent extensions that share frontend code only through the `@nuxyorg/core` / `@nuxyorg/extension-sdk` virtual runtime modules.
- `resolveHoldMs` / `HOLD_MS_BY_PRESET` / `HoldMsPreset` (press-and-hold timing presets) moved to `extensions/shell` directly — it was the only consumer, so it no longer needs to be a shared package export at all.
- `applyUiFontSettings` / `resolveFontFamily` / `DEFAULT_FONT_FAMILY_MAP` (font CSS variable application) moved to `@nuxyorg/extension-sdk` — consumed by the host renderer bootstrap, `extensions/settings`, `extensions/shell`, and `packages/ext-devserver`, none of which can import each other's source directly.

`@nuxyorg/extension-sdk` is the right home for cross-cutting frontend/DOM helpers because every extension frontend already resolves it (via Vite alias in dev, or the `nuxy-ext://sdk` virtual module at runtime) — the same mechanism `@nuxyorg/core` uses, but scoped to frontend-authoring concerns rather than the host/backend contract.

---

## File & Function Reference

### `src/index.ts`

The barrel file re-exporting the public API surface of the core library, including context interfaces such as `CoreContext`, `DbHandle`, `PreparedStatement`, `DirEntry`, `FileStat`, and `SpawnHandle`.

---

### `src/query-context.ts`

Infers the format and type of text inputted into the launcher omnibar.

#### `classifyQuery(raw: string): QueryContext`

Trims and evaluates a raw search query string to resolve its syntactic type.

- **Returns**: A `QueryContext` containing an array of matched `QueryType`s ordered by confidence (e.g. `'url'`, `'path'`, `'color'`, `'math'`, `'email'`, ending with `'text'` as fallback), along with parsed URL properties, color codes, file extensions, or system paths.

#### `extToType(ext: string): QueryType | null` _(Internal)_

Maps specific file extensions (images, videos, audio, archives, PDFs) to their corresponding generic query types.

#### `classifyFromExt(ext: string, ctx: QueryContext, types: QueryType[]): void` _(Internal)_

Helper that appends a file extension type to the resolved types list if not already present.

---

### `src/composition.ts`

Enforces UI boundaries by managing layout slots where extension frontends can render custom interfaces.

#### `resolveToolElementTag(manifest: ExtensionManifest): string | null`

Reads and validates a custom element tag string declared in an extension manifest (`manifest.entry.element`). Returns the tag name if valid, otherwise `null`.

#### `listCompositionProvides(manifest: ExtensionManifest): CompositionSlotDeclaration[]`

Returns the array of UI slots that the extension exports (primarily used by the bootstrap shell).

#### `listCompositionClaims(manifest: ExtensionManifest): string[]`

Returns the array of UI slot names that the extension requests permission to mount into.

#### `validateCompositionClaim(callerManifest: ExtensionManifest, slotName: string, shellManifest: ExtensionManifest | undefined): CompositionClaimValidation | CompositionClaimFailure`

Validates whether a caller extension's slot claim is permitted by checking it against the current shell's declared slots and the caller's manifest permissions.

---

### `src/logger.ts`

Provides console log outputs with customized ANSI coloring, namespaces, and severity levels.

#### `createLogger(namespace: string): Logger`

Creates a scoped logger instance.

- **Returns**: An object exposing `silly`, `info`, `warn`, and `error` functions, along with a `child(subNamespace: string)` function to spawn sub-categorized logs.

#### `kernelLogger` _(Constant)_

Default pre-initialized root namespace logger for kernel logs.

#### `currentLevel(): LogLevel` _(Internal)_

Retrieves the minimum active log level by reading the `LOG_LEVEL` environment variable (defaults to `'warn'`).

#### `timestamp(): string` _(Internal)_

Generates a ISO 8601 timestamp snippet.

#### `formatLine(level: LogLevel, namespace: string, msg: string, meta?: unknown): string` _(Internal)_

Formats the log output line with timestamp, colored severity label, active namespace, log body, and optional stringified metadata object.

---

### `src/i18n.ts`

Provides utility functions to localized text translation and rendering.

#### `getTextDirection(locale: string): TextDirection`

Determines if a BCP-47 locale code is standard Left-to-Right (`'ltr'`) or Right-to-Left (`'rtl'`).

#### `resolveLocale(preferred: string[], supported: string[], defaultLocale: string): string`

Finds the best matching locale option by evaluating a list of preferred languages against supported locales. Precedence:

1. Exact match (`"tr-TR"` === `"tr-TR"`)
2. Base language match (`"tr-TR"` → `"tr"`)
3. Variant/Region match (`"tr"` → `"tr-TR"`)

#### `flattenTranslations(obj: unknown, prefix = ''): Record<string, string>`

Flattens a deeply nested translations JSON object into single-depth dot-notation keys. Plural translation maps (like `{ one: "...", other: "..." }`) are flattened into double-underscore suffixes (e.g. `key__one`, `key__other`).

#### `interpolate(template: string, vars: Record<string, string | number>): string`

Replaces `{variableName}` placeholders inside a translation template string with their actual key-value values.

#### `selectPlural(translations: Record<string, string>, key: string, count: number, locale: string): string | undefined`

Uses browser `Intl.PluralRules` to fetch the correct plural form string (`zero`, `one`, `two`, `few`, `many`, `other`) for a given count, falling back to `other` or the default one/other rules if not supported.

---

### `src/events.ts`

Declares the `CoreEvents` interface and `NuxyRendererEventMap` defining typed IPC signals:

- `shell-reset`: Fired when the launcher is reset.
- `locale-changed`: Emitted when the UI localization settings are modified.
- `settings-updated`: Emitted when configuration settings are adjusted.
- `settings-loaded`: Emitted when settings are resolved at start.
- `composition-ready`: Triggered when layout portals are ready.

---

### `src/shell.ts`

Declares types for handling shell integrations, keyboard navigation actions, and result paletting:

- `ShellKeyAction`: Custom keyboard action mappings.
- `ShellCommandAction`: Action configurations displayed in the command palette.
- `ShellBridgeSnapshot`: Read-only snapshot of the active shell state (registered shortcuts, command portals, search placeholders).
- `CoreShell`: The API interface exposing registration hooks to extension authors.

---

### `src/types.ts`

Contains standard system type models, including `ExtensionType`, `ExtensionPermission`, `ThemeDefinition`, `IconPackDefinition`, and `ExtensionManifest`.

---

### `src/lit.ts`

Helper file re-exporting reactive element decorators, custom templates from the `lit` package, and custom sanitizing helpers (`safeHTML`, `safeSVG`) as secure alternatives to Lit's standard unsafe directives.

---

### `src/renderer.ts`

Vite compiler helper that exports `@nuxy/core` types and Lit definitions for renderer contexts (used by the `ui-default` Vite build).

---

### `src/messages.ts`

Defines IPC communication types passing between backend worker threads and the main process, including `WorkerToHostMessage` (`registry:sync`, `host:call`, etc.) and `HostToWorkerMessage` (`host:reply`).

---

### `src/media.ts`

Declares the structure for now playing media details:

- `NowPlaying`: Object containing properties like `title`, `artist`, `album`, player status, and `artworkUrl`.
