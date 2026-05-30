import fs from 'fs'
import path from 'path'
import ts from 'typescript'

const absolutePath = path.resolve('/home/xava/Documents/nuxy/extensions/gradient/frontend.tsx')
const code = fs.readFileSync(absolutePath, 'utf8')

const needsJsx = true
const transpiled = ts.transpileModule(code, {
  compilerOptions: {
    jsx: ts.JsxEmit.React,
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ESNext,
  },
})

let output = transpiled.outputText
if (needsJsx && !output.includes('const React =')) {
  output = `const React = window.React;\n` + output
}

console.log('--- OUTPUT ---')
console.log(output)
