import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const themesDir = path.join(__dirname, 'themes')

function loadTheme(name) {
  return JSON.parse(
    fs.readFileSync(path.join(themesDir, name), 'utf8')
  )
}

const darkTheme = loadTheme('default-dark.json')
const lightTheme = loadTheme('default-light.json')

/** Tailwind JIT only emits classes it finds in scanned sources or the safelist. */
function classesFromTheme(theme) {
  return Object.values(theme.styles ?? {})
    .join(' ')
    .split(/\s+/)
    .filter(Boolean)
}

const themeSafelist = [
  ...new Set([
    ...classesFromTheme(darkTheme),
    ...classesFromTheme(lightTheme)
  ])
]

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
    './themes/**/*.json',
    '../packages/ui/src/**/*.{js,ts,jsx,tsx}',
    '../extensions/**/*.{js,ts,jsx,tsx}'
  ],
  safelist: themeSafelist,
  theme: {
    extend: {
      colors: {
        bg: {
          base: darkTheme.colors['bg-base']
        },
        syntax: {
          comment: darkTheme.colors['syntax-comment'],
          variable: darkTheme.colors['syntax-variable'],
          constant: darkTheme.colors['syntax-constant'],
          invalid: darkTheme.colors['syntax-invalid'],
          deprecated: darkTheme.colors['syntax-deprecated'],
          keyword: darkTheme.colors['syntax-keyword'],
          operator: darkTheme.colors['syntax-operator'],
          tag: darkTheme.colors['syntax-tag'],
          function: darkTheme.colors['syntax-function'],
          orange: darkTheme.colors['syntax-orange'],
          peach: darkTheme.colors['syntax-peach'],
          green: darkTheme.colors['syntax-green']
        }
      },
      keyframes: {
        'cursor-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' }
        }
      },
      animation: {
        'cursor-blink': 'cursor-blink 1s step-start infinite'
      }
    }
  },
  plugins: []
}
