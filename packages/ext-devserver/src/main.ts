import * as UI from '@nuxyorg/ui'
import { setupMockCore } from './mock-core'
import type { DevIconPack, DevTheme } from './dev-env'
import type { DevLocaleExtension } from './dev-i18n'

declare const __EXT_ID__: string
declare const __EXT_DISPLAY_NAME__: string
declare const __EXT_ELEMENT__: string
declare const __USE_REAL_SHELL__: boolean
declare const __DEV_LOCALE_EXTENSIONS__: DevLocaleExtension[]

declare global {
  interface Window {
    __NUXY_DEV_THEME__?: DevTheme
  }
}

;(window as any).UI = UI

async function bootstrap() {
  const [themeRes, iconsRes] = await Promise.all([
    fetch('/dev/theme.json').catch((err) => {
      console.warn('[ext-devserver] failed to fetch dev theme.json', err)
      return null
    }),
    fetch('/dev/icons.json').catch((err) => {
      console.warn('[ext-devserver] failed to fetch dev icons.json', err)
      return null
    }),
  ])

  let theme: DevTheme | null = null
  if (themeRes?.ok) {
    theme = (await themeRes.json()) as DevTheme
    window.__NUXY_DEV_THEME__ = theme
  }

  let iconPack: DevIconPack | null = null
  if (iconsRes?.ok) {
    iconPack = (await iconsRes.json()) as DevIconPack
  }

  setupMockCore(
    {
      id: __EXT_ID__,
      name: __EXT_DISPLAY_NAME__,
      element: __EXT_ELEMENT__,
    },
    {
      theme,
      iconPack,
      localeExtensions: __DEV_LOCALE_EXTENSIONS__,
    }
  )

  await import('virtual:ui-register')

  const loaders: Record<string, () => Promise<unknown>> = {
    [__EXT_ID__]: () => import('~ext/frontend.ts'),
  }
  if (__USE_REAL_SHELL__) {
    loaders['com.nuxy.shell'] = () => import('virtual:shell-frontend')
  }
  ;(window as any).__NUXY_EXT_LOADERS__ = loaders

  await import('./DevShell')
}

void bootstrap()
