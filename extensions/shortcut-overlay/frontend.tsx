const React = window.React

import { useShortcutOverlay } from './hooks/useShortcutOverlay.ts'

export default function ShortcutOverlayView() {
  useShortcutOverlay()
  return null
}
