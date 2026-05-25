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
    if (detectedBackend === 'none') {
      return { locked: true, backend: 'none' }
    }

    if (detectedBackend === 'rbw') {
      try {
        await execFilePromise('rbw', ['unlocked'])
        return { locked: false, backend: 'rbw' }
      } catch {
        return { locked: true, backend: 'rbw' }
      }
    }

    return { locked: true, backend: 'bw' }
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
}
