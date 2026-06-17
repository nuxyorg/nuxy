#!/usr/bin/env node
import { spawn } from 'child_process'

const prettier = spawn('prettier', ['--write', '.'], { stdio: ['inherit', 'pipe', 'inherit'] })

let buffer = ''
prettier.stdout.on('data', (chunk) => {
  buffer += chunk
  const lines = buffer.split('\n')
  buffer = lines.pop() ?? ''
  for (const line of lines) {
    if (!line.endsWith('(unchanged)')) console.log(line)
  }
})

prettier.on('close', (code) => {
  if (buffer && !buffer.endsWith('(unchanged)')) console.log(buffer)
  process.exit(code ?? 0)
})
