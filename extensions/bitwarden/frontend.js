const EXT_ID = 'com.nuxy.bitwarden'
const { useState, useEffect, useRef, useCallback } = React

export default function BitwardenView() {
  const { List, ListItem, ListItemBody, ListItemText, ListItemMeta, ListItemActions, Button, EmptyState, Input } =
    window.UI || {}

  const [status, setStatus] = useState(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [copiedId, setCopiedId] = useState(null)
  const debounceRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    window.core?.ipc?.invoke(EXT_ID, 'bw:status').then(setStatus).catch(() => setStatus({ backend: 'none' }))
    inputRef.current?.focus()
  }, [])

  const search = useCallback((q) => {
    if (!window.core?.ipc?.invoke) return
    window.core.ipc.invoke(EXT_ID, 'bw:search', { query: q }).then(setResults).catch(() => setResults([]))
  }, [])

  const handleQueryChange = (e) => {
    const q = e.target.value
    setQuery(q)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q), 200)
  }

  const flash = (id) => {
    setCopiedId(id)
    setTimeout(() => setCopiedId((prev) => (prev === id ? null : prev)), 1800)
  }

  const copyPassword = (item) => {
    window.core?.ipc?.invoke(EXT_ID, 'bw:copyPassword', item).then(() => flash(`${item.id}-pw`)).catch(console.error)
  }

  const copyUsername = (item) => {
    window.core?.ipc?.invoke(EXT_ID, 'bw:copyUsername', item).then(() => flash(`${item.id}-un`)).catch(console.error)
  }

  const copyTotp = (item) => {
    window.core?.ipc?.invoke(EXT_ID, 'bw:getTotp', item)
      .then(({ code }) => window.core.ipc.invoke(EXT_ID, 'bw:copyTotp', { code }))
      .then(() => flash(`${item.id}-otp`))
      .catch(console.error)
  }

  if (status?.backend === 'none') {
    return (
      <div style={{ padding: '16px', fontSize: '13px', lineHeight: 1.6 }}>
        <strong>Bitwarden CLI not found.</strong>
        <p style={{ opacity: 0.75, marginTop: '8px' }}>
          Install <code>rbw</code> (recommended) or the official <code>bw</code> CLI:
        </p>
        <ul style={{ opacity: 0.75, paddingLeft: '18px' }}>
          <li>
            <code>rbw</code>: <a href="https://github.com/doy/rbw">github.com/doy/rbw</a>
          </li>
          <li>
            <code>bw</code>: <a href="https://bitwarden.com/help/cli/">bitwarden.com/help/cli</a>
          </li>
        </ul>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ padding: '8px 12px' }}>
        {Input ? (
          <Input ref={inputRef} value={query} onChange={handleQueryChange} placeholder="Search vault…" autoFocus />
        ) : (
          <input
            ref={inputRef}
            value={query}
            onChange={handleQueryChange}
            placeholder="Search vault…"
            autoFocus
            style={{ width: '100%', padding: '6px 8px', boxSizing: 'border-box' }}
          />
        )}
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
        {List ? (
          <List>
            {results.length === 0 ? (
              <EmptyState message={query ? 'No matches.' : 'Type to search your vault.'} />
            ) : (
              results.map((item) => (
                <ListItem key={item.id}>
                  <ListItemBody>
                    <ListItemText>{item.name}</ListItemText>
                    <ListItemMeta>{item.username}</ListItemMeta>
                  </ListItemBody>
                  <ListItemActions>
                    <Button onClick={() => copyPassword(item)}>
                      {copiedId === `${item.id}-pw` ? 'Copied!' : 'Copy Password'}
                    </Button>
                    <Button onClick={() => copyUsername(item)}>
                      {copiedId === `${item.id}-un` ? 'Copied!' : 'Copy Username'}
                    </Button>
                    <Button onClick={() => copyTotp(item)}>
                      {copiedId === `${item.id}-otp` ? 'Copied!' : 'Copy TOTP'}
                    </Button>
                  </ListItemActions>
                </ListItem>
              ))
            )}
          </List>
        ) : null}
      </div>
    </div>
  )
}
