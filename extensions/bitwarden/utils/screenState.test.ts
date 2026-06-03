import { describe, it, expect } from 'vitest'
import { getScreenState } from './screenState.ts'
import type { BitwardenStatus } from '../types.ts'

const baseStatus: BitwardenStatus = {
  installed: true,
  configured: true,
  email: 'test@example.com',
  locked: false,
  backend: 'rbw',
  os: 'arch',
}

describe('getScreenState', () => {
  it('returns all false when status is null', () => {
    const state = getScreenState(null, false)
    expect(state).toEqual({
      isInstallScreen: false,
      isConfigScreen: false,
      isLockScreen: false,
      isVaultScreen: false,
    })
  })

  it('returns isInstallScreen when not installed', () => {
    const state = getScreenState({ ...baseStatus, installed: false }, false)
    expect(state.isInstallScreen).toBe(true)
    expect(state.isConfigScreen).toBe(false)
    expect(state.isLockScreen).toBe(false)
    expect(state.isVaultScreen).toBe(false)
  })

  it('returns isInstallScreen when backend is none', () => {
    const state = getScreenState({ ...baseStatus, backend: 'none' }, false)
    expect(state.isInstallScreen).toBe(true)
  })

  it('returns isConfigScreen when not configured', () => {
    const state = getScreenState({ ...baseStatus, configured: false }, false)
    expect(state.isConfigScreen).toBe(true)
    expect(state.isInstallScreen).toBe(false)
    expect(state.isLockScreen).toBe(false)
    expect(state.isVaultScreen).toBe(false)
  })

  it('returns isConfigScreen when editingEmail is true', () => {
    const state = getScreenState(baseStatus, true)
    expect(state.isConfigScreen).toBe(true)
    expect(state.isInstallScreen).toBe(false)
  })

  it('returns isLockScreen when vault is locked', () => {
    const state = getScreenState({ ...baseStatus, locked: true }, false)
    expect(state.isLockScreen).toBe(true)
    expect(state.isInstallScreen).toBe(false)
    expect(state.isConfigScreen).toBe(false)
    expect(state.isVaultScreen).toBe(false)
  })

  it('returns isVaultScreen when fully unlocked and configured', () => {
    const state = getScreenState(baseStatus, false)
    expect(state.isVaultScreen).toBe(true)
    expect(state.isInstallScreen).toBe(false)
    expect(state.isConfigScreen).toBe(false)
    expect(state.isLockScreen).toBe(false)
  })

  it('install screen takes priority over config screen', () => {
    const state = getScreenState({ ...baseStatus, installed: false, configured: false }, false)
    expect(state.isInstallScreen).toBe(true)
    expect(state.isConfigScreen).toBe(false)
  })

  it('config screen takes priority over lock screen', () => {
    const state = getScreenState({ ...baseStatus, configured: false, locked: true }, false)
    expect(state.isConfigScreen).toBe(true)
    expect(state.isLockScreen).toBe(false)
  })
})
