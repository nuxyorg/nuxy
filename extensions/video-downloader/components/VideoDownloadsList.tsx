const React = window.React

import type { CombinedListItem } from '../utils/format.ts'
import { getDownloadBadge } from '../utils/format.ts'

interface Props {
  combinedList: CombinedListItem[]
  downloadSelectedIndex: number
}

export function VideoDownloadsList({ combinedList, downloadSelectedIndex }: Props) {
  const {
    List,
    ListItem,
    ListItemBody,
    ListItemActions,
    EmptyState,
    Badge,
    Heading,
    ScrollArea,
    Box,
    Stack,
    Text,
  } = window.UI || {}
  const MediaPreview = (window.UI as any)?.MediaPreview

  if (
    !(Box as unknown) ||
    !(Stack as unknown) ||
    !(Text as unknown) ||
    !(List as unknown) ||
    !(ScrollArea as unknown)
  )
    return null

  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: 'var(--space-3)',
      }}
    >
      <Stack direction="horizontal" align="center" style={{ marginBottom: 'var(--space-3)' }}>
        <Heading size="lg">Downloads & History</Heading>
      </Stack>

      <ScrollArea style={{ flex: 1 }}>
        {combinedList.length === 0 ? (
          EmptyState && <EmptyState message="No downloads yet. Search for a video to start." />
        ) : (
          <List>
            {combinedList.map((item, idx) => {
              const isActive = idx === downloadSelectedIndex
              const isRunning = item.status === 'running'
              const isDone = item.status === 'done'
              const { variant: badgeVariant, text: badgeText } = getDownloadBadge(item)

              return (
                <ListItem key={item.jobId} active={isActive}>
                  <ListItemBody style={{ gap: 'var(--space-3)', alignItems: 'center' }}>
                    {MediaPreview && (
                      <MediaPreview
                        thumbnail={item.thumbnail}
                        title={item.title}
                        uploader={item.uploader}
                        duration={item.duration}
                        size="sm"
                        badge={Badge && <Badge variant={badgeVariant}>{badgeText}</Badge>}
                        progress={isRunning ? item.progress : null}
                        footerText={
                          isDone && item.outputPath ? `Saved to: ${item.outputPath}` : null
                        }
                      />
                    )}
                  </ListItemBody>
                  <ListItemActions style={{ gap: 'var(--space-2)' }}>
                    {isDone && (
                      <Stack direction="horizontal" gap="var(--space-2)">
                        <Text size="xs" variant="muted">
                          [↵] Open Video
                        </Text>
                        <Text size="xs" variant="muted">
                          [⇧↵] Open Folder
                        </Text>
                      </Stack>
                    )}
                  </ListItemActions>
                </ListItem>
              )
            })}
          </List>
        )}
      </ScrollArea>
    </Box>
  )
}
