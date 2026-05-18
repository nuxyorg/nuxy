/**
 * Nuxy Kernel Logger
 * Levels (ascending verbosity order):
 *   error   — runtime failures and unhandled exceptions
 *   warn    — non-fatal issues and unexpected states
 *   info    — normal lifecycle events (default)
 *   silly   — hyper-verbose trace: every match, message, module load, IPC hop
 *
 * Set the LOG_LEVEL env-var to control verbosity:
 *   LOG_LEVEL=silly  → shows everything
 *   LOG_LEVEL=info   → shows info + warn + error  (default)
 *   LOG_LEVEL=warn   → shows warn + error
 *   LOG_LEVEL=error  → shows only errors
 */

export type LogLevel = 'silly' | 'info' | 'warn' | 'error';

const LEVELS: Record<LogLevel, number> = {
  silly: 0,
  info:  1,
  warn:  2,
  error: 3,
};

// ANSI color codes
const C = {
  reset:  '\x1b[0m',
  dim:    '\x1b[2m',
  bold:   '\x1b[1m',
  // levels
  silly:  '\x1b[35m',  // magenta
  info:   '\x1b[36m',  // cyan
  warn:   '\x1b[33m',  // yellow
  error:  '\x1b[31m',  // red
  // meta
  time:   '\x1b[90m',  // gray
  ns:     '\x1b[34m',  // blue
  arrow:  '\x1b[90m',  // gray
};

function currentLevel(): LogLevel {
  const env = (process.env.LOG_LEVEL ?? 'info').toLowerCase() as LogLevel;
  return LEVELS[env] !== undefined ? env : 'info';
}

function timestamp(): string {
  return new Date().toISOString().replace('T', ' ').substring(0, 23);
}

function pad(s: string, n: number): string {
  return s.padEnd(n);
}

function formatLine(level: LogLevel, namespace: string, msg: string, meta?: unknown): string {
  const color = C[level];
  const ts    = `${C.time}${timestamp()}${C.reset}`;
  const lbl   = `${color}${C.bold}${pad(level.toUpperCase(), 5)}${C.reset}`;
  const ns    = `${C.ns}[${namespace}]${C.reset}`;
  const body  = msg;
  const extra = meta !== undefined
    ? `\n       ${C.dim}${JSON.stringify(meta, null, 2).replace(/\n/g, '\n       ')}${C.reset}`
    : '';
  return `${ts} ${lbl} ${ns} ${body}${extra}`;
}

export interface Logger {
  silly(msg: string, meta?: unknown): void;
  info(msg: string, meta?: unknown): void;
  warn(msg: string, meta?: unknown): void;
  error(msg: string, meta?: unknown): void;
  /** Create a child logger with a sub-namespace */
  child(subNamespace: string): Logger;
}

export function createLogger(namespace: string): Logger {
  function shouldLog(level: LogLevel): boolean {
    return LEVELS[level] >= LEVELS[currentLevel()];
  }

  function emit(level: LogLevel, msg: string, meta?: unknown) {
    if (!shouldLog(level)) return;
    const line = formatLine(level, namespace, msg, meta);
    if (level === 'error') {
      console.error(line);
    } else if (level === 'warn') {
      console.warn(line);
    } else {
      console.log(line);
    }
  }

  return {
    silly: (msg, meta) => emit('silly', msg, meta),
    info:  (msg, meta) => emit('info',  msg, meta),
    warn:  (msg, meta) => emit('warn',  msg, meta),
    error: (msg, meta) => emit('error', msg, meta),
    child: (sub)       => createLogger(`${namespace}:${sub}`),
  };
}

/** Root kernel logger */
export const kernelLogger = createLogger('Kernel');
