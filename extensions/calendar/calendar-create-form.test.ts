import { describe, it, expect } from 'vitest'
import {
  CREATE_FORM_FIELDS,
  isTextInputField,
  isSelectField,
  canSaveCreate,
  enterFormAction,
  navigateSelectFocused,
  nextField,
  prevField,
} from './calendar-create-form.ts'

describe('CREATE_FORM_FIELDS', () => {
  it('starts with title field', () => {
    expect(CREATE_FORM_FIELDS[0]).toBe('title')
  })

  it('contains time and reminder after title', () => {
    expect(CREATE_FORM_FIELDS).toContain('time')
    expect(CREATE_FORM_FIELDS).toContain('reminder')
  })
})

describe('isTextInputField', () => {
  it('returns true for title', () => {
    expect(isTextInputField('title')).toBe(true)
  })

  it('returns false for time', () => {
    expect(isTextInputField('time')).toBe(false)
  })

  it('returns false for reminder', () => {
    expect(isTextInputField('reminder')).toBe(false)
  })
})

describe('isSelectField', () => {
  it('returns true for time', () => {
    expect(isSelectField('time')).toBe(true)
  })

  it('returns true for reminder', () => {
    expect(isSelectField('reminder')).toBe(true)
  })

  it('returns false for title', () => {
    expect(isSelectField('title')).toBe(false)
  })
})

describe('canSaveCreate', () => {
  it('returns true when title is non-empty', () => {
    expect(canSaveCreate('Team meeting')).toBe(true)
  })

  it('returns false when title is empty string', () => {
    expect(canSaveCreate('')).toBe(false)
  })

  it('returns false when title is whitespace only', () => {
    expect(canSaveCreate('   ')).toBe(false)
  })

  it('returns true for a single character title', () => {
    expect(canSaveCreate('x')).toBe(true)
  })
})

describe('enterFormAction', () => {
  it('returns "confirm-select" when a dropdown is open', () => {
    expect(enterFormAction(1, 'time')).toBe('confirm-select')
    expect(enterFormAction(2, 'reminder')).toBe('confirm-select')
  })

  it('returns "advance-field" on the title field (no dropdown open)', () => {
    // title is a text input — Enter moves to next field instead of opening a select
    expect(enterFormAction(0, null)).toBe('advance-field')
  })

  it('returns "open-select" on time field when no dropdown is open', () => {
    expect(enterFormAction(1, null)).toBe('open-select')
  })

  it('returns "open-select" on reminder field when no dropdown is open', () => {
    expect(enterFormAction(2, null)).toBe('open-select')
  })

  it('returns "none" when formFieldIdx is out of range', () => {
    expect(enterFormAction(99, null)).toBe('none')
  })
})

describe('navigateSelectFocused', () => {
  it('moves down within bounds', () => {
    expect(navigateSelectFocused(1, 'down', 5)).toBe(2)
  })

  it('clamps at last option when moving down', () => {
    expect(navigateSelectFocused(4, 'down', 5)).toBe(4)
  })

  it('moves up within bounds', () => {
    expect(navigateSelectFocused(3, 'up', 5)).toBe(2)
  })

  it('clamps at 0 when moving up', () => {
    expect(navigateSelectFocused(0, 'up', 5)).toBe(0)
  })

  it('handles a single-option list without going negative', () => {
    expect(navigateSelectFocused(0, 'down', 1)).toBe(0)
    expect(navigateSelectFocused(0, 'up', 1)).toBe(0)
  })
})

describe('nextField / prevField', () => {
  it('nextField advances within bounds', () => {
    expect(nextField(0)).toBe(1)
    expect(nextField(1)).toBe(2)
  })

  it('nextField clamps at last field index', () => {
    const last = CREATE_FORM_FIELDS.length - 1
    expect(nextField(last)).toBe(last)
  })

  it('prevField goes back within bounds', () => {
    expect(prevField(2)).toBe(1)
    expect(prevField(1)).toBe(0)
  })

  it('prevField clamps at 0', () => {
    expect(prevField(0)).toBe(0)
  })
})
