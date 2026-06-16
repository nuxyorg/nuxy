import type { CoreContext } from '@nuxyorg/extension-sdk'
import { safeEvalMath } from './safe-eval.ts'
import type { EvalResult } from './types.ts'

export function register(core: CoreContext): void {
  core.registry.registerProvider({
    name: 'calculator',
  })

  core.ipc.handle('eval', async (payload: unknown): Promise<EvalResult> => {
    const text = (payload as { text?: string } | null | undefined)?.text ?? ''
    const result = safeEvalMath(text)
    if (!Number.isNaN(result)) {
      return {
        items: [
          {
            id: 'calc-result',
            title: `= ${result}`,
            subtitle: 'Calculator Provider',
            value: result,
          },
        ],
      }
    }
    return { items: [] }
  })
}
