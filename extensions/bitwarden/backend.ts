import type { CoreContext } from '@nuxy/extension-sdk'
import type {
  OsType,
  BackendType,
  BitwardenStatus,
  BitwardenItem,
  SearchPayload,
  SetEmailPayload,
  GetTotpPayload,
  CopyTotpPayload,
  GetPasswordResult,
  GetTotpResult,
  RbwConfig,
} from './types.ts'

let detectedBackend: BackendType = 'none'

async function hasBinary(core: CoreContext, name: string): Promise<boolean> {
  const { code } = await core.shell.exec('which', [name]).catch(() => ({ code: 1, stdout: '' }))
  return code === 0
}

async function execCmd(core: CoreContext, cmd: string, args: string[]): Promise<string> {
  const { stdout } = await core.shell.exec(cmd, args)
  return stdout
}

async function fetchPassword(core: CoreContext, item: BitwardenItem): Promise<string> {
  if (detectedBackend === 'rbw') {
    const stdout = await execCmd(core, 'rbw', ['get', 'password', item.name])
    return stdout.trim()
  }
  throw new Error('No supported backend available')
}

async function detectOS(core: CoreContext): Promise<OsType> {
  try {
    const uname = await execCmd(core, 'uname', ['-s']).catch(() => '')
    if (uname.trim().toLowerCase() === 'darwin') return 'macos'
    const stdout = await execCmd(core, 'cat', ['/etc/os-release'])
    if (stdout.includes('cachyos') || stdout.includes('arch')) return 'arch'
    if (stdout.includes('ubuntu') || stdout.includes('debian')) return 'debian'
  } catch {}
  return 'linux'
}

async function getRbwConfig(core: CoreContext): Promise<RbwConfig> {
  try {
    const stdout = await execCmd(core, 'rbw', ['config', 'show'])
    const config: RbwConfig = {}
    stdout.split('\n').forEach((line) => {
      const match = line.match(/^([^:]+):\s*(.*)$/)
      if (match) {
        config[match[1].trim()] = match[2].trim()
      }
    })
    return config
  } catch {
    return {}
  }
}

export async function register(core: CoreContext): Promise<void> {
  for (const backend of ['rbw', 'bw'] as const) {
    if (await hasBinary(core, backend)) {
      detectedBackend = backend
      break
    }
  }

  core.registry.registerTool({ name: 'bitwarden' })

  core.ipc.handle('bw:status', async (): Promise<BitwardenStatus> => {
    const os = await detectOS(core)
    if (detectedBackend === 'none') {
      return { installed: false, configured: false, locked: true, backend: 'none', os }
    }

    if (detectedBackend === 'rbw') {
      const config = await getRbwConfig(core)
      const email = config.email || null
      const configured = !!email
      let locked = true
      if (configured) {
        try {
          await execCmd(core, 'rbw', ['unlocked'])
          locked = false
        } catch {
          locked = true
        }
      }
      return { installed: true, configured, email, locked, backend: 'rbw', os }
    }

    return { installed: true, configured: false, email: null, locked: true, backend: 'bw', os }
  })

  core.ipc.handle('bw:setEmail', async (payload: unknown): Promise<{ ok: boolean }> => {
    const { email } = (payload as SetEmailPayload) ?? {}
    if (!email) throw new Error('Email is required')
    await execCmd(core, 'rbw', ['config', 'set', 'email', email])
    return { ok: true }
  })

  core.ipc.handle('bw:unlock', async (): Promise<{ ok: boolean }> => {
    if (detectedBackend === 'rbw') {
      await execCmd(core, 'rbw', ['unlock'])
      return { ok: true }
    }
    throw new Error('Unlock is only supported via rbw backend')
  })

  core.ipc.handle('bw:sync', async (): Promise<{ ok: boolean }> => {
    if (detectedBackend === 'rbw') {
      await execCmd(core, 'rbw', ['sync'])
      return { ok: true }
    }
    throw new Error('Sync is only supported via rbw backend')
  })

  core.ipc.handle('bw:search', async (payload: unknown): Promise<BitwardenItem[]> => {
    const { query = '' } = (payload as SearchPayload) ?? {}
    if (detectedBackend === 'none') return []

    if (detectedBackend === 'rbw') {
      const stdout = await execCmd(core, 'rbw', ['list', '--fields', 'id,name,user'])
      const q = query.toLowerCase()
      return stdout
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [id, name, username] = line.split('\t')
          return { id, name, username, backend: 'rbw' as BackendType }
        })
        .filter(({ name = '', username = '' }) => {
          if (!q) return true
          return name.toLowerCase().includes(q) || username.toLowerCase().includes(q)
        })
    }

    return []
  })

  core.ipc.handle('bw:getPassword', async (payload: unknown): Promise<GetPasswordResult> => {
    const password = await fetchPassword(core, payload as BitwardenItem)
    return { password }
  })

  core.ipc.handle('bw:getTotp', async (payload: unknown): Promise<GetTotpResult> => {
    const { name } = payload as GetTotpPayload
    if (detectedBackend === 'rbw') {
      const stdout = await execCmd(core, 'rbw', ['get', 'totp', name])
      return { code: stdout.trim() }
    }
    throw new Error('No supported backend available')
  })

  core.ipc.handle('bw:copyPassword', async (payload: unknown): Promise<void> => {
    const password = await fetchPassword(core, payload as BitwardenItem)
    await core.clipboard.writeText(password)
    const delaySec = (await core.settings.read<number>('clipboardClearDelaySec')) ?? 30
    if (delaySec > 0)
      setTimeout(async () => {
        await core.clipboard.writeText('')
      }, delaySec * 1000)
  })

  core.ipc.handle('bw:copyUsername', async (payload: unknown): Promise<void> => {
    const item = payload as BitwardenItem
    await core.clipboard.writeText(item.username ?? '')
    const delaySec = (await core.settings.read<number>('clipboardClearDelaySec')) ?? 30
    if (delaySec > 0)
      setTimeout(async () => {
        await core.clipboard.writeText('')
      }, delaySec * 1000)
  })

  core.ipc.handle('bw:copyTotp', async (payload: unknown): Promise<void> => {
    const { code } = payload as CopyTotpPayload
    await core.clipboard.writeText(code)
    const delaySec = (await core.settings.read<number>('clipboardClearDelaySec')) ?? 30
    if (delaySec > 0)
      setTimeout(async () => {
        await core.clipboard.writeText('')
      }, delaySec * 1000)
  })

  core.ipc.handle('bw:copyText', async (payload: unknown): Promise<void> => {
    const { text } = payload as { text: string }
    await core.clipboard.writeText(text)
  })
}
