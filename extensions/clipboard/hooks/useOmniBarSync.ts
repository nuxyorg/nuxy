const React = window.React

export function useOmniBarSync(selectedIndex: number): void {
  React.useEffect(() => {
    const action = selectedIndex >= 0 ? 'hide' : 'show'
    window.dispatchEvent(new CustomEvent('nuxy-shell-omni-bar-control', { detail: { action } }))
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [selectedIndex])

  React.useEffect(() => {
    return () => {
      window.dispatchEvent(new CustomEvent('nuxy-shell-omni-bar-control', { detail: { action: 'show' } }))
    }
  }, [])
}
