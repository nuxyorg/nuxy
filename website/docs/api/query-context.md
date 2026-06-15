---
title: Query Context
---

# Query Context

The shell classifies every omnibar keystroke into a `QueryContext` and passes it alongside the raw text to all providers and tool-action consumers. Extensions use this to surface relevant results faster and prioritize their actions for the detected input type.

## QueryContext

```ts
interface QueryContext {
  raw: string
  types: QueryType[] // ordered by confidence, always ends with 'text'
  url?: URL // present when types includes 'url'
  color?: string // normalized lowercase, e.g. "#ff6600"
  filePath?: string // present when types includes 'path'
  fileExt?: string // extension without dot, e.g. "mp4"
}
```

`types` is always non-empty. `'text'` is always the last entry — every query is also plain text. Check `types[0]` for the primary classification.

## QueryType

```ts
type QueryType =
  | 'text' // plain search query (always present as fallback)
  | 'url' // http/https/ftp URL or www. prefix
  | 'color' // #hex, rgb(), rgba(), hsl(), hsla()
  | 'math' // arithmetic expression, e.g. "12 * 3 + 4"
  | 'path' // filesystem path starting with / or ~/
  | 'email' // email address
  | 'image' // URL or path with image extension
  | 'video' // URL or path with video extension, or known streaming host
  | 'audio' // URL or path with audio extension
  | 'pdf' // URL or path ending in .pdf
  | 'archive' // URL or path with archive extension (zip, tar, gz…)
```

A single query can map to multiple types. A YouTube URL produces `['url', 'video', 'text']`; a path to a zip file produces `['path', 'archive', 'text']`.

## `classifyQuery(raw)`

Exported from `@nuxy/core`. Pure function, no I/O.

```ts
import { classifyQuery } from '@nuxy/core'

const ctx = classifyQuery('https://youtu.be/dQw4w9WgXcQ')
// { raw: '...', types: ['url', 'video', 'text'], url: URL { ... } }

const ctx2 = classifyQuery('#ff6600')
// { raw: '#ff6600', types: ['color', 'text'], color: '#ff6600' }

const ctx3 = classifyQuery('~/Documents/report.pdf')
// { raw: '...', types: ['path', 'pdf', 'text'], filePath: '~/Documents/report.pdf', fileExt: 'pdf' }
```

## Provider eval payload

The shell passes `context` alongside `text` when invoking providers:

```ts
// Sent to all providers on each debounced keystroke
core.ipc.handle('eval', async ({ text, context }) => {
  if (context.types.includes('color')) {
    return { items: [{ label: 'Save color', id: text }] }
  }
  // …
})
```

## Tool actions — `relevantFor`

`ShellCommandAction` accepts an optional `relevantFor` array. When the current `QueryContext` contains a matching type, the shell moves that action to the top of the tool-actions list automatically.

```ts
core.shell.registerActions([
  {
    id: 'download-video',
    label: 'Download video',
    relevantFor: ['video'],
    onExecute: () => {
      /* … */
    },
  },
  {
    id: 'open-link',
    label: 'Open in browser',
    relevantFor: ['url'],
    onExecute: () => {
      /* … */
    },
  },
])
```

Actions without `relevantFor` always appear but are not boosted. Actions whose `relevantFor` does not match the current context are shown last.

## Manifest — `queryAffinity`

For providers and tools, declare `queryAffinity` in `manifest.json` to signal which query types your extension handles best. The shell uses this to sort provider result sections and can surface your extension earlier in the results list.

```json
{
  "id": "com.example.color-picker",
  "type": "provider",
  "queryAffinity": ["color"]
}
```

```json
{
  "id": "com.example.downloader",
  "type": "tool",
  "queryAffinity": ["video", "audio", "url"]
}
```

See [Manifest Reference → Query Affinity](/extensions/manifest#query-affinity) for the full field spec.
