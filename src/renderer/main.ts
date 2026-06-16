// Vanilla renderer bootstrap — expose shared runtime modules before any extension loads.
import * as NuxyCore from '@nuxyorg/core'
import * as NuxySdk from '@nuxyorg/extension-sdk'

window.UI = {} as typeof window.UI
window.__NUXY_DEV__ = import.meta.env.DEV
;(window as unknown as { NuxyCore: typeof NuxyCore }).NuxyCore = NuxyCore
;(window as unknown as { NuxySdk: typeof NuxySdk }).NuxySdk = NuxySdk

import './bootstrap.ts'
