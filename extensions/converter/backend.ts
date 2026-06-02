import type { CoreContext } from '@nuxy/extension-sdk'
import type { ConvertPayload, CopyResultPayload, UnitSystem } from './types.ts'
import { parseQuery, getConversionsForCategory, convert } from './units.ts'

export function register(core: CoreContext): void {
  core.registry.registerTool({ name: 'converter' })

  core.ipc.handle('convert', async (payload: unknown) => {
    try {
      const { query } = payload as ConvertPayload
      if (!query || !query.trim()) return []

      const systemSetting = (await core.settings.read<string>('unitSystem')) ?? 'both'
      const precisionSetting = (await core.settings.read<string>('precision')) ?? '2'
      const system = systemSetting as UnitSystem
      const precision = parseInt(precisionSetting, 10)

      const parsed = parseQuery(query)
      if (!parsed) return []

      const { value, fromUnit, toUnit, category } = parsed
      if (!category) return []

      if (toUnit !== null) {
        return [convert(value, fromUnit, toUnit, category, precision)]
      }

      return getConversionsForCategory(value, fromUnit, category, system, precision)
    } catch (err) {
      core.logger.warn('convert handler error', err)
      return []
    }
  })

  core.ipc.handle('copyResult', async (payload: unknown) => {
    const { value } = payload as CopyResultPayload
    await core.clipboard.writeText(value)
    return { copied: true }
  })
}
