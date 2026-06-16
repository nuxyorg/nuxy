import { vi } from 'vitest'
import type { ReactiveControllerHost } from '@nuxyorg/core'

/**
 * Creates a minimal ReactiveControllerHost mock for controller unit tests.
 * Shared across command-palette, navigation, query, tool, and provider controller tests.
 */
export function makeHost(): ReactiveControllerHost & { requestUpdate: ReturnType<typeof vi.fn> } {
  return {
    addController: vi.fn(),
    removeController: vi.fn(),
    requestUpdate: vi.fn(),
    updateComplete: Promise.resolve(true),
  }
}
