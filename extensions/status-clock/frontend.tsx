const React = window.React

import { useStatusClock } from './hooks/useStatusClock.ts'

export default function StatusClockView() {
  useStatusClock()
  return null
}
