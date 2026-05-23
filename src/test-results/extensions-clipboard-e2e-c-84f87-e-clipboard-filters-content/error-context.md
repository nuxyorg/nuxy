# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: extensions/clipboard/e2e.spec.ts >> clipboard manager >> searching inside clipboard filters content
- Location: ../extensions/clipboard/e2e.spec.ts:49:3

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: "test"
Received: "tet"
```

# Test source

```ts
  1  | import { test, expect, type Page } from '../../src/e2e/fixtures.js'
  2  | 
  3  | async function openTool(page: Page, toolName: string) {
  4  |   await page.keyboard.press('Escape')
  5  |   await page.waitForTimeout(300)
  6  |   await page.keyboard.press('Control+a')
  7  |   await page.keyboard.press('Delete')
  8  |   await page.waitForTimeout(200)
  9  | 
  10 |   await page.keyboard.type(toolName)
  11 |   await page.waitForTimeout(800)
  12 |   await page.keyboard.press('ArrowDown')
  13 |   await page.waitForTimeout(300)
  14 |   await page.keyboard.press('Enter')
  15 |   await page.waitForTimeout(2000)
  16 | }
  17 | 
  18 | test.describe('clipboard manager', () => {
  19 |   test('opens clipboard tool via search', async ({ appPage }) => {
  20 |     await appPage.waitForSelector('input', { timeout: 8000 })
  21 |     await openTool(appPage, 'clipboard')
  22 | 
  23 |     const body = await appPage.evaluate(() => document.body.innerText)
  24 |     expect(body.toLowerCase()).toMatch(/clipboard/)
  25 |   })
  26 | 
  27 |   test('clipboard tool renders list UI', async ({ appPage }) => {
  28 |     await appPage.waitForSelector('input', { timeout: 8000 })
  29 |     await openTool(appPage, 'clipboard')
  30 | 
  31 |     const body = await appPage.evaluate(() => document.body.innerText)
  32 |     expect(body.toLowerCase()).toMatch(/clipboard/)
  33 |   })
  34 | 
  35 |   test('pressing Backspace from clipboard returns to shell', async ({ appPage }) => {
  36 |     await appPage.waitForSelector('input', { timeout: 8000 })
  37 |     await openTool(appPage, 'clipboard')
  38 | 
  39 |     await appPage.keyboard.press('Backspace')
  40 |     await appPage.waitForTimeout(500)
  41 | 
  42 |     const hasToolName = await appPage.evaluate(() => {
  43 |       const el = document.querySelector('.nuxy-shell-omni-bar__tool-name')
  44 |       return el !== null && el.textContent !== ''
  45 |     })
  46 |     expect(hasToolName).toBe(false)
  47 |   })
  48 | 
  49 |   test('searching inside clipboard filters content', async ({ appPage }) => {
  50 |     await appPage.waitForSelector('input', { timeout: 8000 })
  51 |     await openTool(appPage, 'clipboard')
  52 | 
  53 |     await appPage.keyboard.type('test')
  54 |     await appPage.waitForTimeout(600)
  55 | 
  56 |     const inputValue = await appPage.evaluate(
  57 |       () => (document.querySelector('input') as HTMLInputElement | null)?.value ?? ''
  58 |     )
> 59 |     expect(inputValue).toBe('test')
     |                        ^ Error: expect(received).toBe(expected) // Object.is equality
  60 |   })
  61 | })
  62 | 
```