import { describe, it, expect } from 'vitest'
import { findDeeplinkUrlInArgv } from './argv.js'

describe('findDeeplinkUrlInArgv', () => {
  it('finds a bare nuxy:// argument', () => {
    const argv = ['/usr/bin/nuxy', 'nuxy://settings/extension/nyaa']
    expect(findDeeplinkUrlInArgv(argv)).toBe('nuxy://settings/extension/nyaa')
  })

  it('finds a nuxy:// argument among other flags', () => {
    const argv = ['/usr/bin/nuxy', '--flag', 'nuxy://settings/extension/nyaa', '--other']
    expect(findDeeplinkUrlInArgv(argv)).toBe('nuxy://settings/extension/nyaa')
  })

  it('strips a leading --open= prefix', () => {
    const argv = ['/usr/bin/nuxy', '--open=nuxy://settings/extension/nyaa']
    expect(findDeeplinkUrlInArgv(argv)).toBe('nuxy://settings/extension/nyaa')
  })

  it('returns undefined when no nuxy:// url is present', () => {
    const argv = ['/usr/bin/nuxy', '--flag', 'value']
    expect(findDeeplinkUrlInArgv(argv)).toBeUndefined()
  })

  it('returns undefined for an empty argv', () => {
    expect(findDeeplinkUrlInArgv([])).toBeUndefined()
  })
})
