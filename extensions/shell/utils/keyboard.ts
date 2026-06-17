/**
 * Traverses recursively through shadow roots to find the actual focused element.
 */
export function getDeepActiveElement(root: DocumentOrShadowRoot = document): Element | null {
  const activeEl = root.activeElement
  if (!activeEl) return null
  if (activeEl.shadowRoot) {
    return getDeepActiveElement(activeEl.shadowRoot)
  }
  return activeEl
}

/**
 * Checks if the element is a text entry, select box, or a rich text editor.
 */
export function isWritingElement(el: Element | null): boolean {
  if (!el?.tagName) return false

  const tagName = el.tagName.toLowerCase()

  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    const type = el.getAttribute('type')?.toLowerCase()
    const nonWritingTypes = ['button', 'checkbox', 'radio', 'submit', 'reset', 'file', 'image']
    return !type || !nonWritingTypes.includes(type)
  }

  if (el.hasAttribute('contenteditable') && el.getAttribute('contenteditable') !== 'false') {
    return true
  }

  return false
}
