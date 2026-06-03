const React = window.React

import type { NavSection } from '../types.ts'

export interface SettingsLeftPanelProps {
  navSections: NavSection[]
  activeSectionId: string
  sectionStartIndex: Record<string, number>
  onTabChange: (id: string) => void
}

export function SettingsLeftPanel({
  navSections,
  activeSectionId,
  sectionStartIndex,
  onTabChange,
}: SettingsLeftPanelProps) {
  const { TabBar } = window.UI || {}
  if (!TabBar) return null

  return (
    <TabBar
      tabs={navSections}
      active={activeSectionId}
      orientation="vertical"
      onChange={onTabChange}
    />
  )
}
