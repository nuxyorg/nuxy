const React = window.React

import type { ExtensionListItem } from '../types.ts'
import { permissionVariant } from '../utils/storeFilter.ts'

interface Props {
  extension: ExtensionListItem | null
  onInstall: (ext: ExtensionListItem) => void
  onUninstall: (ext: ExtensionListItem) => void
  t: (key: string) => string
}

export function StoreExtensionDetail({ extension, onInstall, t }: Props) {
  const { Badge, Heading, Card, CardBody, Text, Box, IconDownload, IconWarning, IconInfo } =
    window.UI || {}

  if (!extension) {
    return (
      <Box
        style={{
          display: 'flex',
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.5,
        }}
      >
        {IconInfo && <IconInfo size={24} style={{ marginBottom: 'var(--space-2)' }} />}
        <Text size="sm" align="center">
          {t('detail.selectPrompt')}
        </Text>
      </Box>
    )
  }

  if (!(Card as unknown) || !(CardBody as unknown)) {
    return <div style={{ opacity: 0.7 }}>{t('error.requiresUiCard')}</div>
  }

  const hasRiskyPermissions = extension.permissions?.some((p) => p === 'shell' || p === 'fs')

  return (
    <Card
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        background: 'transparent',
        border: 'none',
      }}
    >
      <CardBody
        style={{
          padding: 'var(--space-5)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-4)',
        }}
      >
        {/* Header */}
        <Box
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--space-2)',
          }}
        >
          <Box>
            <Heading size="md" style={{ margin: 0 }}>
              {extension.name}
            </Heading>
            <Text size="xs" variant="muted" style={{ fontFamily: 'monospace' }}>
              {extension.id}
            </Text>
          </Box>
          {extension.canUpdate && Badge && (
            <Badge variant="warning" style={{ flexShrink: 0 }}>
              {t('badge.update')}
            </Badge>
          )}
        </Box>

        {/* Details */}
        <Box>
          <Text size="sm">
            <strong>{t('detail.author')}:</strong> {extension.author}
          </Text>
          <Text size="sm">
            <strong>{t('detail.version')}:</strong> {extension.version}
          </Text>
          <Text size="sm">
            <strong>{t('detail.type')}:</strong> {extension.type.toUpperCase()}
          </Text>
        </Box>

        {/* Description */}
        <Box>
          <Heading size="sm" style={{ marginBottom: 'var(--space-1)' }}>
            {t('detail.description')}
          </Heading>
          <Text size="sm" style={{ opacity: 0.8, lineHeight: 1.5 }}>
            {extension.description}
          </Text>
        </Box>

        {/* Permissions */}
        <Box>
          <Heading size="sm" style={{ marginBottom: 'var(--space-2)' }}>
            {t('detail.permissions')}
          </Heading>
          {extension.permissions && extension.permissions.length > 0 ? (
            <Box style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
              {extension.permissions.map((perm) =>
                Badge ? (
                  <Badge key={perm} variant={permissionVariant(perm)}>
                    {perm}
                  </Badge>
                ) : (
                  <span key={perm}>{perm}</span>
                )
              )}
            </Box>
          ) : (
            <Text size="xs" variant="muted">
              {t('detail.noPermissions')}
            </Text>
          )}
        </Box>

        {/* Risky permissions warning */}
        {hasRiskyPermissions && (
          <Box
            style={{
              background: 'var(--color-danger-bg)',
              border: '1px solid var(--color-danger-border)',
              padding: 'var(--space-3)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--space-2)',
            }}
          >
            {IconWarning && (
              <IconWarning
                style={{ color: 'var(--color-danger)', marginTop: '2px', flexShrink: 0 }}
              />
            )}
            <Text size="xs" style={{ color: 'var(--color-danger)', margin: 0 }}>
              {t('detail.riskyWarning')}
            </Text>
          </Box>
        )}

        {/* Install / Update action */}
        {(!extension.installed || extension.canUpdate) && (
          <Box style={{ marginTop: 'auto' }}>
            <button
              style={{
                width: '100%',
                background: 'var(--accent)',
                color: 'var(--accent-fg)',
                border: 'none',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 'var(--font-sm)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-1)',
              }}
              onClick={() => onInstall(extension)}
            >
              {IconDownload && <IconDownload size={14} />}
              {extension.canUpdate ? t('actions.update') : t('actions.install')}
            </button>
          </Box>
        )}
      </CardBody>
    </Card>
  )
}
