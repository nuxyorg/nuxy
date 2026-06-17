// @vitest-environment happy-dom

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import './nuxy-markdown-editor.ts'

describe('nuxy-markdown-editor nativeTextarea', () => {
  let editor: HTMLElement & {
    nativeTextarea?: HTMLTextAreaElement | null
    updateComplete?: Promise<boolean>
  }

  beforeEach(async () => {
    editor = document.createElement('nuxy-markdown-editor') as typeof editor
    document.body.appendChild(editor)
    await editor.updateComplete
  })

  afterEach(() => {
    editor.remove()
  })

  it('exposes the textarea after first render', () => {
    expect(editor.nativeTextarea).toBeInstanceOf(HTMLTextAreaElement)
    expect(editor.nativeTextarea?.classList.contains('nuxy-md-editor__textarea')).toBe(true)
  })
})
