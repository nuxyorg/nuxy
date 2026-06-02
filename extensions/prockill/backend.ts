import type { CoreContext } from '@nuxy/extension-sdk'
import type { ProcessInfo, ListProcessesPayload, KillProcessPayload, KillResult } from './types.ts'

const ALLOWED_SIGNALS = new Set(['SIGTERM', 'SIGKILL'])

export function register(core: CoreContext): void {
  core.registry.registerTool({ name: 'prockill' })

  core.ipc.handle('listProcesses', async (payload: unknown): Promise<ProcessInfo[]> => {
    const { query, includeSystem } = payload as ListProcessesPayload
    const showSystemProcesses =
      includeSystem !== undefined
        ? includeSystem
        : ((await core.settings.read<boolean>('showSystemProcesses')) ?? false)

    let stdout: string
    try {
      const result = await core.shell.exec('ps', ['aux'])
      stdout = result.stdout
    } catch (err) {
      core.logger.error('prockill: failed to list processes', err)
      return []
    }

    try {
      const lines = stdout.split('\n')
      // Skip header line (first line)
      const dataLines = lines.slice(1)

      const processes: ProcessInfo[] = []

      for (const line of dataLines) {
        if (!line.trim()) continue

        // ps aux columns: USER PID %CPU %MEM VSZ RSS TTY STAT START TIME COMMAND...
        const cols = line.trim().split(/\s+/)
        if (cols.length < 11) continue

        const user = cols[0]
        const pid = parseInt(cols[1], 10)
        const cpu = cols[2]
        const mem = cols[3]
        // cols[4]=VSZ, cols[5]=RSS, cols[6]=TTY, cols[7]=STAT, cols[8]=START, cols[9]=TIME
        const command = cols.slice(10).join(' ')
        const name = command.split('/').pop()?.split(' ')[0] ?? command

        if (isNaN(pid)) continue

        processes.push({ pid, name, command, cpu, mem, user })
      }

      let filtered = processes

      if (!showSystemProcesses) {
        filtered = filtered.filter((p) => p.user !== 'root' && p.pid > 1)
      }

      if (query && query.trim()) {
        const q = query.trim().toLowerCase()
        filtered = filtered.filter(
          (p) => p.name.toLowerCase().includes(q) || p.command.toLowerCase().includes(q)
        )
      }

      filtered.sort((a, b) => a.name.localeCompare(b.name))

      return filtered
    } catch (err) {
      core.logger.error('prockill: failed to parse process list', err)
      return []
    }
  })

  core.ipc.handle('killProcess', async (payload: unknown): Promise<KillResult> => {
    const { pid, signal } = payload as KillProcessPayload

    if (!Number.isInteger(pid) || pid <= 0) {
      return { success: false, pid: pid ?? -1, error: core.i18n.t('errors.invalidPid') }
    }

    if (!ALLOWED_SIGNALS.has(signal)) {
      return { success: false, pid, error: core.i18n.t('errors.killFailed') }
    }

    try {
      await core.shell.exec('kill', [`-${signal}`, String(pid)])
      core.logger.info(`prockill: sent ${signal} to PID ${pid}`)
      return { success: true, pid }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err)
      core.logger.warn(`prockill: failed to kill PID ${pid}`, err)
      return { success: false, pid, error: errorMessage }
    }
  })
}
