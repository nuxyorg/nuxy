---
title: Configuration
---

# Configuration

Nuxy is configured via a plain key=value file at `~/.nuxy/nuxyconfig`. The file is created automatically on first launch with defaults. Changes to this file are detected and applied without restarting — Nuxy hot-reloads the config.

## Full Reference

### Theme

| Key | Values | Default | Description |
|---|---|---|---|
| `theme` | `dark` \| `light` \| `system` \| `<theme-name>` | `system` | Active UI theme. `system` follows OS dark/light preference. Custom theme extensions (e.g. `ocean`, `glassmorphism`) are available once installed. |

### Window Behavior

| Key | Values | Default | Description |
|---|---|---|---|
| `escAction` | `hide` \| `minimize` \| `quit` \| `none` | `hide` | What happens when Escape is pressed. |
| `blurAction` | `hide` \| `minimize` \| `quit` \| `none` | `hide` | What happens when the launcher loses focus. |
| `alwaysOnTop` | `true` \| `false` | `false` | Keep the launcher window above all other windows. |
| `showInTaskbar` | `true` \| `false` | `false` | Show the launcher in the OS taskbar / dock. |
| `showOnStartup` | `true` \| `false` | `false` | Show the launcher window immediately on startup. |

### Window Size

| Key | Values | Default | Description |
|---|---|---|---|
| `windowWidth` | integer (pixels) | `680` | Width of the launcher window in pixels. |
| `windowMaxHeight` | integer (pixels) | `480` | Maximum height before the window scrolls internally. |

### Window Position

| Key | Values | Default | Description |
|---|---|---|---|
| `windowPosition` | `center` \| `50%` \| `1/3` \| `200px` \| `"x y"` | `center` | Initial window position on the display. |

Position values:

- `center` — horizontally and vertically centered on the nearest display
- `50%` — 50% from the left edge of the nearest display
- `1/3` — one-third from the left edge
- `200px` — 200 pixels from the left edge
- `"x y"` — absolute pixel coordinates (e.g. `"100 200"`)

### Appearance

| Key | Values | Default | Description |
|---|---|---|---|
| `opacity` | `0.0`–`1.0` | `1.0` | Window opacity (0 = fully transparent, 1 = fully opaque). |

## Example Configuration

```ini
# ~/.nuxy/nuxyconfig

theme = ocean
escAction = hide
blurAction = hide
windowWidth = 720
windowMaxHeight = 520
windowPosition = center
alwaysOnTop = false
opacity = 0.97
showInTaskbar = false
showOnStartup = false
```

## Hot Reload

The config file is watched for changes using `fs.watch`. When you save `nuxyconfig`, Nuxy re-reads it and applies the new values immediately:

- Theme changes apply to the renderer via IPC
- Window size/position changes resize and reposition the window
- Behavior flags (`escAction`, `blurAction`) take effect on the next trigger

## Extension Settings

Extension-specific settings (e.g. the Ollama server URL, preferred snippet categories) are managed through the **Settings extension** (`com.nuxy.settings`), not via `nuxyconfig`. Activate the Settings extension in the launcher and navigate to the extension's settings tab.

Extension settings are stored per-extension at `~/.nuxy/extensions/<id>/ext-settings.json`.
