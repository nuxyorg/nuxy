import { execFile, spawn as nodeSpawn } from 'child_process'
import type { CoreContext, SpawnHandle } from '@nuxyorg/core'

function createSpawnHandle(cmd: string, args: string[]): SpawnHandle {
  const proc = nodeSpawn(cmd, args)
  return {
    onData(handler) {
      proc.stdout?.on('data', (chunk: Buffer) => handler(chunk.toString()))
    },
    onClose(handler) {
      proc.on('close', (code) => handler(code))
    },
    kill(signal?: string) {
      proc.kill(signal as NodeJS.Signals | undefined)
    },
  }
}

export function buildShellApi(
  checkPermission: (permission: string, apiName: string) => void
): CoreContext['shell'] {
  return {
    open: (pathOrUrl: string) => {
      checkPermission('shell', 'core.shell.open')
      return new Promise<void>((resolve, reject) => {
        const cmd =
          process.platform === 'darwin'
            ? 'open'
            : process.platform === 'win32'
              ? 'explorer'
              : 'xdg-open'
        execFile(cmd, [pathOrUrl], (err) => (err ? reject(err) : resolve()))
      })
    },
    exec: (cmd: string, args: string[], opts?: { maxBuffer?: number }) => {
      checkPermission('shell', 'core.shell.exec')
      return new Promise<{ stdout: string; code: number }>((resolve, reject) => {
        execFile(cmd, args, { maxBuffer: opts?.maxBuffer ?? 1024 * 1024 }, (err, stdout) => {
          if (err && (err as NodeJS.ErrnoException).code === 'ENOENT') {
            reject(err)
          } else {
            resolve({
              stdout: stdout ?? '',
              code: (err as NodeJS.ErrnoException & { code?: number })?.code ?? (err ? 1 : 0),
            })
          }
        })
      })
    },
    spawn: (cmd: string, args: string[]) => {
      checkPermission('shell', 'core.shell.spawn')
      return createSpawnHandle(cmd, args)
    },
  }
}
