---
title: Deployment
---

# Deployment

## 1. Electron Builder Configuration

Packaging an application with native dependencies (like `node-pty` used in the AI Terminal module) requires robust configuration. Nuxy uses `electron-builder` to create installers for Linux, macOS, and Windows.

### 1.1 Key Config (`electron-builder.json5`)

```json5
{
  appId: 'com.nuxy.app',
  productName: 'Nuxy',
  directories: {
    output: 'release',
  },
  files: [
    'dist/**/*', // Renderer Build
    'dist-electron/**/*', // Main Process Build
  ],
  linux: {
    target: ['AppImage', 'deb'],
    category: 'Utility',
  },
  mac: {
    target: ['dmg'],
    hardenedRuntime: true,
    entitlements: 'build/entitlements.mac.plist', // Required for global hotkeys
  },
  win: {
    target: ['nsis'], // Standard Windows installer
  },
}
```

## 2. Continuous Integration (GitHub Actions)

A CI pipeline guarantees that code merged to `main` actually compiles on all target operating systems.

```yaml
# .github/workflows/build.yml
name: Build Electron App
on: [push, pull_request]

jobs:
  build:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, windows-latest, macos-latest]

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18

      - name: Install Dependencies
        run: npm ci

      - name: Build and Package
        run: npm run build
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }} # Required if auto-publishing to releases
```

## 3. Seamless Auto-Updates

Using `electron-updater`, Nuxy checks for updates silently in the background.

```typescript
// electron/main/updater.ts
import { autoUpdater } from 'electron-updater'
import { CoreContext } from '@core/types'

export function initializeUpdater(core: CoreContext) {
  autoUpdater.on('update-available', () => {
    core.notify('Nuxy Update', 'A new version is downloading...')
  })

  autoUpdater.on('update-downloaded', () => {
    core.notify('Nuxy Update', 'Update ready. App will restart on next launch.')
    // Can optionally call autoUpdater.quitAndInstall()
  })

  // Check once on boot, then every 24 hours
  autoUpdater.checkForUpdatesAndNotify()
  setInterval(() => autoUpdater.checkForUpdatesAndNotify(), 86400000)
}
```

---

**See also:** [Testing Strategy](/design/testing-strategy) · [Architecture Map](/design/architecture-map)
