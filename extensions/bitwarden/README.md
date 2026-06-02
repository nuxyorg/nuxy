# Bitwarden

> Search your Bitwarden vault and copy passwords, usernames, and TOTP codes from the Nuxy launcher.

**Type:** `tool`
**Version:** 1.0.0
**ID:** `com.nuxy.bitwarden`
**Permissions:** `clipboard` `storage` `shell`

---

## Overview

Bitwarden brings your password vault into the Nuxy launcher without exposing credentials to any cloud service beyond Bitwarden's own infrastructure. It uses the `rbw` (Rust Bitwarden) CLI client as its backend and guides you through installation, account setup, and vault unlock with a step-by-step wizard. Once the vault is open, you can search by item name or username and copy passwords, usernames, or TOTP codes to the clipboard with a single keypress. Copied secrets are automatically cleared from the clipboard after a configurable timeout.

---

## Extension Type

### `tool`
Appears in the Nuxy tool list. The user activates it by selecting it from the shell, then interacts through the omnibar query and keyboard shortcuts.

---

## Usage

### Activation

Select **Bitwarden** from the tool list. On first use, a setup wizard guides you through installing `rbw`, entering your Bitwarden account e-mail, and unlocking the vault via a Pinentry dialog. Once unlocked, the vault search screen loads automatically.

### Keyboard Shortcuts

**Vault search screen:**

| Key | Action |
|-----|--------|
| `↑` `↓` | Navigate the results list |
| `Enter` | Copy the password of the selected item |
| `⇧ Enter` | Copy the username of the selected item |
| `Ctrl Enter` | Copy the TOTP code of the selected item |

**Install wizard screen:**

| Key | Action |
|-----|--------|
| `←` `→` | Switch between OS installation tabs (Arch, Debian, macOS) |
| `Enter` | Re-check whether `rbw` is now installed |

**Account configuration screen:**

| Key | Action |
|-----|--------|
| `Enter` | Save the entered e-mail address |
| `Esc` | Cancel e-mail editing |

**Lock screen:**

| Key | Action |
|-----|--------|
| `Enter` | Unlock the vault (opens Pinentry on the desktop) |

Additional actions available via the Nuxy action menu on the lock screen:

| Action | Description |
|--------|-------------|
| Sync Vault | Pull the latest vault data from Bitwarden servers |
| Refresh Status | Re-check vault lock state |
| Edit Email | Change the configured account e-mail |

### Examples

**Example 1 — Copy a password:**
Type `github` → select the GitHub entry → press `Enter`. The password is on your clipboard.

**Example 2 — Copy a username:**
Navigate to an entry and press `⇧ Enter` to copy the username instead of the password.

**Example 3 — Copy a TOTP code:**
Navigate to an entry that has TOTP configured and press `Ctrl Enter` to copy the current one-time code.

---

## Settings

Settings are accessible from the Nuxy **Settings** tool.

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `clipboardClearDelaySec` | select | `30` | How long passwords, usernames, and TOTP codes remain on the clipboard before being cleared (`0` = never clear; options: 10 s, 15 s, 30 s, 1 min, 2 min) |

---

## Permissions

| Permission | Used for |
|------------|----------|
| `clipboard` | Writing passwords, usernames, and TOTP codes to the clipboard; clearing the clipboard after the timeout |
| `storage` | Reading and persisting extension settings |
| `shell` | Running `rbw` CLI commands (`list`, `get`, `unlock`, `sync`, `config`) |

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
| Linux (Wayland) | Partial | Clipboard write works; Pinentry dialog appearance depends on the compositor |
| macOS | Yes | `rbw` available via Homebrew |

**Desktop environments:** Works on any DE. Vault unlock requires `pinentry` to be installed alongside `rbw` so that a GUI password prompt can appear.

---

## Requirements

| Requirement | Minimum version | Install |
|-------------|-----------------|---------|
| `rbw` | latest | Arch: `sudo pacman -S rbw`; Debian/Ubuntu: `sudo apt install rbw`; macOS: `brew install rbw` |
| `pinentry` | any | Arch: `sudo pacman -S pinentry`; typically bundled on other platforms |

`bw` (the official Bitwarden CLI) is detected as a fallback, but only `rbw` supports all vault operations (unlock, sync, TOTP). Using `bw` alone will result in a limited experience.

---

## IPC Channels

| Channel | Payload | Returns | Description |
|---------|---------|---------|-------------|
| `bw:status` | — | `BitwardenStatus` | Check installation, configuration, and lock state |
| `bw:setEmail` | `{ email: string }` | `{ ok: boolean }` | Configure the `rbw` account e-mail |
| `bw:unlock` | — | `{ ok: boolean }` | Unlock the vault (triggers Pinentry) |
| `bw:sync` | — | `{ ok: boolean }` | Pull latest vault data from Bitwarden servers |
| `bw:search` | `{ query: string }` | `BitwardenItem[]` | Search vault items by name or username |
| `bw:getPassword` | `BitwardenItem` | `{ password: string }` | Retrieve the plaintext password for an item |
| `bw:getTotp` | `{ name: string }` | `{ code: string }` | Retrieve the current TOTP code for an item |
| `bw:copyPassword` | `BitwardenItem` | `void` | Copy password to clipboard and schedule clearing |
| `bw:copyUsername` | `BitwardenItem` | `void` | Copy username to clipboard and schedule clearing |
| `bw:copyTotp` | `{ code: string }` | `void` | Copy a TOTP code to clipboard and schedule clearing |
| `bw:copyText` | `{ text: string }` | `void` | Copy arbitrary text to clipboard (no scheduled clearing) |

---

## Manifest Reference

```json
{
  "id": "com.nuxy.bitwarden",
  "name": "Bitwarden",
  "version": "1.0.0",
  "type": "tool",
  "icon": "bitwarden",
  "permissions": ["clipboard", "storage", "shell"],
  "capabilities": {
    "callable": false,
    "caller": false
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
