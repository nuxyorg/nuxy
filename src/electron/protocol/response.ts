import fs from 'fs'

export const MODULE_HEADERS = {
  'Content-Type': 'application/javascript',
  'Access-Control-Allow-Origin': '*',
  'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
  Pragma: 'no-cache',
} as const

export function createJsonModuleResponse(absolutePath: string): Response {
  const json = fs.readFileSync(absolutePath, 'utf8')
  JSON.parse(json)
  return new Response(`export default ${json};`, { headers: MODULE_HEADERS })
}
