import fs from 'fs'
import fsPromises from 'fs/promises'
import os from 'os'
import path from 'path'
import type { CoreContext } from '@nuxy/core'

function getTargetExtDir(targetExtId: string): string {
  const baseDir = process.env.NUXY_DATA_DIR || path.join(os.homedir(), '.nuxy', 'data')
  return path.join(baseDir, targetExtId)
}

export function buildSettingsApi(
  extId: string,
  dataDir: string,
  extSettingsFile: string,
  permissions: string[]
): CoreContext['settings'] {
  const baseApi: CoreContext['settings'] = {
    read: async <T = unknown>(key: string): Promise<T | null> => {
      try {
        const content = await fsPromises.readFile(extSettingsFile, 'utf8')
        const data = JSON.parse(content) as Record<string, unknown>
        return (key in data ? data[key] : null) as T | null
      } catch {
        return null
      }
    },
    write: async (key: string, value: unknown): Promise<void> => {
      let data: Record<string, unknown> = {}
      try {
        const content = await fsPromises.readFile(extSettingsFile, 'utf8')
        data = JSON.parse(content) as Record<string, unknown>
      } catch {}
      data[key] = value
      fs.mkdirSync(dataDir, { recursive: true })
      await fsPromises.writeFile(extSettingsFile, JSON.stringify(data, null, 2))
    },
  }

  if (permissions.includes('settings.read')) {
    baseApi.readAllExtension = async (targetExtId: string): Promise<Record<string, unknown>> => {
      const p = path.join(getTargetExtDir(targetExtId), 'ext-settings.json')
      try {
        const content = await fsPromises.readFile(p, 'utf8')
        return JSON.parse(content) as Record<string, unknown>
      } catch {
        return {}
      }
    }
    baseApi.readExtension = async <T = unknown>(
      targetExtId: string,
      key: string
    ): Promise<T | null> => {
      const p = path.join(getTargetExtDir(targetExtId), 'ext-settings.json')
      try {
        const content = await fsPromises.readFile(p, 'utf8')
        const data = JSON.parse(content) as Record<string, unknown>
        return (key in data ? data[key] : null) as T | null
      } catch {
        return null
      }
    }
  }

  if (permissions.includes('settings.write')) {
    baseApi.writeAllExtension = async (
      targetExtId: string,
      values: Record<string, unknown>
    ): Promise<void> => {
      const dir = getTargetExtDir(targetExtId)
      fs.mkdirSync(dir, { recursive: true })
      await fsPromises.writeFile(path.join(dir, 'ext-settings.json'), JSON.stringify(values, null, 2))
    }
    baseApi.writeExtension = async (
      targetExtId: string,
      key: string,
      value: unknown
    ): Promise<void> => {
      const dir = getTargetExtDir(targetExtId)
      const p = path.join(dir, 'ext-settings.json')
      let data: Record<string, unknown> = {}
      try {
        const content = await fsPromises.readFile(p, 'utf8')
        data = JSON.parse(content) as Record<string, unknown>
      } catch {}
      data[key] = value
      fs.mkdirSync(dir, { recursive: true })
      await fsPromises.writeFile(p, JSON.stringify(data, null, 2))
    }
  }

  return baseApi
}
