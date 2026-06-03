const React = window.React

import { useAmbientSound } from './hooks/useAmbientSound.ts'

export default function AmbientSoundView() {
  useAmbientSound()
  return null
}
