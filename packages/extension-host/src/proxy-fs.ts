import fsPromises from 'fs/promises'
import os from 'os'
import type { CoreContext } from '@nuxy/core'
import { HostChannel } from '@nuxy/core'

export function buildFsApi(
  checkPermission: (permission: string, apiName: string) => void,
  callHost: (channel: string, payload?: unknown) => Promise<unknown>
): CoreContext['fs'] {
  return {
    fileExists: (p: string) => {
      checkPermission('fs', 'core.fs.fileExists')
      return callHost(HostChannel.FS_FILE_EXISTS, p) as Promise<boolean>
    },
    readDir: async (p: string) => {
      checkPermission('fs', 'core.fs.readDir')
      const entries = await fsPromises.readdir(p, { withFileTypes: true })
      return entries.map((e) => ({ name: e.name, isDir: e.isDirectory() }))
    },
    readFile: (p: string) => {
      checkPermission('fs', 'core.fs.readFile')
      return fsPromises.readFile(p, 'utf8')
    },
    readFileBinary: (p: string) => {
      checkPermission('fs', 'core.fs.readFileBinary')
      return fsPromises.readFile(p).then((buf) => new Uint8Array(buf))
    },
    writeFile: (p: string, data: string | Uint8Array) => {
      checkPermission('fs', 'core.fs.writeFile')
      return fsPromises.writeFile(p, data instanceof Uint8Array ? Buffer.from(data) : data)
    },
    mkdir: (p: string, opts?: { recursive?: boolean }) => {
      checkPermission('fs', 'core.fs.mkdir')
      return fsPromises.mkdir(p, opts).then(() => {})
    },
    rename: (src: string, dest: string) => {
      checkPermission('fs', 'core.fs.rename')
      return fsPromises.rename(src, dest)
    },
    rm: (p: string) => {
      checkPermission('fs', 'core.fs.rm')
      return fsPromises.unlink(p)
    },
    stat: async (p: string) => {
      checkPermission('fs', 'core.fs.stat')
      const s = await fsPromises.stat(p)
      return { isDir: s.isDirectory(), size: s.size, mtimeMs: s.mtimeMs }
    },
    homedir: () => {
      checkPermission('fs', 'core.fs.homedir')
      return os.homedir()
    },
    tmpdir: () => {
      checkPermission('fs', 'core.fs.tmpdir')
      return os.tmpdir()
    },
  }
}
