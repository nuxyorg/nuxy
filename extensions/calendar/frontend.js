const { useState, useEffect } = window.React
const h = window.React.createElement

const REMINDER_OPTIONS = [
  { label: 'None', value: 0 },
  { label: '5 min', value: 5 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '1 hr', value: 60 },
  { label: '1 day', value: 1440 },
]

function formatDatetimeLocal(ts) {
  if (!ts) return ''
  const d = new Date(ts)
  const pad = (n) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function formatDisplay(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function EmptyState() {
  return h('div', { style: { padding: '16px', color: 'var(--color-text-muted, #888)', textAlign: 'center' } },
    'No upcoming events in the next 7 days.'
  )
}

export default function CalendarApp() {
  const [events, setEvents] = useState([])
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ title: '', datetime: '', notes: '', remindMin: 0 })

  function loadEvents() {
    const from = Date.now()
    const to = from + 7 * 24 * 60 * 60 * 1000
    window.core.ipc.invoke('com.nuxy.calendar', 'calendar:list', { from, to })
      .then((evts) => setEvents(evts || []))
      .catch(() => {})
  }

  useEffect(() => { loadEvents() }, [])

  function openNewForm() {
    setEditing(null)
    setForm({ title: '', datetime: '', notes: '', remindMin: 0 })
    setShowForm(true)
  }

  function openEditForm(evt) {
    setEditing(evt)
    setForm({
      title: evt.title,
      datetime: formatDatetimeLocal(evt.datetime),
      notes: evt.notes,
      remindMin: evt.remindMin,
    })
    setShowForm(true)
  }

  function closeForm() {
    setShowForm(false)
    setEditing(null)
  }

  async function handleSave() {
    if (!form.title.trim() || !form.datetime) return
    const datetimeMs = new Date(form.datetime).getTime()
    if (editing) {
      await window.core.ipc.invoke('com.nuxy.calendar', 'calendar:update', {
        id: editing.id,
        title: form.title,
        datetime: datetimeMs,
        notes: form.notes,
        remindMin: Number(form.remindMin),
      })
    } else {
      await window.core.ipc.invoke('com.nuxy.calendar', 'calendar:create', {
        title: form.title,
        datetime: datetimeMs,
        notes: form.notes,
        remindMin: Number(form.remindMin),
      })
    }
    closeForm()
    loadEvents()
  }

  async function handleDelete() {
    if (!editing) return
    await window.core.ipc.invoke('com.nuxy.calendar', 'calendar:delete', { id: editing.id })
    closeForm()
    loadEvents()
  }

  const todayLabel = new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })

  return h('div', { style: { fontFamily: 'var(--font-family, sans-serif)', padding: '12px', minWidth: 320 } },
    h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 } },
      h('span', { style: { fontWeight: 600, fontSize: 14, color: 'var(--color-text, #eee)' } }, todayLabel),
      h('button', {
        onClick: openNewForm,
        style: {
          background: 'var(--color-accent, #7c6eee)',
          color: '#fff', border: 'none', borderRadius: 6,
          padding: '4px 12px', cursor: 'pointer', fontSize: 13,
        },
      }, '+ New Event')
    ),
    !showForm && (
      events.length === 0
        ? h(EmptyState, null)
        : h('ul', { style: { listStyle: 'none', margin: 0, padding: 0 } },
            events.map((evt) =>
              h('li', {
                key: evt.id,
                onClick: () => openEditForm(evt),
                style: {
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '8px 10px', borderRadius: 6, cursor: 'pointer',
                  marginBottom: 4,
                  background: 'var(--color-surface, rgba(255,255,255,0.06))',
                },
              },
                h('span', { style: { fontSize: 12, color: 'var(--color-text-muted, #888)', minWidth: 100 } },
                  formatDisplay(evt.datetime)
                ),
                h('span', { style: { flex: 1, fontSize: 13, color: 'var(--color-text, #eee)' } }, evt.title),
                evt.remindMin > 0 && h('span', { title: `Reminder: ${evt.remindMin} min before` }, '🔔')
              )
            )
          )
    ),
    showForm && h('div', { style: { display: 'flex', flexDirection: 'column', gap: 8 } },
      h('input', {
        placeholder: 'Title',
        value: form.title,
        onChange: (e) => setForm({ ...form, title: e.target.value }),
        style: { padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border, #444)', background: 'var(--color-input, #222)', color: 'var(--color-text, #eee)', fontSize: 13 },
      }),
      h('input', {
        type: 'datetime-local',
        value: form.datetime,
        onChange: (e) => setForm({ ...form, datetime: e.target.value }),
        style: { padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border, #444)', background: 'var(--color-input, #222)', color: 'var(--color-text, #eee)', fontSize: 13 },
      }),
      h('textarea', {
        placeholder: 'Notes (optional)',
        value: form.notes,
        rows: 2,
        onChange: (e) => setForm({ ...form, notes: e.target.value }),
        style: { padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border, #444)', background: 'var(--color-input, #222)', color: 'var(--color-text, #eee)', fontSize: 13, resize: 'vertical' },
      }),
      h('select', {
        value: form.remindMin,
        onChange: (e) => setForm({ ...form, remindMin: Number(e.target.value) }),
        style: { padding: '6px 10px', borderRadius: 6, border: '1px solid var(--color-border, #444)', background: 'var(--color-input, #222)', color: 'var(--color-text, #eee)', fontSize: 13 },
      }, REMINDER_OPTIONS.map((o) => h('option', { key: o.value, value: o.value }, o.label))),
      h('div', { style: { display: 'flex', gap: 8 } },
        h('button', {
          onClick: handleSave,
          style: { flex: 1, padding: '6px 0', borderRadius: 6, border: 'none', background: 'var(--color-accent, #7c6eee)', color: '#fff', cursor: 'pointer', fontSize: 13 },
        }, 'Save'),
        editing && h('button', {
          onClick: handleDelete,
          style: { padding: '6px 16px', borderRadius: 6, border: 'none', background: 'var(--color-danger, #e05555)', color: '#fff', cursor: 'pointer', fontSize: 13 },
        }, 'Delete'),
        h('button', {
          onClick: closeForm,
          style: { padding: '6px 16px', borderRadius: 6, border: '1px solid var(--color-border, #444)', background: 'transparent', color: 'var(--color-text, #eee)', cursor: 'pointer', fontSize: 13 },
        }, 'Cancel')
      )
    )
  )
}
