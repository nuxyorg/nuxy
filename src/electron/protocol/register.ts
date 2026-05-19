import { protocol, net } from 'electron'
import fs from 'fs'
import { resolveExtensionFile } from './resolve.js'
import { kernelLogger } from '@nuxy/core'

const log = kernelLogger.child('Protocol')

const transpileCache = new Map<string, { mtime: number; output: string }>()

export function registerProtocols() {
  protocol.handle('nuxy-ext', async (request) => {
    const url = request.url.replace('nuxy-ext://', '')
    const [extId, ...rest] = url.split('/')
    const filePath = rest.join('/')

    const resolved = resolveExtensionFile(extId, filePath)
    if (!resolved) {
      log.warn(`Blocked or missing nuxy-ext resource: ${extId}/${filePath}`)
      return new Response('Forbidden', { status: 403 })
    }

    const { absolutePath } = resolved

    if (
      filePath.endsWith('.js') ||
      filePath.endsWith('.jsx') ||
      filePath.endsWith('.tsx')
    ) {
      try {
        const mtime = fs.statSync(absolutePath).mtimeMs
        const cached = transpileCache.get(absolutePath)
        if (cached && cached.mtime === mtime) {
          return new Response(cached.output, {
            headers: {
              'Content-Type': 'application/javascript',
              'Access-Control-Allow-Origin': '*'
            }
          })
        }

        let code = fs.readFileSync(absolutePath, 'utf8')
        if (
          filePath.endsWith('.jsx') ||
          filePath.endsWith('.tsx') ||
          code.includes('React.createElement') ||
          /<[a-zA-Z]+/.test(code)
        ) {
          let ts: typeof import('typescript') | undefined
          try {
            ts = await import('typescript')
          } catch {
            log.warn(
              'TypeScript not available for transpilation — serving raw file'
            )
          }

          if (ts) {
            const transpiled = ts.transpileModule(code, {
              compilerOptions: {
                jsx: ts.JsxEmit.React,
                module: ts.ModuleKind.ESNext,
                target: ts.ScriptTarget.ESNext
              }
            })
            let output = transpiled.outputText
            if (!output.includes('const React =')) {
              output = `const React = window.React;\n` + output
            }
            transpileCache.set(absolutePath, { mtime, output })
            return new Response(output, {
              headers: {
                'Content-Type': 'application/javascript',
                'Access-Control-Allow-Origin': '*'
              }
            })
          }
        }
      } catch (err) {
        log.error(`Failed to transpile ${absolutePath}`, err)
        return new Response('Internal Server Error', { status: 500 })
      }
    }

    return net.fetch(`file://${absolutePath}`)
  })
}
