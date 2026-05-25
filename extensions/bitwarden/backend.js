/** @typedef {import('@nuxy/extension-sdk').CoreContext} CoreContext */
import { execFile } from 'child_process'

let detectedBackend = 'none'

function hasBinary(name) {
  return new Promise((resolve) => execFile('which', [name], (err) => resolve(!err)))
}

function execFilePromise(cmd, args) {
  return new Promise((resolve, reject) =>
    execFile(cmd, args, (err, stdout) => (err ? reject(err) : resolve(stdout)))
  )
}

async function fetchPassword(item) {
  if (detectedBackend === 'rbw') {
    const stdout = await execFilePromise('rbw', ['get', 'password', item.name])
    return stdout.trim()
  }
  throw new Error('No supported backend available')
}

async function detectOS() {
  if (process.platform === 'darwin') return 'macos'
  try {
    const stdout = await execFilePromise('cat', ['/etc/os-release'])
    if (stdout.includes('cachyos') || stdout.includes('arch')) return 'arch'
    if (stdout.includes('ubuntu') || stdout.includes('debian')) return 'debian'
  } catch {}
  return 'linux'
}

async function getRbwConfig() {
  try {
    const stdout = await execFilePromise('rbw', ['config', 'show'])
    const config = {}
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

/** @param {CoreContext} core */
export async function register(core) {
  if (await hasBinary('rbw')) {
    detectedBackend = 'rbw'
  } else if (await hasBinary('bw')) {
    detectedBackend = 'bw'
  } else {
    detectedBackend = 'none'
  }

  core.registry.registerTool({ name: 'bitwarden' })

  core.ipc.handle('bw:status', async () => {
    const os = await detectOS()
    if (detectedBackend === 'none') {
      return { installed: false, configured: false, locked: true, backend: 'none', os }
    }

    if (detectedBackend === 'rbw') {
      const config = await getRbwConfig()
      const email = config.email || null
      const configured = !!email
      let locked = true
      if (configured) {
        try {
          await execFilePromise('rbw', ['unlocked'])
          locked = false
        } catch {
          locked = true
        }
      }
      return { installed: true, configured, email, locked, backend: 'rbw', os }
    }

    return { installed: true, configured: false, email: null, locked: true, backend: 'bw', os }
  })

  core.ipc.handle('bw:setEmail', async ({ email } = {}) => {
    if (!email) throw new Error('Email is required')
    await execFilePromise('rbw', ['config', 'set', 'email', email])
    return { ok: true }
  })

  core.ipc.handle('bw:unlock', async () => {
    if (detectedBackend === 'rbw') {
      await execFilePromise('rbw', ['unlock'])
      return { ok: true }
    }
    throw new Error('Unlock is only supported via rbw backend')
  })

  core.ipc.handle('bw:sync', async () => {
    if (detectedBackend === 'rbw') {
      await execFilePromise('rbw', ['sync'])
      return { ok: true }
    }
    throw new Error('Sync is only supported via rbw backend')
  })

  core.ipc.handle('bw:search', async ({ query = '' } = {}) => {
    if (detectedBackend === 'none') return []

    if (detectedBackend === 'rbw') {
      const stdout = await execFilePromise('rbw', ['list', '--fields', 'id,name,user'])
      const q = query.toLowerCase()
      return stdout
        .split('\n')
        .filter(Boolean)
        .map((line) => {
          const [id, name, username] = line.split('\t')
          return { id, name, username, backend: 'rbw' }
        })
        .filter(({ name = '', username = '' }) => {
          if (!q) return true
          return name.toLowerCase().includes(q) || username.toLowerCase().includes(q)
        })
    }

    return []
  })

  core.ipc.handle('bw:getPassword', async (item) => {
    const password = await fetchPassword(item)
    return { password }
  })

  core.ipc.handle('bw:getTotp', async ({ name }) => {
    if (detectedBackend === 'rbw') {
      const stdout = await execFilePromise('rbw', ['get', 'totp', name])
      return { code: stdout.trim() }
    }
    throw new Error('No supported backend available')
  })

  core.ipc.handle('bw:copyPassword', async (item) => {
    const password = await fetchPassword(item)
    await core.clipboard.writeText(password)
    setTimeout(async () => { await core.clipboard.writeText('') }, 30_000)
  })

  core.ipc.handle('bw:copyUsername', async (item) => {
    await core.clipboard.writeText(item.username ?? '')
    setTimeout(async () => { await core.clipboard.writeText('') }, 30_000)
  })

  core.ipc.handle('bw:copyTotp', async ({ code }) => {
    await core.clipboard.writeText(code)
    setTimeout(async () => { await core.clipboard.writeText('') }, 30_000)
  })
}

