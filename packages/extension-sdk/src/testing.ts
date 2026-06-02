import { vi } from 'vitest'
import type { CoreContext } from '@nuxy/core'

/**
 * Creates a mocked `CoreContext` for use in Vitest tests.
 *
 * @param overrides Optional overrides for specific nested properties.
 */
export function createMockCore(
  overrides?: any
): {
  core: CoreContext
  handlers: Record<string, (payload?: any) => Promise<any> | any>
} {
  const handlers: Record<string, (payload?: any) => Promise<any> | any> = {}

  const core = {
    registry: {
      registerTool: vi.fn(),
      registerProvider: vi.fn(),
      registerOrchestrator: vi.fn(),
      registerTheme: vi.fn(),
      registerIconPack: vi.fn(),
      getCallableTools: vi.fn().mockReturnValue([]),
    },
    ipc: {
      handle: (ch: string, fn: (payload?: any) => Promise<any> | any) => {
        handlers[ch] = fn
      },
      broadcast: vi.fn(),
    },
    storage: {
      read: vi.fn().mockResolvedValue(null),
      write: vi.fn().mockResolvedValue(undefined),
    },
    clipboard: {
      readText: vi.fn(),
      writeText: vi.fn(),
      readImage: vi.fn(),
      writeImage: vi.fn(),
      writeFiles: vi.fn(),
    },
    fs: {
      fileExists: vi.fn().mockResolvedValue(false),
      readDir: vi.fn(),
      readFile: vi.fn(),
      readFileBinary: vi.fn(),
      writeFile: vi.fn(),
      mkdir: vi.fn(),
      rename: vi.fn(),
      rm: vi.fn(),
      stat: vi.fn(),
      homedir: vi.fn().mockReturnValue('/home/user'),
      tmpdir: vi.fn().mockReturnValue('/tmp'),
    },
    db: { open: vi.fn() },
    shell: { open: vi.fn(), exec: vi.fn(), spawn: vi.fn() },
    media: { getNowPlaying: vi.fn() },
    extensions: { invoke: vi.fn() },
    logger: {
      silly: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
    config: {
      get: vi.fn(),
    },
    settings: {
      read: vi.fn().mockResolvedValue(null),
      write: vi.fn().mockResolvedValue(undefined),
    },
  } as any

  if (overrides) {
    for (const key of Object.keys(overrides)) {
      if (
        typeof overrides[key] === 'object' &&
        overrides[key] !== null &&
        !Array.isArray(overrides[key])
      ) {
        core[key] = { ...core[key], ...overrides[key] }
      } else {
        core[key] = overrides[key]
      }
    }
  }

  return { core: core as CoreContext, handlers }
}
