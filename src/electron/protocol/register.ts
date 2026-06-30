import { protocol, net } from 'electron'
import fs from 'fs'
import { kernelLogger } from '@nuxyorg/core'
import { listNuxyCoreRuntimeExportNames } from '@nuxyorg/core/runtime-export-names'
import { listNuxySdkRuntimeExportNames } from '@nuxyorg/extension-sdk/runtime-export-names'
import { resolveExtensionFile } from './resolve.js'
import { createJsonModuleResponse, MODULE_HEADERS } from './response.js'
import { bundleExtensionFrontend } from '../extensions/bundle-frontend.js'
import { buildRuntimeVirtualModule } from './virtual-runtime-module.js'

const log = kernelLogger.child('Protocol')

const bundleCache = new Map<string, { mtime: number; output: string }>()
const CORE_VIRTUAL_SCRIPT = buildRuntimeVirtualModule('NuxyCore', listNuxyCoreRuntimeExportNames())
const SDK_VIRTUAL_SCRIPT = buildRuntimeVirtualModule('NuxySdk', listNuxySdkRuntimeExportNames())

export function registerProtocols() {
  protocol.handle('nuxy-ext', async (request) => {
    const url = request.url.replace('nuxy-ext://', '')
    const [extId, ...rest] = url.split('/')
    const filePath = rest.join('/')

    if (extId === 'core') {
      return new Response(CORE_VIRTUAL_SCRIPT, { headers: MODULE_HEADERS })
    }

    if (extId === 'sdk') {
      return new Response(SDK_VIRTUAL_SCRIPT, { headers: MODULE_HEADERS })
    }

    const resolved = resolveExtensionFile(extId, filePath)
    if (!resolved) {
      log.warn(`Blocked or missing nuxy-ext resource: ${extId}/${filePath}`)
      return new Response('Forbidden', { status: 403 })
    }

    const { absolutePath, extDir } = resolved

    const isScript =
      absolutePath.endsWith('.js') ||
      absolutePath.endsWith('.jsx') ||
      absolutePath.endsWith('.mjs') ||
      absolutePath.endsWith('.ts') ||
      absolutePath.endsWith('.tsx')

    if (isScript) {
      try {
        if (absolutePath.endsWith('.js') || absolutePath.endsWith('.mjs')) {
          const code = fs.readFileSync(absolutePath, 'utf8')
          return new Response(code, { headers: MODULE_HEADERS })
        }

        const mtime = fs.statSync(absolutePath).mtimeMs
        const cached = bundleCache.get(absolutePath)
        if (cached && cached.mtime === mtime) {
          return new Response(cached.output, { headers: MODULE_HEADERS })
        }

        const output = await bundleExtensionFrontend(absolutePath, extDir)
        bundleCache.set(absolutePath, { mtime, output })
        return new Response(output, { headers: MODULE_HEADERS })
      } catch (err) {
        log.error(`Failed to bundle ${absolutePath}`, err)
        return new Response('Internal Server Error', { status: 500 })
      }
    }

    if (absolutePath.endsWith('.json')) {
      try {
        return createJsonModuleResponse(absolutePath)
      } catch (err) {
        log.error(`Failed to serve JSON module ${absolutePath}`, err)
        return new Response('Internal Server Error', { status: 500 })
      }
    }

    const response = await net.fetch(`file://${absolutePath}`)
    const headers = new Headers(response.headers)
    headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
    headers.set('Pragma', 'no-cache')
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  })
}
