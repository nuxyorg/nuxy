const React = window.React

import type { SupportedLanguage } from './types.ts'
import { useTranslateData } from './hooks/useTranslateData.ts'
import { useTranslateActions } from './hooks/useTranslateActions.ts'

const EXT_ID = 'com.nuxy.translate'

import { _useTranslation, _useToolKeyActions } from '../ui-hooks.ts'

interface Props {
  query: string
}

export default function TranslateView({ query }: Props) {
  const { List, ListItem, ListItemBody, ListItemText, ListItemMeta, EmptyState, Alert } =
    window.UI || {}

  const { t, dir } = _useTranslation(EXT_ID)

  const {
    result,
    setResult,
    loading,
    setLoading,
    error,
    setError,
    targetLang,
    setTargetLang,
    targetLanguages,
    invoke,
  } = useTranslateData()

  const { handleTranslate, handleCopy, handleCycleTarget, copied } = useTranslateActions({
    query,
    targetLang,
    result,
    setResult,
    setLoading,
    setError,
    setTargetLang,
    invoke,
    t,
  })

  // Translate when query or targetLang changes (with debounce)
  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  React.useEffect(() => {
    if (!query.trim()) {
      setResult(null)
      setError(null)
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      void handleTranslate()
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, targetLang])

  // Dispatch hint refresh when result/copied state changes
  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [result, copied])

  _useToolKeyActions([
    {
      key: 'Enter',
      label: t('action.copy'),
      hint: '↵',
      activeOn: () => Boolean(result?.translatedText) && !copied,
      handler: () => {
        void handleCopy()
      },
    },
    {
      key: 't',
      label: t('action.translate'),
      hint: 'T',
      handler: () => {
        handleCycleTarget()
      },
    },
  ])

  const hasResult = Boolean(result?.translatedText)
  const detectedLang = result?.detectedLanguage

  return (
    <div style={{ direction: dir, height: '100%', overflowY: 'auto' }}>
      {error && Alert && <Alert variant="danger">{error}</Alert>}

      {!query.trim() && !loading && !error
        ? EmptyState && <EmptyState message={t('empty.placeholder')} />
        : List && (
            <List>
              {loading && (
                <ListItem key="loading">
                  <ListItemBody>
                    <ListItemText variant="muted">{t('action.translate')}...</ListItemText>
                  </ListItemBody>
                </ListItem>
              )}

              {!loading && hasResult && (
                <ListItem key="result" active>
                  <ListItemBody>
                    <ListItemText variant={copied ? 'success' : 'default'}>
                      {copied ? t('action.copy') : result!.translatedText}
                    </ListItemText>
                    <ListItemMeta>
                      {detectedLang
                        ? t('label.detected', { lang: t(`lang.${detectedLang}`) || detectedLang })
                        : t('label.source')}
                      {' → '}
                      {t(`lang.${targetLang}`) || targetLang}
                    </ListItemMeta>
                  </ListItemBody>
                </ListItem>
              )}
            </List>
          )}
    </div>
  )
}
