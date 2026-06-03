const React = window.React

import type { BitwardenStatus, BitwardenItem } from '../types.ts'
import { ipc } from '../utils/ipc.ts'

interface BitwardenData {
  status: BitwardenStatus | null
  results: BitwardenItem[]
  setResults: React.Dispatch<React.SetStateAction<BitwardenItem[]>>
  refreshStatus: () => void
  emailInput: string
  setEmailInput: React.Dispatch<React.SetStateAction<string>>
}

export function useBitwardenData(query: string): BitwardenData {
  const [status, setStatus] = React.useState<BitwardenStatus | null>(null)
  const [results, setResults] = React.useState<BitwardenItem[]>([])
  const [emailInput, setEmailInput] = React.useState<string>('')
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const refreshStatus = React.useCallback((): void => {
    ipc('bw:status')
      .then((res) => {
        const s = res as BitwardenStatus
        setStatus(s)
        if (s?.email && !emailInput) {
          setEmailInput(s.email)
        }
      })
      .catch(() =>
        setStatus({
          backend: 'none',
          installed: false,
          configured: false,
          locked: true,
          os: 'linux',
        })
      )
  }, [emailInput])

  React.useEffect(() => {
    refreshStatus()
  }, [])

  const search = React.useCallback((q: string): void => {
    ipc('bw:search', { query: q })
      .then((res) => setResults(res as BitwardenItem[]))
      .catch(() => setResults([]))
  }, [])

  React.useEffect(() => {
    if (status && status.installed && status.configured && !status.locked) {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => search(query || ''), 200)
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, search, status])

  return { status, results, setResults, refreshStatus, emailInput, setEmailInput }
}
