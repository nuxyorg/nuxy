export interface SelectOption {
  value: string
  label: string
}

export const TIME_OPTIONS: SelectOption[] = [
  { value: '8', label: '8:00 AM' },
  { value: '9', label: '9:00 AM' },
  { value: '10', label: '10:00 AM' },
  { value: '11', label: '11:00 AM' },
  { value: '12', label: '12:00 PM' },
  { value: '13', label: '1:00 PM' },
  { value: '14', label: '2:00 PM' },
  { value: '15', label: '3:00 PM' },
  { value: '16', label: '4:00 PM' },
  { value: '17', label: '5:00 PM' },
  { value: '18', label: '6:00 PM' },
  { value: '19', label: '7:00 PM' },
]

export const REMINDER_OPTIONS: SelectOption[] = [
  { value: '0', label: 'No reminder' },
  { value: '5', label: '5 min before' },
  { value: '15', label: '15 min before' },
  { value: '30', label: '30 min before' },
  { value: '60', label: '1 hour before' },
  { value: '1440', label: '1 day before' },
]

/** Returns the display label for a given option value, or '—' if not found. */
export function getOptionLabel(options: SelectOption[], value: string): string {
  return options.find((o) => o.value === value)?.label ?? '—'
}

/** Returns the focused index within an options list for the current value. */
export function getInitialFocusIndex(options: SelectOption[], value: string): number {
  return Math.max(0, options.findIndex((o) => o.value === value))
}
