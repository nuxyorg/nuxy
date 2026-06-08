import * as UI from '@nuxy/ui'
import { setupMockCore } from './mock-core'
import './DevShell'

// Set Nuxy runtime globals before any extension code is imported
;(window as any).UI = UI
setupMockCore()
