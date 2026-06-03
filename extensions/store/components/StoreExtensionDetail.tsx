const React = window.React

import type { ExtensionListItem } from '../types.ts'
import { permissionVariant } from '../utils/storeFilter.ts'

interface Props {
  extension: ExtensionListItem | null
  onInstall: (ext: ExtensionListItem) => void
  onUninstall: (ext: ExtensionListItem) => void
}

export function StoreExtensionDetail({ extension, onInstall, onUninstall }: Props) {
  const {
    Badge,
    Heading,
    Card,
    CardBody,
    Text,
    Box,
    IconDownload,
    IconTrash,
    IconWarning,
    IconInfo,
  } = window.UI || {}

  if (!extension) {
    return (
      <Box style={{ display: 'flex', flex: 1, alignItems: 'center', justifyContent: 'center', opacity: 0.5 }}>
        {IconInfo && <IconInfo size={24} style={{ marginBottom: 'var(--space-2)' }} />}
        <Text size="sm" align="center">Select an extension to see details</Text>
      </Box>
    )
  }

  if (!(Card as unknown) || !(CardBody as unknown)) {
    return <div style={{ opacity: 0.7 }}>Detail views require UI Card components</div>
  }

  const hasRiskyPermissions = extension.permissions?.some((p) => p === 'shell' || p === 'fs')

  return (
    <Card style={{ height: '100%', display: 'flex', flexDirection: 'column', background: 'transparent', border: 'none' }}>
      <CardBody style={{ padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
        {/* Header */}
        <Box>
          <Heading size="md" style={{ margin: 0 }}>{extension.name}</Heading>
          <Text size="xs" variant="muted" style={{ fontFamily: 'monospace' }}>
            {extension.id}
          </Text>
        </Box>

        {/* Details */}
        <Box>
          <Text size="sm"><strong>Author:</strong> {extension.author}</Text>
          <Text size="sm">
            <strong>Version:</strong> {extension.version}
            {extension.installed && ` (Installed: ${extension.installedVersion})`}
          </Text>
          <Text size="sm"><strong>Type:</strong> {extension.type.toUpperCase()}</Text>
        </Box>

        {/* Description */}
        <Box>
          <Heading size="sm" style={{ marginBottom: 'var(--space-1)' }}>Description</Heading>
          <Text size="sm" style={{ opacity: 0.8, lineHeight: 1.4 }}>
            {extension.description}
          </Text>
        </Box>

        {/* Permissions */}
        <Box>
          <Heading size="sm" style={{ marginBottom: 'var(--space-2)' }}>Permissions Required</Heading>
          {extension.permissions && extension.permissions.length > 0 ? (
            <Box style={{ display: 'flex', flexWrap: 'wrap' }}>
              {extension.permissions.map((perm) =>
                Badge ? (
                  <Badge
                    key={perm}
                    variant={permissionVariant(perm)}
                    style={{ marginRight: 'var(--space-1)', marginBottom: 'var(--space-1)' }}
                  >
                    {perm}
                  </Badge>
                ) : (
                  <span key={perm}>{perm}</span>
                )
              )}
            </Box>
          ) : (
            <Text size="xs" variant="muted">No permissions required</Text>
          )}
        </Box>

        {/* Risky permissions warning */}
        {hasRiskyPermissions && (
          <Box
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              padding: 'var(--space-2)',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 'var(--space-2)',
            }}
          >
            {IconWarning && <IconWarning style={{ color: 'var(--color-danger)', marginTop: '2px', flexShrink: 0 }} />}
            <Text size="xs" style={{ color: 'var(--color-danger)', margin: 0 }}>
              This extension requests system command or file write privileges. Verify publisher integrity.
            </Text>
          </Box>
        )}

        {/* Actions */}
        <Box style={{ marginTop: 'auto', display: 'flex', gap: 'var(--space-2)' }}>
          {(!extension.installed || extension.canUpdate) && (
            <button
              className="btn btn--primary"
              style={{
                flex: 1,
                background: 'var(--color-primary)',
                color: '#fff',
                border: 'none',
                padding: 'var(--space-2)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-1)',
              }}
              onClick={() => onInstall(extension)}
            >
              {IconDownload && <IconDownload size={14} />}
              {extension.canUpdate ? 'Update' : 'Install'}
            </button>
          )}

          {extension.installed && !extension.isSystem && (
            <button
              className="btn btn--danger"
              style={{
                flex: 1,
                background: 'rgba(239, 68, 68, 0.2)',
                color: 'var(--color-danger)',
                border: '1px solid var(--color-danger)',
                padding: 'var(--space-2)',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-1)',
              }}
              onClick={() => onUninstall(extension)}
            >
              {IconTrash && <IconTrash size={14} />}
              Uninstall
            </button>
          )}
        </Box>
      </CardBody>
    </Card>
  )
}
