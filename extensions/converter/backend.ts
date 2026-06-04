import type { CoreContext } from '@nuxy/extension-sdk'
import type {
  ConvertPayload,
  CopyResultPayload,
  ConversionResult,
  EvalResult,
  UnitSystem,
} from './types.ts'
import { parseQuery, getConversionsForCategory, convert } from './units.ts'

const MAX_EVAL_ITEMS = 12

async function resolveConversions(core: CoreContext, query: string): Promise<ConversionResult[]> {
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
}

function toEvalItem(result: ConversionResult): EvalResult['items'][number] {
  return {
    id: `conv-${result.id}`,
    title: `${result.fromValue} ${result.fromSymbol} = ${result.formattedResult}`,
    subtitle: 'Unit Converter',
    value: result.formattedResult,
  }
}

export function register(core: CoreContext): void {
  core.registry.registerTool({ name: 'converter' })
  core.registry.registerProvider({ name: 'converter' })

  core.ipc.handle('convert', async (payload: unknown) => {
    try {
      const { query } = payload as ConvertPayload
      if (!query || !query.trim()) return []
      return await resolveConversions(core, query)
    } catch (err) {
      core.logger.warn('convert handler error', err)
      return []
    }
  })

  core.ipc.handle('eval', async (payload: unknown): Promise<EvalResult> => {
    const text = (payload as { text?: string } | null | undefined)?.text ?? ''
    if (!text.trim()) return { items: [] }

    try {
      const results = await resolveConversions(core, text)
      return { items: results.slice(0, MAX_EVAL_ITEMS).map(toEvalItem) }
    } catch (err) {
      core.logger.warn('eval handler error', err)
      return { items: [] }
    }
  })

  core.ipc.handle('copyResult', async (payload: unknown) => {
    const { value } = payload as CopyResultPayload
    await core.clipboard.writeText(value)
    return { copied: true }
  })
}
