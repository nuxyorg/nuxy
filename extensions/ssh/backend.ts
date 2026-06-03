import type { CoreContext } from '@nuxy/extension-sdk'
import type { SshHost, SshConnectPayload, SshConnectResult } from './types.ts'

function parseSshConfig(text: string): SshHost[] {
  const hosts: SshHost[] = []
  let current: Partial<SshHost> | null = null

  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue

    const spaceIdx = line.indexOf(' ')
    if (spaceIdx === -1) continue

    const key = line.slice(0, spaceIdx).toLowerCase()
    const value = line.slice(spaceIdx + 1).trim()

    if (key === 'host') {
      if (current && current.name && !current.name.includes('*')) {
        hosts.push(current as SshHost)
      }
      // Skip wildcard host blocks
      if (value.includes('*')) {
        current = null
      } else {
        current = { name: value, hostname: value }
      }
    } else if (current) {
      if (key === 'hostname') {
        current.hostname = value
      } else if (key === 'user') {
        current.user = value
      } else if (key === 'port') {
        const p = parseInt(value, 10)
        if (!isNaN(p)) current.port = p
      } else if (key === 'identityfile') {
        current.identityFile = value
      }
    }
  }

  if (current && current.name && !current.name.includes('*')) {
    hosts.push(current as SshHost)
  }

  return hosts
}

function buildConnectionString(host: SshHost): string {
  let str = host.hostname
  if (host.user) {
    str = `${host.user}@${str}`
  }
  if (host.port && host.port !== 22) {
    str = `${str} -p ${host.port}`
  }
  return str
}

function resolveConfigPath(configPath: string, homeDir: string): string {
  if (configPath.startsWith('~/')) {
    return homeDir + configPath.slice(1)
  }
  return configPath
}

export async function register(core: CoreContext): Promise<void> {
  core.registry.registerTool({ name: core.i18n.t('tool.name') })

  let cachedHosts: SshHost[] = []

  async function loadHosts(): Promise<SshHost[]> {
    const configPathSetting =
      (await core.settings.read<string>('configPath')) ?? '~/.ssh/config'
    const resolvedPath = resolveConfigPath(configPathSetting, core.fs.homedir())

    const exists = await core.fs.fileExists(resolvedPath)
    if (!exists) {
      core.logger.warn('SSH config file not found', { path: resolvedPath })
      return []
    }

    const text = await core.fs.readFile(resolvedPath)
    const hosts = parseSshConfig(text)
    core.logger.info(`Loaded ${hosts.length} SSH hosts from ${resolvedPath}`)
    return hosts
  }

  cachedHosts = await loadHosts()

  core.ipc.handle('ssh:list', async (): Promise<SshHost[]> => {
    return cachedHosts
  })

  core.ipc.handle('ssh:refresh', async (): Promise<SshHost[]> => {
    cachedHosts = await loadHosts()
    return cachedHosts
  })

  core.ipc.handle(
    'ssh:connect',
    async (payload: unknown): Promise<SshConnectResult> => {
      const { host } = payload as SshConnectPayload
      const sshHost = cachedHosts.find((h) => h.name === host)

      if (!sshHost) {
        throw new Error(core.i18n.t('empty.noMatch'))
      }

      const terminal =
        (await core.settings.read<string>('terminal')) ?? 'default'
      const connStr = buildConnectionString(sshHost)

      core.logger.info(`Opening SSH connection to ${host} via ${terminal}`, { connStr })

      if (terminal === 'default') {
        await core.shell.open(`ssh://${connStr}`)
      } else if (terminal === 'kitty') {
        await core.shell.exec('kitty', ['ssh', connStr])
      } else if (terminal === 'alacritty') {
        await core.shell.exec('alacritty', ['-e', 'ssh', connStr])
      } else if (terminal === 'gnome-terminal') {
        await core.shell.exec('gnome-terminal', ['--', 'ssh', connStr])
      } else if (terminal === 'konsole') {
        await core.shell.exec('konsole', ['-e', 'ssh', connStr])
      } else {
        await core.shell.open(`ssh://${connStr}`)
      }

      return { launched: true }
    }
  )
}
