import React, { useState, useEffect, useRef, Suspense, lazy } from 'react' // React used by classic JSX
import MockPanel from './MockPanel'

declare const __EXT_NAME__: string

const ExtFrontend = lazy(() => import(/* @vite-ignore */ '~ext/frontend.tsx'))

const WINDOW_W = 680
const WINDOW_H = 500

export default function DevShell() {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        alignItems: 'center',
        padding: '32px 0 48px',
      }}
    >
      {/* Dev badge */}
      <div
        style={{
          fontSize: '11px',
          color: 'rgba(255,255,255,0.3)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <span
          style={{
            background: 'rgba(100,180,255,0.15)',
            color: '#60b4ff',
            padding: '2px 8px',
            borderRadius: '4px',
            fontWeight: 700,
            letterSpacing: '0.05em',
          }}
        >
          DEV
        </span>
        <span>{__EXT_NAME__}</span>
      </div>

      {/* Extension window */}
      <div
        style={{
          width: `${WINDOW_W}px`,
          height: `${WINDOW_H}px`,
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--bg-base, #141414)',
          boxShadow: '0 24px 64px rgba(0,0,0,0.7)',
        }}
      >
        {/* Mock omnibar */}
        <div
          style={{
            padding: '10px 16px',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            background: 'rgba(255,255,255,0.02)',
            flexShrink: 0,
          }}
        >
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search…"
            style={{
              width: '100%',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'rgba(255,255,255,0.85)',
              fontSize: '14px',
            }}
          />
        </div>

        {/* Extension content */}
        <div style={{ flex: 1, minHeight: 0, display: 'flex', overflow: 'hidden' }}>
          <Suspense
            fallback={
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '100%',
                  opacity: 0.3,
                  fontSize: '13px',
                }}
              >
                Loading…
              </div>
            }
          >
            <ExtFrontend query={query} />
          </Suspense>
        </div>
      </div>

      {/* Mock panel */}
      <MockPanel />
    </div>
  )
}
