---
title: Installation
---

# Installation

## Quick install

Paste one line in a terminal. The script detects your OS, downloads the right package, and sets up the desktop entry.

```bash
curl -fsSL https://raw.githubusercontent.com/nuxy/nuxy/main/install.sh | bash
```

Or with `wget`:

```bash
wget -qO- https://raw.githubusercontent.com/nuxy/nuxy/main/install.sh | bash
```

After installation, bind a global shortcut in your desktop environment to `nuxy toggle` to summon Nuxy from anywhere.

---

## Platform packages

### Linux — AppImage (any distro)

Download from the [releases page](https://github.com/nuxy/nuxy/releases), then:

```bash
chmod +x Nuxy-*.AppImage
./Nuxy-*.AppImage
```

For desktop integration (launcher icon, `nuxy` command), let the install script handle it, or follow the [manual steps](#manual-desktop-entry) below.

### Linux — Debian / Ubuntu (.deb)

```bash
# Download the .deb for your architecture (amd64 or arm64)
sudo apt install ./nuxy_*.deb
```

The package installs Nuxy to `/opt/nuxy`, creates `/usr/bin/nuxy`, and registers the `.desktop` entry automatically.

> AppImage and `.deb` are the only Linux targets currently produced by this repo's
> `electron-builder` config (`src/electron-builder.yml`). There is no official Arch/AUR,
> rpm, snap, or flatpak package — see
> [Linux Desktop Integration](/guide/linux-desktop-integration) for build-from-source,
> manual install, and GNOME/KDE-specific setup (autostart, global shortcuts, tray
> caveats).

### macOS

Download `Nuxy-*.dmg` from the [releases page](https://github.com/nuxy/nuxy/releases), open it, and drag **Nuxy.app** to `/Applications`.

### Windows

Download `Nuxy Setup *.exe` from the [releases page](https://github.com/nuxy/nuxy/releases) and run the installer. It adds Nuxy to the Start menu and optionally to the system tray.

---

## Manual desktop entry

For AppImage installs where the quick-install script wasn't used, create `~/.local/share/applications/nuxy.desktop`:

```ini
[Desktop Entry]
Name=Nuxy
Comment=Nuxy Spotlight Launcher
Exec=/home/YOUR_USER/.local/share/nuxy/nuxy.sh
Icon=utilities-terminal
Terminal=false
Type=Application
Categories=Utility;
Keywords=launcher;spotlight;search;
StartupNotify=false
StartupWMClass=nuxy
```

Replace the `Exec` path with wherever you placed `nuxy.sh`, then refresh:

```bash
update-desktop-database ~/.local/share/applications
```

---

## Global hotkey

Nuxy is most useful when bound to a system-wide shortcut. It does not register a hotkey itself — configure one in your DE or compositor.

**GNOME** — Settings → Keyboard → Custom Shortcuts → add `nuxy toggle`. GNOME has no
generic global-accelerator API for arbitrary apps, so Custom Shortcuts is the
supported workaround — see [Linux Desktop Integration](/guide/linux-desktop-integration#gnome)
for the full walkthrough.

**KDE Plasma** — System Settings → Shortcuts → Custom Shortcuts → add command `nuxy toggle`.
KDE supports binding native global shortcuts to arbitrary commands directly — see
[Linux Desktop Integration](/guide/linux-desktop-integration#kde-plasma).

**Hyprland / Sway / i3** — add to your config:

```
# Hyprland
bind = SUPER, Space, exec, nuxy toggle

# i3 / Sway
bindsym $mod+space exec nuxy toggle
```

**macOS** — use Automator (Run Shell Script: `nuxy toggle`) or a tool like Hammerspoon/Karabiner.

---

## Runtime directories

After first launch Nuxy creates:

```
~/.nxy/
  nuxyconfig              # key=value settings (auto-created)
  extensions/             # bundled + user-installed extensions
  data/                   # per-extension storage (chrooted)
  themes/                 # user theme JSON files
```

See [Configuration](/guide/configuration) for all `nuxyconfig` options.

---

## Installing third-party extensions

1. Create a folder under `~/.nxy/extensions/`:

   ```bash
   mkdir -p ~/.nxy/extensions/com.example.my-tool
   ```

2. Add `manifest.json`, `backend.js`, and optionally `frontend.js`.

3. Restart Nuxy — the scanner picks up new extensions on launch.

See [Building an Extension](/extensions/first-extension) for the full guide.

---

## Development install

To run from source:

```bash
git clone https://github.com/nuxy/nuxy
cd nuxy
pnpm install
pnpm dev
```

`pnpm dev` builds `ui-default`, syncs bundled extensions to `~/.nxy/extensions/`, starts the Vite renderer with HMR, and launches Electron.

```bash
pnpm build      # tests + compile
pnpm package    # electron-builder distributable (release/)
```

::: tip Logging
`LOG_LEVEL=silly pnpm dev` — levels: `silly` · `info` · `warn` · `error`
:::

---

## Next steps

- [Configuration](/guide/configuration) — `nuxyconfig` reference
- [Architecture](/guide/architecture) — how Nuxy is structured
- [Your First Extension](/extensions/first-extension) — build your own tool
