import type { CoreContext } from '@nuxyorg/extension-sdk'
import { createQbitClient } from './utils/qbit-client.ts'
import { probeQbitStatus } from './utils/get-status.ts'
import type {
  AddTorrentPayload,
  CopyMagnetPayload,
  CopySavePathPayload,
  QbitCredentials,
  QbitStatusResult,
  RemoveTorrentPayload,
  TorrentHashPayload,
  TorrentItem,
} from './types.ts'

function magnetUriFromHash(hash: string, name: string): string {
  return `magnet:?xt=urn:btih:${hash}&dn=${encodeURIComponent(name)}`
}

export function register(core: CoreContext): void {
  core.registry.registerTool({ name: 'qbittorrent' })

  async function getCredentials(): Promise<QbitCredentials> {
    const host = (await core.settings.read<string>('host')) ?? 'http://localhost:8080'
    if (!host.trim()) throw new Error('qBittorrent Web UI address is not configured')

    const authMethod =
      (await core.settings.read<QbitCredentials['authMethod']>('authMethod')) ?? 'credentials'
    const username = (await core.settings.read<string>('username')) ?? ''
    const password = (await core.settings.read<string>('password')) ?? ''
    const apiKey = (await core.settings.read<string>('apiKey')) ?? ''
    return { host, authMethod, username, password, apiKey }
  }

  const client = createQbitClient(getCredentials)

  core.ipc.handle(
    'getStatus',
    async (): Promise<QbitStatusResult> => {
      return probeQbitStatus(getCredentials, () => client.list())
    },
    { expose: 'public' }
  )

  core.ipc.handle('list', async (): Promise<TorrentItem[]> => {
    const torrents = await client.list()
    return torrents.map((t) => ({
      hash: t.hash,
      name: t.name,
      size: t.size,
      progress: t.progress,
      dlspeed: t.dlspeed,
      upspeed: t.upspeed,
      eta: t.eta,
      state: t.state,
      category: t.category,
      tags: t.tags,
      savePath: t.save_path,
      magnetUri:
        t.magnet_uri && t.magnet_uri.length > 0 ? t.magnet_uri : magnetUriFromHash(t.hash, t.name),
    }))
  })

  core.ipc.handle(
    'add',
    async (payload: unknown): Promise<void> => {
      const { url } = payload as AddTorrentPayload
      await client.add(url)
      core.logger.info(`Added torrent: ${url}`)
    },
    { expose: 'public' }
  )

  core.ipc.handle('pause', async (payload: unknown): Promise<void> => {
    const { hash } = payload as TorrentHashPayload
    await client.pause([hash])
  })

  core.ipc.handle('resume', async (payload: unknown): Promise<void> => {
    const { hash } = payload as TorrentHashPayload
    await client.resume([hash])
  })

  core.ipc.handle('recheck', async (payload: unknown): Promise<void> => {
    const { hash } = payload as TorrentHashPayload
    await client.recheck([hash])
  })

  core.ipc.handle('reannounce', async (payload: unknown): Promise<void> => {
    const { hash } = payload as TorrentHashPayload
    await client.reannounce([hash])
  })

  core.ipc.handle('remove', async (payload: unknown): Promise<void> => {
    const { hash, deleteFiles } = payload as RemoveTorrentPayload
    await client.remove([hash], deleteFiles)
    core.logger.info(`Removed torrent ${hash} (deleteFiles=${deleteFiles})`)
  })

  core.ipc.handle('copyMagnet', async (payload: unknown): Promise<void> => {
    const { magnetUri } = payload as CopyMagnetPayload
    await core.clipboard.writeText(magnetUri)
  })

  core.ipc.handle('copySavePath', async (payload: unknown): Promise<void> => {
    const { savePath } = payload as CopySavePathPayload
    await core.clipboard.writeText(savePath)
  })
}
