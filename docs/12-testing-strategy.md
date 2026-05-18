# 12 - Testing Strategy

## 1. Multi-Tiered Quality Assurance
Given the architectural separation between the React Frontend, the Context Bridge, and the Electron Backend, testing must be isolated to prevent brittle integration tests while still ensuring end-to-end functionality.

## 2. Unit Testing (Vitest)

Vitest is selected over Jest due to its native Vite integration, meaning the same `vite.config.ts` handles both building and testing without complex transform steps.

### 2.1 Backend Services
Test pure logic (e.g., Cryptography, File string parsing) in isolation. Mock the `CoreContext` completely.

```typescript
// test/vault.test.ts
import { expect, test, vi } from 'vitest';
import { VaultService } from '../src/modules/vault/backend/service';

test('Vault Encrypts and Decrypts correctly', () => {
  const service = new VaultService();
  const raw = { password: 'secret123' };
  
  const encrypted = service.encrypt(raw, 'master-key');
  expect(encrypted).not.toEqual(raw);
  
  const decrypted = service.decrypt(encrypted, 'master-key');
  expect(decrypted).toEqual(raw);
});
```

### 2.2 React Custom Hooks
Use `@testing-library/react-hooks` (or native React 18 testing utils) to test the UI state logic while mocking the global IPC object.

```typescript
// test/useNotes.test.ts
import { renderHook, act } from '@testing-library/react';
import { useNotes } from '../src/modules/notes/frontend/useNotes';

// Mock the global IPC
window.core = {
  ipc: {
    invoke: vi.fn().mockResolvedValue({ success: true, data: [] })
  }
};

test('useNotes initializes empty', async () => {
  const { result } = renderHook(() => useNotes());
  expect(result.current.isLoading).toBe(true);
  
  // Wait for the mock promise to resolve
  await act(async () => {});
  
  expect(result.current.notes).toEqual([]);
  expect(result.current.isLoading).toBe(false);
});
```

## 3. End-to-End Testing (Playwright)

For E2E, Playwright officially supports Electron. This tests the actual compiled application.

```typescript
// test/e2e.test.ts
import { test, expect, _electron as electron } from '@playwright/test';

test('App boots and renders Launcher', async () => {
  const electronApp = await electron.launch({ args: ['.'] });
  
  // Get the first window that the app opens
  const window = await electronApp.firstWindow();
  
  // Expect Shadcn search bar to be visible
  await expect(window.locator('input[placeholder="Search apps..."]')).toBeVisible();
  
  await electronApp.close();
});
```

---

**Next Step:** [Deployment](./13-deployment.md) | **Previous:** [Performance](./11-performance.md)
