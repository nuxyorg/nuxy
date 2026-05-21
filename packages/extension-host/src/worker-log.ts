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
  ns: '\x1b[34m',
}

export function createWorkerLogger(extId: string, logLevel: string) {
  function wlog(level: string, ns: string, msg: string, meta?: unknown): void {
    if ((LEVELS[level] ?? 99) < (LEVELS[logLevel] ?? 1)) return
    const ts = new Date().toISOString().replace('T', ' ').substring(0, 23)
    const lbl = C[level as keyof typeof C] + C.bold + level.toUpperCase().padEnd(5) + C.reset
    const nsp = C.ns + `[Worker:${extId}:${ns}]` + C.reset
    const extra = meta !== undefined ? '\n       ' + C.dim + JSON.stringify(meta) + C.reset : ''
    const line = C.time + ts + C.reset + ' ' + lbl + ' ' + nsp + ' ' + msg + extra
    if (level === 'error') console.error(line)
    else if (level === 'warn') console.warn(line)
    else console.log(line)
  }

  return {
    silly: (msg: string, meta?: unknown) => wlog('silly', 'Ext', msg, meta),
    info: (msg: string, meta?: unknown) => wlog('info', 'Ext', msg, meta),
    warn: (msg: string, meta?: unknown) => wlog('warn', 'Ext', msg, meta),
    error: (msg: string, meta?: unknown) => wlog('error', 'Ext', msg, meta),
    log: wlog,
  }
}

export type WorkerLogger = ReturnType<typeof createWorkerLogger>
