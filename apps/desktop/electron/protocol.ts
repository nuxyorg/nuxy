import { protocol, net } from 'electron';
import path from 'path';
import fs from 'fs';
import { EXTENSION_DIR } from './config.js';

export function registerProtocols() {
  protocol.handle('nuxy-ext', async (request) => {
    // URL format: nuxy-ext://<extId>/<filePath>
    const url = request.url.replace('nuxy-ext://', '');
    const [extId, ...rest] = url.split('/');
    const filePath = rest.join('/');
    
    const absolutePath = path.resolve(EXTENSION_DIR, extId, filePath);

    if (filePath.endsWith('.js') || filePath.endsWith('.jsx') || filePath.endsWith('.tsx')) {
      try {
        if (fs.existsSync(absolutePath)) {
          let code = fs.readFileSync(absolutePath, 'utf8');
          // If the file is JSX or has JSX/TSX tags, transpile it!
          if (filePath.endsWith('.jsx') || filePath.endsWith('.tsx') || code.includes('React.createElement') || /<[a-zA-Z]+/.test(code)) {
            let ts: any;
            try {
              ts = (await import('typescript')).default;
            } catch (err) {
              console.warn('TypeScript module not found for dynamic transpilation, serving raw file.');
            }

            if (ts) {
              const transpiled = ts.transpileModule(code, {
                compilerOptions: {
                  jsx: ts.JsxEmit.React,
                  module: ts.ModuleKind.ESNext,
                  target: ts.ScriptTarget.ESNext
                }
              });
              let output = transpiled.outputText;
              // Prepend React global reference to support JSX without imports
              if (!output.includes('const React =')) {
                output = `const React = window.React;\n` + output;
              }
              return new Response(output, {
                headers: { 
                  'Content-Type': 'application/javascript',
                  'Access-Control-Allow-Origin': '*'
                }
              });
            }
          }
        }
      } catch (err) {
        console.error(`Failed to dynamically transpile extension file ${absolutePath}:`, err);
      }
    }
    
    return net.fetch(`file://${absolutePath}`);
  });
}
