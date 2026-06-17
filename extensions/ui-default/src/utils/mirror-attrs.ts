export function mirrorAttrs(el: Element, attrs: readonly string[]): Record<string, string | null> {
  const result: Record<string, string | null> = {}
  for (const attr of attrs) {
    result[attr] = el.hasAttribute(attr) ? (el.getAttribute(attr) ?? '') : null
  }
  return result
}
