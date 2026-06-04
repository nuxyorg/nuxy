const React = window.React

import type { DbStatus } from '../types.ts'

interface Params {
  regexMode: boolean
  status: DbStatus | null
  t: (key: string) => string
}

export function useAngrysearchSync({ regexMode, status, t }: Params): void {
  const { ShortcutSep } = window.UI || {}

  React.useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('nuxy-shell-footer-hints', {
        detail: (
          <>
            <span style={{ color: regexMode ? 'var(--color-danger)' : 'var(--text-muted)' }}>
              {regexMode ? t('mode.regex') : t('mode.normal')}
            </span>
            {ShortcutSep ? <ShortcutSep /> : <span className="nuxy-shortcut-sep">/</span>}
            <span>
              {status === null
                ? t('db.loading')
                : status.isUpdating
                  ? t('db.updating')
                  : status.exists
                    ? t('db.ready')
                    : t('db.missing')}
            </span>
          </>
        ),
      })
    )
    return () => {
      window.dispatchEvent(new CustomEvent('nuxy-shell-footer-hints', { detail: null }))
    }
  }, [regexMode, status])
}
