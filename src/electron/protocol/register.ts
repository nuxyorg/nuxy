import { protocol, net } from 'electron'
import fs from 'fs'
import { resolveExtensionFile } from './resolve.js'
import { createJsonModuleResponse, MODULE_HEADERS } from './response.js'
import { bundleExtensionFrontend } from '../extensions/bundle-frontend.js'
import { kernelLogger } from '@nuxyorg/core'

const log = kernelLogger.child('Protocol')

const bundleCache = new Map<string, { mtime: number; output: string }>()

export function registerProtocols() {
  protocol.handle('nuxy-ext', async (request) => {
    const url = request.url.replace('nuxy-ext://', '')
    const [extId, ...rest] = url.split('/')
    const filePath = rest.join('/')

    if (extId === 'core') {
      const coreVirtualScript = `
        const NuxyCore = window.NuxyCore || {};
        export const {
          createLogger,
          kernelLogger,
          HostChannel,
          resolveLocale,
          flattenTranslations,
          interpolate,
          selectPlural,
          getTextDirection,
          resolveToolElementTag,
          listCompositionProvides,
          listCompositionClaims,
          validateCompositionClaim,
          LitElement,
          html,
          css,
          nothing,
          render,
          svg,
          customElement,
          property,
          state,
          query,
          ref,
          createRef,
          safeHTML,
          safeSVG,
        } = NuxyCore;
      `
      return new Response(coreVirtualScript, { headers: MODULE_HEADERS })
    }

    if (extId === 'sdk') {
      const sdkVirtualScript = `
        const NuxySdk = window.NuxySdk || {};
        export const {
          createStore,
          createTranslator,
          BaseExtensionController,
          getToolOnComplete,
          shouldSuppressBlurHide,
          syncBlurSuppression,
          setToolSearchPlaceholder,
          completeToolAction,
          defineExtension,
          HostChannel,
          getFocusableElements,
          trapTabKey,
          applyUiFontSettings,
          DEFAULT_FONT_FAMILY_MAP,
          resolveFontFamily,
        } = NuxySdk;
      `
      return new Response(sdkVirtualScript, { headers: MODULE_HEADERS })
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
