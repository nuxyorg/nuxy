import { parse } from './chunk-ANYOSQ3B.js'
import './chunk-KY3BGQR4.js'
import './chunk-RJNURZT3.js'
import './chunk-2C53MZVT.js'
import './chunk-EUPML56Z.js'
import './chunk-624PUCB4.js'
import './chunk-XIUXAK5W.js'
import './chunk-J2PXKZG6.js'
import './chunk-RBAI7VI4.js'
import './chunk-QBJKEARA.js'
import './chunk-MVTZV4OD.js'
import './chunk-TZ7GS4SL.js'
import { selectSvgElement } from './chunk-NQRC4MUW.js'
import { configureSvgSize } from './chunk-K7N6YW67.js'
import { __name, log } from './chunk-X4LE64DB.js'
import './chunk-R6XR7RJH.js'
import './chunk-EQCVQC35.js'

// ../node_modules/.pnpm/mermaid@11.15.0/node_modules/mermaid/dist/chunks/mermaid.core/infoDiagram-5YYISTIA.mjs
var parser = {
  parse: __name(async (input) => {
    const ast = await parse('info', input)
    log.debug(ast)
  }, 'parse'),
}
var DEFAULT_INFO_DB = {
  version: '11.15.0' + (true ? '' : '-tiny'),
}
var getVersion = __name(() => DEFAULT_INFO_DB.version, 'getVersion')
var db = {
  getVersion,
}
var draw = __name((text, id, version) => {
  log.debug('rendering info diagram\n' + text)
  const svg = selectSvgElement(id)
  configureSvgSize(svg, 100, 400, true)
  const group = svg.append('g')
  group
    .append('text')
    .attr('x', 100)
    .attr('y', 40)
    .attr('class', 'version')
    .attr('font-size', 32)
    .style('text-anchor', 'middle')
    .text(`v${version}`)
}, 'draw')
var renderer = { draw }
var diagram = {
  parser,
  db,
  renderer,
}
export { diagram }
//# sourceMappingURL=infoDiagram-5YYISTIA-AXWPSTK5.js.map
