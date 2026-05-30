import type { CoreContext } from '@nuxy/extension-sdk'
import { safeEvalMath } from './safe-eval.ts'
import type { EvalResult } from './types.ts'

export function register(core: CoreContext): void {
  core.registry.registerProvider({
    name: 'calculator',
  })

  core.ipc.handle('eval', async (payload: unknown): Promise<EvalResult> => {
    try {
      const text = (payload as { text?: string } | null | undefined)?.text ?? ''
      if (/^[0-9+\-*/().\s]+$/.test(text) && text.trim() !== '') {
        const result = safeEvalMath(text)
        if (result !== undefined && !Number.isNaN(result)) {
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
      }
    } catch {
      // Ignore syntax errors while typing
    }

    return { items: [] }
  })
}
