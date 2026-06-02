import React from 'react'
import { createRoot } from 'react-dom/client'
import * as UI from '@nuxy/ui'
import { setupMockCore } from './mock-core'

// Set Nuxy runtime globals BEFORE any extension code is imported
// (base.css tokens are included via ui-default/src/index.tsx → './styles/base.css')
;(window as any).React = React
;(window as any).UI = UI
setupMockCore()

// DevShell lazily loads the extension frontend — globals are guaranteed to be set first
import('./DevShell').then(({ default: DevShell }) => {
  createRoot(document.getElementById('root')!).render(<DevShell />)
})
