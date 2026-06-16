/** Minimal styled logging for `pnpm dev` — no extra dependencies. */

const esc = (n, s) => `\x1b[${n}m${s}\x1b[0m`

const log = {
  bold: (s) => esc('1', s),
  dim: (s) => esc('2', s),
  green: (s) => esc('32', s),
  red: (s) => esc('31', s),
  cyan: (s) => esc('36', s),
  yellow: (s) => esc('33', s),
  purple: (s) => esc('35', s),
}

export function banner(msg) {
  console.log(`  🚀 ${msg}`)
}

export function ok(msg) {
  console.log(`  ${log.green('✔')} ${msg}`)
}

export function watch(msg) {
  console.log(`  ${log.purple('✔')} ${msg}`)
}

export function refreshing(name) {
  if (process.stdout.isTTY) {
    process.stdout.write(`  ${esc('36', '↻')} ${name} refreshing...`)
  } else {
    console.log(`  ↻ ${name} refreshing...`)
  }
}

export function refreshDone(name) {
  if (process.stdout.isTTY) {
    process.stdout.write(`\r\x1b[2K  ${esc('35', '✔')} ${name} has refreshed\n`)
  } else {
    console.log(`  ✔ ${name} has refreshed`)
  }
}

export function fail(msg) {
  console.error(`  ${log.red('✘')} ${msg}`)
}

export function info(msg) {
  console.log(`  ${log.dim(msg)}`)
}

export function warn(msg) {
  console.log(`  ${log.yellow('⚠')} ${msg}`)
}

/** Inline progress — single TTY line, cleared when done. */
export function createProgress(label, total) {
  const width = 20
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']
  let done = 0
  let frame = 0
  let finished = false
  let spinner = null
  const isTTY = Boolean(process.stdout.isTTY)

  const render = () => {
    if (!isTTY || finished) return
    const filled = total === 0 ? width : Math.round((done / total) * width)
    const bar = '█'.repeat(filled) + '░'.repeat(Math.max(0, width - filled))
    const spin = frames[frame % frames.length]
    process.stdout.write(`\r\x1b[2K  ${spin} ${label}  [${bar}] ${done}/${total}`)
  }

  return {
    start() {
      if (!isTTY) return
      render()
      spinner = setInterval(() => {
        if (finished) return
        frame += 1
        render()
      }, 80)
    },
    tick() {
      if (finished) return
      done = Math.min(total, done + 1)
      render()
    },
    clear() {
      finished = true
      if (spinner) clearInterval(spinner)
      spinner = null
      if (isTTY) process.stdout.write('\r\x1b[2K')
    },
  }
}

/** Lines to drop from child process output (vite/esbuild noise). */
const QUIET_PATTERNS = [
  /^vite v[\d.]+ building/i,
  /^watching for file changes/i,
  /^build started/i,
  /^transforming\.\.\./i,
  /^✓ \d+ modules transformed/i,
  /^rendering chunks/i,
  /^computing gzip size/i,
  /^dist-electron\//,
  /^\.\/style\.css/,
  /^\.\/frontend\.js/,
  /^built in \d+/i,
  /^\[inline-css\]/i,
  /^The CJS build of Vite's Node API is deprecated/i,
  /^\(node:\d+\) \[MODULE_TYPELESS_PACKAGE_JSON\]/,
  /^Reparsing as ES module because module syntax was detected/i,
  /^To eliminate this warning, add "type": "module"/,
  /^\(Use.*trace-warnings.*\)$/,
  /^Port \d+ is in use, trying another one/i,
  /^\[nxt\]/i,
  /^ {2}VITE v[\d.]+ {2}ready in \d+ ms$/i,
  /^ {2}➜ {2}(Local|Network):/i,
  /^\(node:\d+\) Warning:/,
  /^\[\d+:\d+\/\d+\.\d+:ERROR:ui\/ozone\//,
  /is not compatible with Vulkan/,
  /^\[\d+:\d+\/\d+\.\d+:ERROR:gpu\//,
  /^\[\d+:\d+\/\d+\.\d+:ERROR:content\/browser\/gpu\//,
  /^\[\d+:\d+\/\d+\.\d+:ERROR:ui\/base\/x\//,
  /GPU process exited unexpectedly/,
  /Failed to send GpuControl/,
  /XGetWindowAttributes failed/,
  /Frame latency is negative/,
]

const ANSI_RE = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g')

function shouldQuietLine(line) {
  const trimmed = line.replace(ANSI_RE, '').trimEnd()
  if (!trimmed) return true
  return QUIET_PATTERNS.some((re) => re.test(trimmed))
}

export function pipeChildOutput(stream, { isStderr = false, prefix = '' } = {}) {
  let buffer = ''
  stream.on('data', (chunk) => {
    buffer += chunk.toString()
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (shouldQuietLine(line)) continue
      const out = prefix ? `${prefix}${line}` : line
      if (isStderr) console.error(out)
      else console.log(out)
    }
  })
  return () => {
    if (buffer.trim() && !shouldQuietLine(buffer)) {
      const out = prefix ? `${prefix}${buffer}` : buffer
      if (isStderr) console.error(out)
      else console.log(out)
    }
  }
}
