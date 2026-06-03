const React = window.React

import type { Snippet } from '../types.ts'
import { invoke } from '../utils/format.ts'

interface SnippetsData {
  snippets: Snippet[]
  setSnippets: React.Dispatch<React.SetStateAction<Snippet[]>>
  loadSnippets: (q?: string) => void
}

export function useSnippetsData(query: string): SnippetsData {
  const [snippets, setSnippets] = React.useState<Snippet[]>([])

  const loadSnippets = React.useCallback((q?: string): void => {
    invoke<Snippet[]>('getSnippets', q ? { query: q } : {})
      .then(setSnippets)
      .catch(() => {})
  }, [])

  React.useEffect(() => {
    if (!query) {
      loadSnippets()
      return
    }
    const timer = setTimeout(() => {
      loadSnippets(query)
    }, 150)
    return () => clearTimeout(timer)
  }, [query, loadSnippets])

  return { snippets, setSnippets, loadSnippets }
}
