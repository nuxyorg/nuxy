# Linux DE install/config docs + installation scenarios

## Request
Document how install/configuration/settings work under GNOME, KDE, etc., and
add examples for different installation scenarios: AppImage, .deb, building
from source, manual install, from terminal, etc.

## Plan
1. Read existing `website/docs/guide/installation.md` to see what's already
   covered (likely npm/dev workflow only) — extend, don't duplicate.
2. New/extended sections in `website/docs/guide/installation.md` or a new
   `website/docs/guide/linux-desktop-integration.md`:
   - **AppImage**: download, `chmod +x`, run; integrating with app menus via
     `appimaged`/`AppImageLauncher` if relevant to how this repo packages it
     (check `electron-builder` config for AppImage target).
   - **.deb**: `dpkg -i`, dependency resolution via `apt --fix-broken install`.
   - **Building from source**: `pnpm install && pnpm build && pnpm package`
     (already in root CLAUDE.md commands — link/restate for non-dev users).
   - **Manual install**: unpack `linux-unpacked` output, create `.desktop`
     entry, icon placement (`~/.local/share/applications/`,
     `~/.local/share/icons/`).
   - **From terminal**: headless invocation, `nuxy.sh toggle`/`show` via the
     `/tmp/nuxy.sock` control channel — cross-reference CLAUDE.md's mention
     of this.
3. **GNOME**: autostart via `~/.config/autostart/*.desktop`; global hotkey
   binding (GNOME has no global accelerator API for arbitrary apps — document
   the `gsettings`/Custom Shortcuts workaround calling `nuxy.sh toggle`);
   tray icon caveats (GNOME needs an extension like AppIndicator for tray
   icons — note if Nuxy uses `Tray`).
4. **KDE**: autostart via `~/.config/autostart/`, native global shortcuts
   support via System Settings → Shortcuts → Custom Shortcuts (KDE supports
   arbitrary app global shortcuts natively, contrast with GNOME).
5. Verify all config file paths (`~/.nuxy/nuxyconfig`, `~/.nuxy/extensions/`,
   `~/.nuxy/themes/`) against current code (`config/nuxyconfig.ts`) before
   writing — don't restate stale paths.
6. Add a short troubleshooting subsection: socket already in use, protocol
   handler not registering (relevant once #4 deeplink ships — cross-link).

## Acceptance
- New content reviewed against actual `electron-builder` targets in
  `package.json`/`electron-builder.yml` (only document targets that are
  actually built).
- Each installation method has a copy-pasteable terminal command block.
- GNOME and KDE sections each cover: autostart, global shortcut binding, tray
  icon behavior.
