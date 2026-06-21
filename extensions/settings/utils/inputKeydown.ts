/* cspell:ignore Blurrable */
interface KeydownLike {
  key: string
  stopPropagation: () => void
}

interface BlurrableInput {
  blur: () => void
}

/**
 * Handles Enter/Escape inside a settings text/color input: blurs the field
 * and returns focus to list navigation. `stopPropagation` is required on
 * Escape so the keystroke doesn't also bubble to the shell's global Escape
 * handler, which would otherwise close the whole settings tool in addition
 * to leaving the field.
 */
export function handleSettingsInputKeydown(e: KeydownLike, input: BlurrableInput): void {
  if (e.key === 'Enter' || e.key === 'Escape') {
    if (e.key === 'Escape') e.stopPropagation()
    input.blur()
  }
}

interface ListAddInput extends BlurrableInput {
  value: string
}

/**
 * Handles keydown inside a `type: "list"` field's add input: Enter appends
 * the current text and clears the field (ready for the next item); Escape
 * blurs without adding, consuming the event so it doesn't also bubble to the
 * shell's global Escape handler.
 */
export function handleListAddInputKeydown(
  e: KeydownLike,
  input: ListAddInput,
  onAdd: (value: string) => void
): void {
  if (e.key === 'Enter') {
    onAdd(input.value)
    input.value = ''
    return
  }
  if (e.key === 'Escape') {
    e.stopPropagation()
    input.blur()
  }
}
