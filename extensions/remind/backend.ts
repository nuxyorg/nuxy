import type { CoreContext } from '@nuxy/extension-sdk'
import type { Reminder, CreatePayload, CancelPayload, ParsePayload, ParsedReminder } from './types.ts'
import { parseReminder } from './utils/parseReminder.ts'

const STORAGE_FILE = 'reminders.json'

export function register(core: CoreContext): void {
  // In-memory map of active timeouts keyed by reminder id
  const timers = new Map<string, ReturnType<typeof setTimeout>>()

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  async function loadReminders(): Promise<Reminder[]> {
    return (await core.storage.read<Reminder[]>(STORAGE_FILE)) ?? []
  }

  async function saveReminders(reminders: Reminder[]): Promise<void> {
    await core.storage.write<Reminder[]>(STORAGE_FILE, reminders)
  }

  function scheduleTimer(reminder: Reminder): void {
    const delayMs = reminder.fireAt - Date.now()
    if (delayMs <= 0) {
      // Already overdue — fire immediately (async)
      void fireReminder(reminder.id)
      return
    }

    const handle = setTimeout(() => {
      void fireReminder(reminder.id)
    }, delayMs)

    timers.set(reminder.id, handle)
  }

  async function fireReminder(id: string): Promise<void> {
    timers.delete(id)

    const reminders = await loadReminders()
    const reminder = reminders.find((r) => r.id === id)
    if (!reminder || reminder.fired) return

    reminder.fired = true
    await saveReminders(reminders)

    const title = core.i18n.t('notification.title')
    const body = reminder.label || core.i18n.t('notification.defaultBody')
    core.notifications.send({ title, body })
    core.logger.info('Reminder fired', { id, label: reminder.label })
  }

  // -------------------------------------------------------------------------
  // Startup: reload persisted reminders and reschedule pending ones
  // -------------------------------------------------------------------------

  void (async () => {
    try {
      const reminders = await loadReminders()
      const now = Date.now()
      for (const reminder of reminders) {
        if (!reminder.fired) {
          if (reminder.fireAt > now) {
            scheduleTimer(reminder)
          } else {
            // Missed while the app was closed — fire immediately
            void fireReminder(reminder.id)
          }
        }
      }
      core.logger.info('Remind: loaded reminders', { count: reminders.length })
    } catch (err) {
      core.logger.error('Remind: failed to load reminders on startup', err)
    }
  })()

  // -------------------------------------------------------------------------
  // Tool registration
  // -------------------------------------------------------------------------

  core.registry.registerTool({ name: 'remind' })

  // -------------------------------------------------------------------------
  // IPC handlers
  // -------------------------------------------------------------------------

  core.ipc.handle('remind:parse', async (payload: unknown): Promise<ParsedReminder | null> => {
    const { text } = payload as ParsePayload
    return parseReminder(text)
  })

  core.ipc.handle('remind:create', async (payload: unknown): Promise<Reminder> => {
    const { text } = payload as CreatePayload
    const parsed = parseReminder(text)
    if (!parsed) {
      throw new Error(core.i18n.t('error.invalidFormat'))
    }

    const reminder: Reminder = {
      id: crypto.randomUUID(),
      label: parsed.label || core.i18n.t('label.unnamed'),
      fireAt: parsed.fireAt,
      createdAt: Date.now(),
      fired: false,
    }

    const reminders = await loadReminders()
    reminders.push(reminder)
    await saveReminders(reminders)

    scheduleTimer(reminder)
    core.logger.info('Reminder created', { id: reminder.id, label: reminder.label, fireAt: reminder.fireAt })

    return reminder
  })

  core.ipc.handle('remind:list', async (): Promise<Reminder[]> => {
    const reminders = await loadReminders()
    // Return only active (not-yet-fired) reminders, sorted by fireAt ascending
    return reminders.filter((r) => !r.fired).sort((a, b) => a.fireAt - b.fireAt)
  })

  core.ipc.handle('remind:cancel', async (payload: unknown): Promise<void> => {
    const { id } = payload as CancelPayload

    const handle = timers.get(id)
    if (handle !== undefined) {
      clearTimeout(handle)
      timers.delete(id)
    }

    const reminders = await loadReminders()
    const idx = reminders.findIndex((r) => r.id === id)
    if (idx === -1) return

    // Mark as fired so it won't be rescheduled on restart
    reminders[idx].fired = true
    await saveReminders(reminders)

    core.logger.info('Reminder cancelled', { id })
  })
}
