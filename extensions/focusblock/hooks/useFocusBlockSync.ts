const React = window.React

export function useFocusBlockSync(active: boolean, selectedIndex: number): void {
  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [active, selectedIndex])
}
