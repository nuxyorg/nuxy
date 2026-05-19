/** @typedef {import('@nuxy/extension-sdk').CoreContext} CoreContext */
import { safeEvalMath } from './safe-eval.js'

/** @param {CoreContext} core */
export function register(core) {
  core.registry.registerProvider({
    name: 'calculator'
  })

  core.ipc.handle('eval', async (payload) => {
    try {
      const text = payload?.text ?? ''
      if (/^[0-9+\-*/().\s]+$/.test(text) && text.trim() !== '') {
        const result = safeEvalMath(text)
        if (result !== undefined && !Number.isNaN(result)) {
          return {
            items: [
              {
                id: 'calc-result',
                title: `= ${result}`,
                subtitle: 'Calculator Provider',
                value: result
              }
            ]
          }
        }
      }
    } catch {
      // Ignore syntax errors while typing
    }

    return { items: [] }
  })
}
