import type { CommandPaletteAction } from '../types.ts'

export interface CommandPaletteSection {
  id: string
  actions: CommandPaletteAction[]
}

/** Groups a flat action list into Ctrl+K sections (divider boundaries), preserving order. */
export function groupCommandPaletteActions(
  actions: CommandPaletteAction[]
): CommandPaletteSection[] {
  const sections: CommandPaletteSection[] = []

  for (const action of actions) {
    const sectionId = action.section ?? '__default__'
    const last = sections[sections.length - 1]
    if (last && last.id === sectionId) {
      last.actions.push(action)
      continue
    }
    sections.push({
      id: sectionId,
      actions: [action],
    })
  }

  return sections
}

/** Filters actions by query and drops empty sections. */
export function filterCommandPaletteSections(
  actions: CommandPaletteAction[],
  query: string
): CommandPaletteSection[] {
  const q = query.trim().toLowerCase()
  const sections = groupCommandPaletteActions(actions)
  if (!q) return sections

  return sections
    .map((section) => ({
      ...section,
      actions: section.actions.filter((action) => action.label.toLowerCase().includes(q)),
    }))
    .filter((section) => section.actions.length > 0)
}

export function flattenCommandPaletteSections(
  sections: CommandPaletteSection[]
): CommandPaletteAction[] {
  return sections.flatMap((section) => section.actions)
}
