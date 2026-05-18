/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
    "./electron/nuxyconfig.ts",
    "../../packages/ui/src/**/*.{js,ts,jsx,tsx}",
    "../../extensions/**/*.{js,ts,jsx,tsx}"
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base: '#141414',
        },
        syntax: {
          comment: '#333333',
          variable: '#EEFFFF',
          constant: '#FFAA01',
          invalid: '#FF1D64',
          deprecated: '#B04DFF',
          keyword: '#555555',
          operator: '#2AC0FF',
          tag: '#FF00B0',
          function: '#00FECA',
          orange: '#F9672B',
          peach: '#ff8b5a',
        },
        terminal: {
          green: '#CCFF2D',
        }
      }
    },
  },
  plugins: [],
}
