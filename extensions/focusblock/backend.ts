import type { CoreContext } from '@nuxy/extension-sdk'
import type { TimerStatus, Session, StartPayload } from './types.ts'

const MAX_HISTORY = 20

export function register(core: CoreContext): void {
  let activeTimer: {
    startedAt: number
    duration: number
    label: string
    timeout: ReturnType<typeof setTimeout>
  } | null = null

  function computeStatus(): TimerStatus {
    if (!activeTimer) {
      return {
        active: false,
        startedAt: 0,
        duration: 0,
        remaining: 0,
        elapsed: 0,
        percent: 0,
        label: '',
      }
    }
    const now = Date.now()
    const elapsed = Math.min(now - activeTimer.startedAt, activeTimer.duration)
    const remaining = Math.max(0, activeTimer.duration - elapsed)
    const percent = Math.round((elapsed / activeTimer.duration) * 100)
    return {
      active: true,
      startedAt: activeTimer.startedAt,
      duration: activeTimer.duration,
      remaining,
      elapsed,
      percent,
      label: activeTimer.label,
    }
  }

  function createSession(timer: NonNullable<typeof activeTimer>, completed: boolean): Session {
    return {
      id: crypto.randomUUID(),
      label: timer.label,
      duration: timer.duration,
      startedAt: timer.startedAt,
      endedAt: Date.now(),
      completed,
    }
  }

  async function saveSession(session: Session): Promise<void> {
    const history = (await core.storage.read<Session[]>('history.json')) ?? []
    history.unshift(session)
    if (history.length > MAX_HISTORY) history.splice(MAX_HISTORY)
    await core.storage.write<Session[]>('history.json', history)
  }

  core.registry.registerTool({ name: 'focusblock' })

  core.ipc.handle('focusblock:status', (): TimerStatus => {
    return computeStatus()
  })

  core.ipc.handle('focusblock:start', async (payload: unknown): Promise<TimerStatus> => {
    const { duration = 25, label = '' } = (payload as StartPayload) ?? {}
    const durationMs = duration * 60 * 1000

    if (activeTimer) {
      clearTimeout(activeTimer.timeout)
      await saveSession(createSession(activeTimer, false))
      activeTimer = null
    }

    const startedAt = Date.now()
    const timeout = setTimeout(async () => {
      if (!activeTimer) return
      const session = createSession(activeTimer, true)
      activeTimer = null
      await saveSession(session)
      core.logger.info('Focus block completed', { label, duration })
    }, durationMs)

    activeTimer = { startedAt, duration: durationMs, label, timeout }
    core.logger.info('Focus block started', { label, duration })
    return computeStatus()
  })

  core.ipc.handle('focusblock:stop', async (): Promise<void> => {
    if (!activeTimer) return
    clearTimeout(activeTimer.timeout)
    const session = createSession(activeTimer, false)
    activeTimer = null
    await saveSession(session)
    core.logger.info('Focus block stopped')
  })

  core.ipc.handle('focusblock:history', async (): Promise<Session[]> => {
    return (await core.storage.read<Session[]>('history.json')) ?? []
  })

  core.ipc.handle('focusblock:getSettings', async (): Promise<{ defaultDuration: number }> => {
    const defaultDuration = (await core.settings.read<number>('defaultDuration')) ?? 25
    return { defaultDuration }
  })
}
