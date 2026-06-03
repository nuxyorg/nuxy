const React = window.React

import type { Note } from '../types.ts'

interface Params {
  selected: Note | null
  recording: boolean
  editMode: boolean
  selectedIndex: number
}

export function useNotesSync({ selected, recording, editMode, selectedIndex }: Params): void {
  React.useEffect(() => {
    window.dispatchEvent(new CustomEvent('nuxy-key-hints-changed'))
  }, [selected, recording, editMode, selectedIndex])
}
