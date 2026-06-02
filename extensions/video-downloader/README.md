# Video Downloader

> Download videos from any yt-dlp-supported site by pasting a URL and choosing a format.

**Type:** `tool`  
**Version:** 1.0.0  
**ID:** `com.nuxy.video-downloader`  
**Permissions:** `storage` `shell` `fs`

---

## Overview

Video Downloader lets you paste any video URL into the Nuxy omnibar, inspect all available formats (resolution, codec, file size), and start a download with a single keypress. Downloads run in the background via `yt-dlp` and show live progress. A persistent Downloads & History tab tracks every completed download; you can open the file or its containing folder directly from the list. The extension requires `yt-dlp` to be installed on the system.

---

## Extension Type

### `tool`
Appears in the Nuxy tool list. The user activates it by selecting **Video Downloader** from the shell, then pastes a video URL into the omnibar and presses `Enter` to fetch formats.

---

## Usage

### Activation

Select **Video Downloader** from the tool list. Paste a video URL (e.g. a YouTube link) into the omnibar and press `Enter` to fetch available formats. Use `↑` / `↓` to navigate the format list, then press `Enter` again on the desired format to start the download.

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `↑` `↓` | Navigate the format list or the Downloads & History list |
| `Enter` | Fetch formats (when URL is entered) / Start download (when a format is selected) / Open video file (in Downloads tab) / Cancel running download (in Downloads tab) |
| `⇧ Enter` | Open the containing folder of a completed download (in Downloads tab) |
| `Tab` | Cycle to the next format tab (Recommended → Video & Audio → Audio Only → Video Only → All Streams → Downloads) |
| `←` | Move focus to the left tab panel |
| `Esc` | Return to the format tabs from the Downloads view |

### Examples

**Example 1 — Download best quality:**  
Paste `https://www.youtube.com/watch?v=...` and press `Enter`. Select **Best Quality** from the Recommended tab and press `Enter` → download starts and the view switches to Downloads.

**Example 2 — Audio-only download:**  
Switch to the **Audio Only** tab with `Tab`, select **Highest audio quality** and press `Enter` to save an M4A file.

**Example 3 — Specific resolution:**  
Switch to the **Video & Audio** tab, navigate to the `1080p resolution` entry, and press `Enter`.

**Example 4 — Open a completed download:**  
Navigate to the **Downloads** tab, highlight the completed item, and press `Enter` to open the file in the default media player, or `⇧ Enter` to open the folder.

---

## Settings

Settings are accessible from the Nuxy **Settings** tool.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `downloadPath` | location | `~/Downloads` | Folder where downloaded videos are saved |
| `format` | select | `mp4` | Preferred container format: `mp4`, `webm`, `mkv`, or `best` |
| `audioOnly` | toggle | `false` | Download the audio track only |
| `subtitles` | toggle | `false` | Download subtitles alongside the video |

---

## Permissions

| Permission | Used for |
|------------|----------|
| `storage` | Persisting download history (`history.json`) and the configured output directory (`config.json`) |
| `shell` | Spawning `yt-dlp` to fetch metadata and stream download progress |
| `fs` | Resolving the home directory to build the default output path |

---

## Localization

| Locale | Language |
|--------|----------|
| `en` | English (default) |
| `tr` | Turkish |

To add a new locale, create `locales/<code>.json` and add the code to `locales.supported` in `manifest.json`.

---

## Platform & Environment

| Platform | Supported | Notes |
|----------|-----------|-------|
| Linux (X11) | Yes | |
| Linux (Wayland) | Yes | |
| macOS | Yes | |

Requires `yt-dlp` to be available on `$PATH`. `ffmpeg` is needed for format merging (e.g. best video + best audio streams).

---

## Requirements

| Requirement | Minimum version | Install |
|-------------|-----------------|---------|
| `yt-dlp` | latest | `pip install yt-dlp` / `brew install yt-dlp` / `pacman -S yt-dlp` |
| `ffmpeg` | 4.x | `sudo apt install ffmpeg` / `brew install ffmpeg` / `pacman -S ffmpeg` |

If `yt-dlp` is not found on startup, the extension logs a warning and the frontend shows installation instructions with commands for pip, Homebrew, and pacman.

---

## Manifest Reference

```json
{
  "id": "com.nuxy.video-downloader",
  "name": "Video Downloader",
  "version": "1.0.0",
  "type": "tool",
  "icon": "video",
  "permissions": ["storage", "shell", "fs"],
  "capabilities": {
    "callable": false,
    "caller": false
  },
  "locales": {
    "default": "en",
    "supported": ["en", "tr"]
  },
  "entry": {
    "backend": "backend.ts",
    "frontend": "frontend.tsx",
    "settings": "settings.json"
  }
}
```
