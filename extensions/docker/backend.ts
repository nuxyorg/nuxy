import type { CoreContext } from '@nuxy/extension-sdk'
import type {
  DockerContainer,
  DockerImage,
  ContainersPayload,
  ContainerIdPayload,
  RemovePayload,
  LogsPayload,
  ActionResult,
  LogsResult,
  DockerPsJsonRow,
  DockerImagesJsonRow,
} from './types.ts'

function parseContainers(stdout: string): DockerContainer[] {
  const containers: DockerContainer[] = []
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const row = JSON.parse(trimmed) as DockerPsJsonRow
      containers.push({
        id: row.ID,
        name: row.Names.replace(/^\//, ''),
        image: row.Image,
        status: row.Status,
        state: (row.State?.toLowerCase() ?? 'exited') as DockerContainer['state'],
        ports: row.Ports ?? '',
        created: row.RunningFor ?? '',
      })
    } catch {
      // skip malformed lines
    }
  }
  return containers
}

function parseImages(stdout: string): DockerImage[] {
  const images: DockerImage[] = []
  for (const line of stdout.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue
    try {
      const row = JSON.parse(trimmed) as DockerImagesJsonRow
      images.push({
        id: row.ID,
        repository: row.Repository,
        tag: row.Tag,
        size: row.Size,
        created: row.CreatedAt,
      })
    } catch {
      // skip malformed lines
    }
  }
  return images
}

export function register(core: CoreContext): void {
  core.registry.registerTool({ name: core.i18n.t('tool.name') })

  core.ipc.handle('docker:containers', async (payload: unknown): Promise<DockerContainer[]> => {
    const { all } = (payload as ContainersPayload | null) ?? {}
    const showAll = all ?? (await core.settings.read<boolean>('showAll')) ?? false

    const args = ['ps', '--format', '{{json .}}']
    if (showAll) args.push('--all')

    const result = await core.shell.exec('docker', args)
    if (result.exitCode !== 0) {
      core.logger.warn('docker ps failed', { stderr: result.stderr })
      return []
    }
    return parseContainers(result.stdout)
  })

  core.ipc.handle('docker:start', async (payload: unknown): Promise<ActionResult> => {
    const { id } = payload as ContainerIdPayload
    const result = await core.shell.exec('docker', ['start', id])
    if (result.exitCode !== 0) {
      core.logger.error('docker start failed', { id, stderr: result.stderr })
      return { success: false, error: result.stderr }
    }
    return { success: true }
  })

  core.ipc.handle('docker:stop', async (payload: unknown): Promise<ActionResult> => {
    const { id } = payload as ContainerIdPayload
    const result = await core.shell.exec('docker', ['stop', id])
    if (result.exitCode !== 0) {
      core.logger.error('docker stop failed', { id, stderr: result.stderr })
      return { success: false, error: result.stderr }
    }
    return { success: true }
  })

  core.ipc.handle('docker:restart', async (payload: unknown): Promise<ActionResult> => {
    const { id } = payload as ContainerIdPayload
    const result = await core.shell.exec('docker', ['restart', id])
    if (result.exitCode !== 0) {
      core.logger.error('docker restart failed', { id, stderr: result.stderr })
      return { success: false, error: result.stderr }
    }
    return { success: true }
  })

  core.ipc.handle('docker:remove', async (payload: unknown): Promise<ActionResult> => {
    const { id, force } = payload as RemovePayload
    const args = ['rm']
    if (force) args.push('-f')
    args.push(id)
    const result = await core.shell.exec('docker', args)
    if (result.exitCode !== 0) {
      core.logger.error('docker rm failed', { id, stderr: result.stderr })
      return { success: false, error: result.stderr }
    }
    return { success: true }
  })

  core.ipc.handle('docker:logs', async (payload: unknown): Promise<LogsResult> => {
    const { id, tail } = payload as LogsPayload
    const lines = tail ?? 50
    const result = await core.shell.exec('docker', ['logs', '--tail', String(lines), id])
    if (result.exitCode !== 0) {
      core.logger.warn('docker logs failed', { id, stderr: result.stderr })
      return { logs: result.stderr }
    }
    return { logs: result.stdout || result.stderr }
  })

  core.ipc.handle('docker:images', async (): Promise<DockerImage[]> => {
    const result = await core.shell.exec('docker', ['images', '--format', '{{json .}}'])
    if (result.exitCode !== 0) {
      core.logger.warn('docker images failed', { stderr: result.stderr })
      return []
    }
    return parseImages(result.stdout)
  })
}
