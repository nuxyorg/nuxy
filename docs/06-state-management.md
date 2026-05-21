# 06 - State Management

## 1. The Death of the Global Store

In the legacy codebase, Pinia was used as a monolithic global store. This resulted in state bloat and memory retention issues, as the store held references to thousands of items even when those views were completely hidden.

To adhere to the minimalist ethos, Nuxy eliminates global state managers (like Redux or Pinia). Instead, we utilize **Colocated State** via React Custom Hooks inside each Extension.

## 2. Anatomy of a Custom Hook

Because extensions are dynamically loaded via `nuxy-ext://`, their state is completely isolated. The extension encapsulates local React state (`useState`), side-effects (`useEffect`), and memoized functions (`useCallback`) that interact with its isolated Worker thread via IPC.

### 2.1 The Standard Pattern

```typescript
// com.nuxy.notes/frontend.ts
import { useState, useEffect, useCallback } from 'react'

export function useNotes() {
  const [notes, setNotes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 1. Initial Data Fetching from the Backend Worker
  useEffect(() => {
    async function fetch() {
      setIsLoading(true)
      const res = await window.core.ipc.invoke('notes:getAll')
      if (res.success) {
        setNotes(res.data)
      } else {
        setError(res.error)
      }
      setIsLoading(false)
    }
    fetch()
  }, [])

  // 2. Action Generators
  const addNote = useCallback(async (content: string) => {
    // Optimistic UI Update
    const tempNote = { id: 'temp', content, timestamp: Date.now() }
    setNotes((prev) => [tempNote, ...prev])

    // Send to isolated worker
    const res = await window.core.ipc.invoke('notes:add', { content })

    if (res.success) {
      // Reconcile with real ID from backend
      setNotes((prev) => prev.map((n) => (n.id === 'temp' ? res.data : n)))
    } else {
      // Rollback on failure
      setNotes((prev) => prev.filter((n) => n.id !== 'temp'))
      setError(res.error)
    }
  }, [])

  return { notes, isLoading, error, addNote }
}
```

## 3. Global State Sharing (Nuxy Core Context)

Because extensions are isolated, they _cannot_ share React Context. If the UI Theme changes, Nuxy Core passes it down via CSS variables (e.g. `--background`). The extension UI doesn't need a React Context to know it's in dark mode; it just uses `@nuxy/ui` components which automatically adapt to the CSS variables.
