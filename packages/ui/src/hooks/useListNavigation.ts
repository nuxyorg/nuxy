import { useState, useCallback } from 'react'
import { KeyAction } from './useToolKeyActions'

export interface UseListNavigationOptions<T> {
  onEnter?: (item: T, index: number) => void
  enterLabel?: string
  enterHint?: string
  loop?: boolean
  extraActions?: KeyAction[]
}

export interface UseListNavigationResult<T> {
  selectedIndex: number
  setSelectedIndex: React.Dispatch<React.SetStateAction<number>>
  selectedItem: T | null
}

export function useListNavigation(...args: any[]): any {
  return (window.UI as any)?.useListNavigation
    ? (window.UI as any).useListNavigation(...args)
    : ({} as any)
}
