export const CREATE_FORM_FIELDS = ['title', 'time', 'reminder'] as const
export type CreateFormField = (typeof CREATE_FORM_FIELDS)[number]

export function isTextInputField(field: string): boolean {
  return field === 'title'
}

export function isSelectField(field: string): boolean {
  return field === 'time' || field === 'reminder'
}

export function canSaveCreate(title: string): boolean {
  return title.trim().length > 0
}

export type EnterFormAction = 'confirm-select' | 'advance-field' | 'open-select' | 'none'

export function enterFormAction(
  formFieldIdx: number,
  activeSelect: string | null
): EnterFormAction {
  if (activeSelect !== null) return 'confirm-select'
  const field = CREATE_FORM_FIELDS[formFieldIdx]
  if (!field) return 'none'
  if (isTextInputField(field)) return 'advance-field'
  return 'open-select'
}

export function navigateSelectFocused(
  current: number,
  direction: 'up' | 'down',
  optionsCount: number
): number {
  if (direction === 'down') return Math.min(optionsCount - 1, current + 1)
  return Math.max(0, current - 1)
}

export function nextField(current: number): number {
  return Math.min(CREATE_FORM_FIELDS.length - 1, current + 1)
}

export function prevField(current: number): number {
  return Math.max(0, current - 1)
}
