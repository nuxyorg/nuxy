const React = window.React

export function YtdlpInstallPrompt() {
  const { Alert, List, ListItem, ListItemBody, ListItemText, ListItemMeta } = window.UI || {}

  return (
    <>
      {Alert && <Alert variant="danger">yt-dlp is not installed.</Alert>}
      {List && (
        <List>
          {[
            { label: 'Install via pip', meta: 'pip install yt-dlp' },
            { label: 'Install via brew', meta: 'brew install yt-dlp' },
            { label: 'Install via pacman', meta: 'pacman -S yt-dlp' },
          ].map((item) => (
            <ListItem key={item.meta}>
              <ListItemBody>
                <ListItemText>{item.label}</ListItemText>
                <ListItemMeta>{item.meta}</ListItemMeta>
              </ListItemBody>
            </ListItem>
          ))}
        </List>
      )}
    </>
  )
}
