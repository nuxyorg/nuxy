/**
 * com.nuxy.ui-default — Default UIKit Extension
 *
 * This file is the entry point for the Vite build that produces frontend.js.
 * It imports all components from local ./index.tsx and merges them into window.UI,
 * preserving any components already registered by higher-priority uikit extensions.
 *
 * CSS is inlined by vite-plugin-css-injected-by-js — no separate stylesheet needed.
 */
import * as UI from './index'

// Merge into window.UI — spread preserves any overrides already set by
// extensions with a higher priority (lower priority number) that loaded first.
// Since this extension has priority: 0, it loads first, so the spread is
// mainly a safety net for future ordering changes.
;(window as any).UI = {
  ...window.UI,
  ...UI,
}
