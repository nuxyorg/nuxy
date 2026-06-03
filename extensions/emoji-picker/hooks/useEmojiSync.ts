const React = window.React

export function useEmojiSync(selectedIdx: number, focusArea: 'left' | 'right'): void {
  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [selectedIdx, focusArea])
}
