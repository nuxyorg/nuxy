import { parentPort, workerData } from 'worker_threads'

interface WorkerData {
  extId: string
  absolutePath: string
  logLevel: string
}

const { extId, absolutePath, logLevel } = workerData as WorkerData

const LEVELS: Record<string, number> = { silly: 0, info: 1, warn: 2, error: 3 }
const C = {
  reset: '\x1b[0m',
  bold: '\x1b[1m',
  dim: '\x1b[2m',
  silly: '\x1b[35m',
  info: '\x1b[36m',
  warn: '\x1b[33m',
  error: '\x1b[31m',
  time: '\x1b[90m',
  ns: '\x1b[34m'
}

function wlog(
  level: string,
  ns: string,
  msg: string,
  meta?: unknown
): void {
  if ((LEVELS[level] ?? 99) < (LEVELS[logLevel] ?? 1)) return
  const ts = new Date().toISOString().replace('T', ' ').substring(0, 23)
  const lbl = C[level as keyof typeof C] + C.bold + level.toUpperCase().padEnd(5) + C.reset
  const nsp = C.ns + `[Worker:${extId}:${ns}]` + C.reset
  const extra =
    meta !== undefined
      ? '\n       ' + C.dim + JSON.stringify(meta) + C.reset
      : ''
  const line = C.time + ts + C.reset + ' ' + lbl + ' ' + nsp + ' ' + msg + extra
  if (level === 'error') console.error(line)
  else if (level === 'warn') console.warn(line)
  else console.log(line)
}

const pendingHostCalls = new Map<
  string,
  { resolve: (v: unknown) => void; reject: (e: Error) => void }
>()

const channelHandlers = new Map<
  string,
  (payload: unknown) => Promise<unknown>
>()

parentPort!.on('message', (msg: Record<string, unknown>) => {
  if (msg?.type === 'host:reply') {
    const cb = pendingHostCalls.get(msg.id as string)
    if (cb) {
      pendingHostCalls.delete(msg.id as string)
      if (msg.error) cb.reject(new Error(msg.error as string))
      else cb.resolve(msg.result)
    }
    return
  }

  if (msg?.channel && msg?.id) {
    const handler = channelHandlers.get(msg.channel as string)
    if (!handler) return
    void (async () => {
      try {
        const res = await handler(msg.payload)
        parentPort!.postMessage({ id: msg.id, result: res })
      } catch (e) {
        const err = e as Error
        parentPort!.postMessage({ id: msg.id, error: err.message })
      }
    })()
  }
})

function callHost(channel: string, payload?: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = Math.random().toString(36).slice(2)
    pendingHostCalls.set(id, { resolve, reject })
    parentPort!.postMessage({ type: 'host:call', id, channel, payload })
  })
}

const core = {
  ipc: {
    handle: (channel: string, handler: (payload: unknown) => Promise<unknown>) => {
      wlog('info', 'IPC', 'Registered handler for channel: ' + channel)
      channelHandlers.set(channel, handler)
    }
  },
  registry: {
    registerTool: (cfg: { name: string }) => {
      wlog('info', 'Registry', 'Registered Tool: ' + cfg.name, cfg)
    },
    registerProvider: (cfg: { name: string }) => {
      wlog('info', 'Registry', 'Registered Provider: ' + cfg.name, cfg)
    },
    registerOrchestrator: (cfg: unknown) => {
      wlog('info', 'Registry', 'Registered Orchestrator', cfg)
    }
  },
  clipboard: {
    readText: () => callHost('clipboard:readText') as Promise<string>,
    writeText: (text: string) => callHost('clipboard:writeText', text)
  },
  storage: {
    read: (file: string) => callHost('storage:read', file),
    write: (file: string, data: unknown) =>
      callHost('storage:write', { file, data })
  },
  logger: {
    silly: (msg: string, meta?: unknown) => wlog('silly', 'Ext', msg, meta),
    info: (msg: string, meta?: unknown) => wlog('info', 'Ext', msg, meta),
    warn: (msg: string, meta?: unknown) => wlog('warn', 'Ext', msg, meta),
    error: (msg: string, meta?: unknown) => wlog('error', 'Ext', msg, meta)
  }
}

async function loadExtension(): Promise<void> {
  wlog('info', 'Loader', 'Loading extension module: ' + absolutePath)
  try {
    const extModule = await import(/* @vite-ignore */ absolutePath)
    wlog(
      'info',
      'Loader',
      'Module loaded. Keys: ' + Object.keys(extModule || {}).join(', ')
    )

    let ext: { register?: (c: typeof core) => void } | undefined
    if (extModule && typeof extModule.register === 'function') {
      ext = extModule
    } else if (
      extModule?.default &&
      typeof extModule.default.register === 'function'
    ) {
      ext = extModule.default
    } else if (
      extModule?.default?.default &&
      typeof extModule.default.default.register === 'function'
    ) {
      ext = extModule.default.default
    } else {
      ext = extModule.default || extModule
    }

    if (ext?.register) {
      wlog('info', 'Loader', 'Calling ext.register(core)...')
      ext.register(core)
      wlog('info', 'Loader', 'Extension registered successfully.')
    } else {
      wlog('warn', 'Loader', 'No register() function found on extension module.')
    }
  } catch (e) {
    const err = e as Error
    wlog('error', 'Loader', 'Failed to load module: ' + err.message, {
      stack: err.stack
    })
  }
}

void loadExtension()
