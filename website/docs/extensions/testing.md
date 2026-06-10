---
title: Testing Extensions
---

# Testing Extensions

TDD is mandatory for all new extension features. Write tests first, implement until green, then run the full suite.

## Backend unit tests

Every extension with `backend.ts` must have `tests/backend.test.ts`.

Use `createMockCore` from `@nuxy/extension-sdk` — never hand-roll a mock:

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { type CoreContext, createMockCore } from '@nuxy/extension-sdk'
import { register } from '../backend.ts'

describe('my-extension backend', () => {
  let core: CoreContext
  let handlers: Record<string, (payload?: unknown) => Promise<unknown>>

  beforeEach(() => {
    ;({ core, handlers } = createMockCore())
    register(core)
  })

  it('handles myChannel', async () => {
    const result = await handlers['myChannel']({ some: 'payload' })
    expect(result).toEqual(/* expected */)
  })
})
```

Override specific mocks when needed:

```ts
;({ core, handlers } = createMockCore({
  storage: {
    read: vi.fn().mockResolvedValue([{ id: '1' }]),
  },
}))
```

### Rules

- Test every IPC handler registered in `register()`
- Test error paths (storage failure, invalid payload, etc.)
- Use `vi.spyOn` + `vi.restoreAllMocks()` for CJS modules
- Use `vi.mock` factories for ESM-only built-ins (`node:sqlite`)

## Frontend element tests

Lit tool elements can be tested with Vitest + happy-dom:

```ts
import { describe, it, expect } from 'vitest'
import './nuxy-tool-my-extension.ts'

describe('nuxy-tool-my-extension', () => {
  it('registers the custom element', () => {
    expect(customElements.get('nuxy-tool-my-extension')).toBeDefined()
  })
})
```

Place frontend tests in `tests/nuxy-tool-<name>.test.ts`.

## E2E tests

Interactive extensions should have `tests/e2e.spec.ts` using Playwright fixtures:

```ts
import { test, expect } from '../../../../src/e2e/fixtures.ts'

test('shows results when typing in omnibar', async ({ appPage }) => {
  await appPage.getByTestId('omnibar-input').fill('hello')
  await expect(appPage.getByTestId('list-item').first()).toBeVisible()
})
```

## Running tests

```bash
# All unit tests
pnpm test

# Single backend test file
pnpm -C src test -- extensions/notes/tests/backend.test.ts

# E2E for one extension (requires pnpm build first)
pnpm test:e2e notes

# All extension e2e tests
pnpm test:e2e:extensions
```

## File layout

```
extensions/my-extension/
  backend.ts
  frontend.ts
  nuxy-tool-my-extension.ts
  tests/
    backend.test.ts
    nuxy-tool-my-extension.test.ts
    e2e.spec.ts
```

## Related

- [Extension Development Guide](/extensions/development-guide) — full testing section
- [Your First Extension](/extensions/first-extension) — walkthrough with tests
