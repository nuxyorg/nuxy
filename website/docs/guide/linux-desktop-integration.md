---
title: Linux Desktop Integration
---

# Linux Desktop Integration

This page goes deeper than [Installation](/guide/installation) for Linux users: concrete
commands for every install method, and how autostart, global shortcuts, and tray
behavior differ between GNOME and KDE Plasma.

::: tip Runtime directory
Nuxy's user data lives at **`~/.nxy/`** (`nuxyconfig`, `extensions/`, `data/`). Some
older docs/notes refer to `~/.nuxy/` — that path is stale; the code uses `~/.nxy/`
(see `src/electron/config/paths.ts`). If you're following an older guide, use `~/.nxy/`.
:::

## Installation scenarios

Nuxy's Linux builds are produced by `electron-builder` with two targets only —
**AppImage** and **deb** (see `src/electron-builder.yml`). There is no official rpm,
snap, or flatpak package; if you see one referenced elsewhere, it isn't built by this
repo.

### AppImage

Works on any distro, no installation required.

```bash
chmod +x Nuxy-*.AppImage
./Nuxy-*.AppImage
```

By default this runs Nuxy without adding a launcher entry. To integrate it into your
application menu:

- **appimaged** (daemon) — watches well-known directories and automatically registers
  a desktop entry + icon for any AppImage placed there:

  ```bash
  mkdir -p ~/Applications
  mv Nuxy-*.AppImage ~/Applications/
  ```

- **AppImageLauncher** — prompts to integrate the AppImage the first time you double-click
  or run it, copying it into `~/.local/bin` (or similar) and registering a `.desktop` file.

If you'd rather not install either helper, follow [Manual install](#manual-install)
below and point `Exec` at the AppImage directly.

### .deb (Debian / Ubuntu)

```bash
sudo dpkg -i nuxy_*.deb
```

If `dpkg` reports missing dependencies, resolve them with:

```bash
sudo apt --fix-broken install
```

This installs the `.desktop` entry and icon automatically — no manual steps needed.

### Building from source

For development or to package your own build, see the root `CLAUDE.md` command
reference. The short version:

```bash
git clone https://github.com/nuxy/nuxy
cd nuxy
pnpm install
pnpm build      # builds ui-default, runs tests, compiles renderer + Electron main
pnpm package    # produces AppImage + deb under release/ via electron-builder
```

`pnpm package` runs `pnpm -C src dist`, which invokes `electron-builder` using
`src/electron-builder.yml`. Output lands in `release/`, including an unpacked
`linux-unpacked/` directory alongside the AppImage and deb.

### Manual install (from `linux-unpacked/`)

If you only want the unpacked app directory (e.g. to run from a custom location
without an installer), use the `linux-unpacked/` output from `pnpm package`, or
extract a deb without installing it:

```bash
mkdir nuxy-extracted && cd nuxy-extracted
dpkg-deb -x ../nuxy_*.deb .
# binary now at ./opt/nuxy/nuxy (or similar, check `usr/bin` symlink target)
```

Then create a desktop entry by hand. Save as `~/.local/share/applications/nuxy.desktop`:

```ini
[Desktop Entry]
Name=Nuxy
Comment=Nuxy Spotlight Launcher
Exec=/path/to/nuxy-extracted/opt/nuxy/nuxy
Icon=nuxy
Terminal=false
Type=Application
Categories=Utility;
Keywords=launcher;spotlight;search;
StartupNotify=false
StartupWMClass=nuxy
```

Place an icon (any size, PNG or SVG) at:

```bash
mkdir -p ~/.local/share/icons/hicolor/256x256/apps
cp /path/to/nuxy-extracted/nuxy.png ~/.local/share/icons/hicolor/256x256/apps/nuxy.png
```

Then refresh the desktop database and icon cache:

```bash
update-desktop-database ~/.local/share/applications
gtk-update-icon-cache ~/.local/share/icons/hicolor
```

### From the terminal

Once Nuxy is running, `nuxy.sh` (or the `nuxy` command from a packaged install)
talks to the running instance over a UNIX socket rather than launching a new process:

```bash
nuxy.sh toggle   # show if hidden, hide if visible
nuxy.sh show     # bring to front / re-center, even if already visible
```

Under the hood this connects to the control socket (`/tmp/nuxy.sock` by default,
see `src/electron/bootstrap/main.ts`) and writes the literal string `toggle` or
`show`. You can talk to the socket directly without `nuxy.sh`, e.g. for scripting a
custom keybinding:

```bash
echo -n "toggle" | socat - UNIX-CONNECT:/tmp/nuxy.sock
```

If the socket file doesn't exist, Nuxy isn't running; `nuxy.sh` with no arguments
falls back to starting it (`pnpm dev` in a source checkout).


