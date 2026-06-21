export const TOOL_SEARCH_PLACEHOLDER_KEY = 'search.placeholder'

export async function loadToolSearchPlaceholder(extId: string): Promise<string | null> {
  const res = (await window.core?.ipc?.invoke('kernel', 'getExtensionTranslations', {
    extId,
  })) as { success?: boolean; data?: { translations?: Record<string, string> } } | undefined
  if (!res?.success || !res.data) return null
  const text = res.data.translations?.[TOOL_SEARCH_PLACEHOLDER_KEY]
  if (!text || text === TOOL_SEARCH_PLACEHOLDER_KEY) return null
  return text
}

/** Fetch a tool locale placeholder from the kernel and apply it when still active. */
export function syncToolSearchPlaceholder(extId: string, isStillActive: () => boolean): void {
  void loadToolSearchPlaceholder(extId).then((text) => {
    if (!isStillActive() || !text) return
    window.core?.shell?.setSearchPlaceholder(text)
  })
}
