export async function resetShell(page: any) {
  await page.evaluate(() => {
    window.dispatchEvent(new CustomEvent('nuxy-shell-reset'))
  })
  await page.waitForFunction(
    () => {
      const toolName = document.querySelector('.nuxy-shell-omni-bar__tool-name')
      const palette = document.querySelector('.nuxy-command-palette')
      const input = document.querySelector('input') as HTMLInputElement | null
      return toolName === null && palette === null && (input?.value ?? '') === ''
    },
    { timeout: 400 }
  )
  await page.locator('input').focus()
}

export async function openTool(page: any, name: string) {
  await resetShell(page)
  await page.keyboard.type(name)
  const option = page.locator('[role="option"]', { hasText: name })
  await option.first().click()
  await page.waitForSelector('.nuxy-shell-tool-wrapper', { timeout: 400 })
  await page.locator('input').focus()
}
