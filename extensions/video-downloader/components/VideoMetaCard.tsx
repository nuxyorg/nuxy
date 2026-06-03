const React = window.React

import type { VideoMetadata } from '../types.ts'

interface Props {
  metadata: VideoMetadata
}

export function VideoMetaCard({ metadata }: Props) {
  const { Card, CardBody } = window.UI || {}
  const MediaPreview = (window.UI as any)?.MediaPreview

  if (!(Card as unknown) || !(CardBody as unknown) || !(MediaPreview as unknown)) return null

  return (
    <Card style={{ flexShrink: 0 }}>
      <CardBody style={{ padding: 'var(--space-3)' }}>
        <MediaPreview
          thumbnail={metadata.thumbnail}
          title={metadata.title}
          uploader={metadata.uploader}
          duration={metadata.duration}
          size="md"
        />
      </CardBody>
    </Card>
  )
}
