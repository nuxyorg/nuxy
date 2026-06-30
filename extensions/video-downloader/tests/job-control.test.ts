import { describe, it, expect } from 'vitest'
import { assertJobControl } from '../utils/job-control.ts'

const EXT_ID = 'com.nuxy.video-downloader'
const DOWNLOAD_MANAGER_ID = 'com.nuxy.download-manager'

describe('assertJobControl', () => {
  const job = { controllerExtId: DOWNLOAD_MANAGER_ID }

  it('allows same-extension calls (own UI)', () => {
    expect(() => assertJobControl(job, EXT_ID, { callerExtId: EXT_ID })).not.toThrow()
  })

  it('allows calls with no caller context (unit tests / legacy same-worker)', () => {
    expect(() => assertJobControl(job, EXT_ID)).not.toThrow()
  })

  it('allows the registered controller extension', () => {
    expect(() => assertJobControl(job, EXT_ID, { callerExtId: DOWNLOAD_MANAGER_ID })).not.toThrow()
  })

  it('rejects other extensions even when the channel is public', () => {
    expect(() => assertJobControl(job, EXT_ID, { callerExtId: 'com.nuxy.nyaa' })).toThrow(
      'Not authorized to control this job'
    )
  })
})
