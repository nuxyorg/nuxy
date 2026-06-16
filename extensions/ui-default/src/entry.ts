/**
 * com.nuxy.ui-default — Default UIKit Extension
 *
 * Entry point for the Vite build that produces frontend.js.
 * Registers all Lit custom elements and exposes hooks/utils on window.UI.
 *
 * CSS is inlined by the inline-css plugin — no separate stylesheet needed.
 */
import './styles/base.css'
import './components/ToolHost/index.css'
import './register-components.ts'
import * as UI from './index.ts'

const merged = {
  ...window.UI,
  ...UI,
}
;(window as any).UI = merged
