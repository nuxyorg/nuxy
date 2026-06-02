# Glassmorphism

> A frosted-glass visual theme for Nuxy with translucent surfaces and soft color tokens.

**Type:** `theme`  
**Version:** 1.0.0  
**ID:** `com.nuxy.theme-glassmorphism`  
**Permissions:** None

---

## Overview

Glassmorphism is a theme extension that gives Nuxy a translucent, frosted-glass aesthetic. The base window background is a semi-transparent dark surface (`rgba(20, 25, 35, 0.45)`), which lets the desktop behind the window show through. The color palette pairs muted blues and teals for syntax tokens with a compact spacing scale that keeps the UI dense and readable.

---

## Extension Type

### `theme`
Supplies a set of CSS custom-property values that replace the active visual theme. No backend worker runs. Activated by setting `theme = glassmorphism` in `~/.nuxy/nuxyconfig`.

---

## Activation

Add the following line to `~/.nuxy/nuxyconfig`:

```
theme = glassmorphism
```

Nuxy hot-reloads the config file, so the theme takes effect immediately without restarting.

Alternatively, select the theme from the **Settings** tool's theme picker dropdown.

---

## Design Tokens

The theme overrides the following token groups:

**Spacing scale** — compact 4 px base unit:

| Token | Value |
|-------|-------|
| `space-px` | `1px` |
| `space-0` | `2px` |
| `space-1` | `4px` |
| `space-2` | `6px` |
| `space-3` | `8px` |
| `space-4` | `12px` |
| `space-5` | `16px` |
| `space-6` | `32px` |

**Typography scale:**

| Token | Value |
|-------|-------|
| `font-xs` | `10px` |
| `font-sm` | `12px` |
| `font-md` | `14px` |
| `font-body` | `15px` |
| `font-lg` | `16px` |
| `font-xl` | `18px` |

**Border radius:**

| Token | Value |
|-------|-------|
| `radius-sm` | `4px` |
| `radius-md` | `6px` |
| `radius-lg` | `8px` |
| `radius-xl` | `12px` |

**Color palette highlights:**

| Role | Value |
|------|-------|
| `bg-base` | `rgba(20, 25, 35, 0.45)` — semi-transparent dark base |
| `syntax-keyword` | `#6fafe0` — soft blue |
| `syntax-function` | `#6ee9d0` — teal |
| `syntax-operator` | `#86e6f2` — cyan |
| `syntax-tag` | `#f07c9a` — pink |
| `syntax-constant` | `#f0a050` — amber |
| `scrollbar-thumb` | `rgba(255, 255, 255, 0.15)` |

---

## Platform & Environment

| Platform | Supported | Notes |
|----------|-----------|-------|
| Linux (X11) | Yes | Translucency requires compositor support (e.g. picom, KWin, Mutter) |
| Linux (Wayland) | Yes | Translucency works natively on most Wayland compositors |
| macOS | Yes | |

For the frosted-glass effect to be visible, the Nuxy window must have a transparent background enabled and a compositor must be running.

---

## Manifest Reference

```json
{
  "id": "com.nuxy.theme-glassmorphism",
  "name": "Glassmorphism",
  "version": "1.0.0",
  "type": "theme",
  "permissions": [],
  "entry": {
    "theme": "theme.json"
  }
}
```
