---
title: Testing Strategy
---

# Testing Strategy

## 1. Multi-Tiered Quality Assurance

Given the architectural separation between the Web Components frontend, the Context Bridge, and the Electron Backend, testing must be isolated to prevent brittle integration tests while still ensuring end-to-end functionality.

## 2. Unit Testing (Vitest)

Vitest is selected over Jest due to its native Vite integration. Kernel unit tests live next to the Electron sources:

```bash
pnpm test          # from repo root (runs src/electron/**/*.test.ts)
pnpm -C src test:watch
```

Current coverage (`src/electron/`):

- `storage-path.test.ts` — chroot path traversal
- `protocol-resolve.test.ts` — `nuxy-ext://` resolution and traversal blocks
- `ipc-validate.test.ts` — kernel channel and extension id validation
- `registry.test.ts` — manifest id ↔ folder mapping

### 2.1 Backend Services

Test pure logic (e.g., Cryptography, File string parsing) in isolation. Mock the `CoreContext` completely.

```typescript
// electron/storage-path.test.ts
import { describe, it, expect } from 'vitest'
import { resolveStoragePath } from './storage-path.js'

describe('resolveStoragePath', () => {
  it('blocks parent traversal', () => {
    expect(() =>
      resolveStoragePath('/home/user/.nuxy/data/com.nuxy.test', '../other/secret.json')
    ).toThrow(/Path traversal/)
  })
})
```

### 2.2 Extension Controller Tests

Test controller classes directly with a mocked `window.core.ipc`. No DOM or framework needed.

```typescript
// extensions/notes/nuxy-tool-notes.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NotesController } from './notes-controller'

// Mock the global IPC
;(globalThis as any).window = {
  core: { ipc: { invoke: vi.fn().mockResolvedValue({ success: true, data: [] }) } },
}

describe('NotesController', () => {
  let ctrl: NotesController
  const onUpdate = vi.fn()

  beforeEach(() => {
    ctrl = new NotesController(onUpdate)
  })

  it('initializes empty', async () => {
    await ctrl.init()
    expect(ctrl.getNotes()).toEqual([])
    expect(onUpdate).toHaveBeenCalled()
  })
})
```

## 3. End-to-End Testing (Playwright)

For E2E, Playwright officially supports Electron. This tests the actual compiled application.

```typescript
// test/e2e.test.ts
import { test, expect, _electron as electron } from '@playwright/test'

test('App boots and renders Launcher', async () => {
  const electronApp = await electron.launch({ args: ['.'] })

  // Get the first window that the app opens
  const window = await electronApp.firstWindow()

  // Expect Shadcn search bar to be visible
  await expect(window.locator('input[placeholder="Search apps..."]')).toBeVisible()

  await electronApp.close()
})
```

---

**See also:** [Deployment](/design/deployment) · [Testing Extensions](/extensions/testing)

---

## Related Documents

| Topic                   | Document                                           | Notes                                            |
| ----------------------- | -------------------------------------------------- | ------------------------------------------------ |
| Extension testing guide | [Testing Extensions](/extensions/testing)          | Backend mocks, element tests, and Playwright e2e |
| Development guide §9    | [Development Guide](/extensions/development-guide) | Mandatory testing requirements for extensions    |
