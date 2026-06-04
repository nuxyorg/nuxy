# Store

> Browse, install, update, and uninstall Nuxy extensions from a remote registry.

**Type:** `tool`  
**Version:** 1.0.0  
**ID:** `com.nuxy.store`  
**Permissions:** `storage` `network`

---

## Overview

Store is the built-in extension marketplace for Nuxy. It fetches a remote registry of available extensions, merges that catalog with the list of locally installed extensions reported by the kernel, and presents everything in a two-panel UI: a category sidebar on the left and a browsable list with a detail pane on the right. Users can install, update, and uninstall extensions without leaving the shell. Extensions that require elevated permissions (`shell`, `fs`) are flagged with a security warning in the detail pane.

---

## Extension Type

### `tool`

Appears in the Nuxy tool list. Select **Store** from the shell to open the extension browser. The omnibar search filters results across name, ID, description, and author in real time.

---

## Usage

### Activation

Select **Store** from the tool list. The extension catalog loads automatically from the configured registry URL. Use the omnibar to search, or navigate categories with `Tab`.

### Keyboard Shortcuts

| Key     | Action                                                                                    |
| ------- | ----------------------------------------------------------------------------------------- |
| `↑` `↓` | Navigate extension list                                                                   |
| `Enter` | Install selected extension (or uninstall if already installed and not a system extension) |
| `I`     | Install / update selected extension                                                       |
| `U`     | Uninstall selected extension                                                              |
| `R`     | Refresh the extension catalog                                                             |
| `Tab`   | Cycle to the next category tab                                                            |
| `←`     | Focus the category sidebar                                                                |
| `Esc`   | Return to the tool list                                                                   |

### Examples

**Example 1 — Install an extension:**
Open Store, type `clock` in the omnibar to find the Status Clock extension, navigate to it with `↓`, and press `I` to install it.

**Example 2 — Check for updates:**
Open Store and press `Tab` until the **Updates** category is active. All extensions with a newer version in the registry are shown. Navigate to one and press `Enter` to update.

**Example 3 — Uninstall:**
Switch to the **Installed** tab, select the extension you want to remove, and press `U`. System extensions (shell, settings, and bootstrap extensions) cannot be uninstalled.

---

## Settings

Settings are accessible from the Nuxy **Settings** tool.

| Key           | Type | Default                                                                       | Description                                                                                      |
| ------------- | ---- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `registryUrl` | text | `https://raw.githubusercontent.com/atagulalan/nuxy-assets/main/registry.json` | URL of the remote registry JSON file. Change this to point to a self-hosted or private registry. |

---

## Permissions

| Permission | Used for                                                                        |
| ---------- | ------------------------------------------------------------------------------- |
| `storage`  | Reading the configured registry URL from extension settings                     |
| `network`  | Fetching the remote extension registry index and downloading extension packages |

---

## Localization

| Locale | Language          |
| ------ | ----------------- |
| `en`   | English (default) |
| `tr`   | Turkish           |

To add a new locale, create `locales/<code>.json` and add the code to `locales.supported` in `manifest.json`.

---

## Platform & Environment

| Platform        | Supported | Notes |
| --------------- | --------- | ----- |
| Linux (X11)     | Yes       |       |
| Linux (Wayland) | Yes       |       |
| macOS           | Yes       |       |

Requires internet access to fetch the registry and download extension packages. Locally installed extensions that are not listed in the remote registry still appear under the **Installed** tab.

---

## Cross-Extension Integration

### This extension calls other extensions

`capabilities.caller: true` — Store proxies install and uninstall operations through the kernel extension:

- `kernel` → channel `listInstalledExtensions` — retrieves all currently loaded extensions to calculate install status and available updates
- `kernel` → channel `installExtension` — delegates the actual download and installation of a package
- `kernel` → channel `uninstallExtension` — delegates the removal of an installed extension

---

## Manifest Reference

```json
{
  "id": "com.nuxy.store",
  "name": "Store",
  "version": "1.0.0",
  "type": "tool",
  "icon": "download",
  "permissions": ["storage", "network"],
  "capabilities": {
    "callable": false,
    "caller": true
  },
  "entry": {
    "backend": "backend.ts",
    "frontend": "frontend.tsx",
    "settings": "settings.json"
  },
  "locales": {
    "default": "en",
    "supported": ["en", "tr"]
  }
}
```
