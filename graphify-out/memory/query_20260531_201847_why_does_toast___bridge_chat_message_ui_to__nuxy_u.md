---
type: 'query'
date: '2026-05-31T20:18:47.125410+00:00'
question: 'Why does Toast() bridge Chat Message UI to @nuxy/ui Components? (high betweenness 0.083)'
contributor: 'graphify'
source_nodes: ['Toast()', 'Toaster()', 'index.tsx', 'store.ts']
---

# Q: Why does Toast() bridge Chat Message UI to @nuxy/ui Components? (high betweenness 0.083)

## Answer

Toast() in extensions/ui-default has high betweenness because it is the sole concrete implementation behind the @nuxy/ui proxy stubs. @nuxy/ui's Toaster and toast functions are thin delegates to window.UI — they contain no real logic. The ui-default extension populates window.UI at runtime with its own Toast()/Toaster implementations. Every other extension (notes, video-downloader) consumes toast from window.UI without importing directly from @nuxy/ui. This makes Toast() the mandatory bridge node: any graph path from a consumer extension to the @nuxy/ui type surface must cross through it. Expanded from original query via vocab: toast chat message bridge component nuxy notification render display.

## Source Nodes

- Toast()
- Toaster()
- index.tsx
- store.ts
