/**
 * com.nuxy.ui-default — Default UIKit Extension
 *
 * Entry point for the Vite build that produces frontend.js.
 * Merges all components into window.UI, preserving any components
 * already registered by higher-priority uikit extensions.
 *
 * CSS is inlined by the inline-css plugin — no separate stylesheet needed.
 */
import * as UI from './index'

const merged = {
  ...window.UI,
  ...UI,
}
;(window as any).UI = merged
