/** @typedef {import('@nuxy/extension-sdk').CoreContext} CoreContext */

// ─── Timezone city/alias → IANA zone mapping ──────────────────────────────────
const CITY_TO_TZ = {
  // Major world cities
  london: 'Europe/London',
  gmt: 'Europe/London',
  utc: 'UTC',
  'new york': 'America/New_York',
  newyork: 'America/New_York',
  nyc: 'America/New_York',
  'new york city': 'America/New_York',
  'los angeles': 'America/Los_Angeles',
  losangeles: 'America/Los_Angeles',
  la: 'America/Los_Angeles',
  chicago: 'America/Chicago',
  toronto: 'America/Toronto',
  vancouver: 'America/Vancouver',
  montreal: 'America/Toronto',
  'sao paulo': 'America/Sao_Paulo',
  'buenos aires': 'America/Argentina/Buenos_Aires',
  lima: 'America/Lima',
  bogota: 'America/Bogota',
  mexico: 'America/Mexico_City',
  'mexico city': 'America/Mexico_City',
  paris: 'Europe/Paris',
  berlin: 'Europe/Berlin',
  madrid: 'Europe/Madrid',
  rome: 'Europe/Rome',
  amsterdam: 'Europe/Amsterdam',
  brussels: 'Europe/Brussels',
  zurich: 'Europe/Zurich',
  vienna: 'Europe/Vienna',
  stockholm: 'Europe/Stockholm',
  oslo: 'Europe/Oslo',
  copenhagen: 'Europe/Copenhagen',
  helsinki: 'Europe/Helsinki',
  warsaw: 'Europe/Warsaw',
  prague: 'Europe/Prague',
  budapest: 'Europe/Budapest',
  bucharest: 'Europe/Bucharest',
  athens: 'Europe/Athens',
  istanbul: 'Europe/Istanbul',
  ankara: 'Europe/Istanbul',
  moscow: 'Europe/Moscow',
  kiev: 'Europe/Kiev',
  kyiv: 'Europe/Kiev',
  dubai: 'Asia/Dubai',
  riyadh: 'Asia/Riyadh',
  doha: 'Asia/Qatar',
  kuwait: 'Asia/Kuwait',
  karachi: 'Asia/Karachi',
  mumbai: 'Asia/Kolkata',
  delhi: 'Asia/Kolkata',
  bangalore: 'Asia/Kolkata',
  kolkata: 'Asia/Kolkata',
  dhaka: 'Asia/Dhaka',
  kathmandu: 'Asia/Kathmandu',
  colombo: 'Asia/Colombo',
  yangon: 'Asia/Rangoon',
  bangkok: 'Asia/Bangkok',
  jakarta: 'Asia/Jakarta',
  singapore: 'Asia/Singapore',
  kuala: 'Asia/Kuala_Lumpur',
  'kuala lumpur': 'Asia/Kuala_Lumpur',
  manila: 'Asia/Manila',
  taipei: 'Asia/Taipei',
  hong: 'Asia/Hong_Kong',
  'hong kong': 'Asia/Hong_Kong',
  beijing: 'Asia/Shanghai',
  shanghai: 'Asia/Shanghai',
  seoul: 'Asia/Seoul',
  tokyo: 'Asia/Tokyo',
  osaka: 'Asia/Tokyo',
  sydney: 'Australia/Sydney',
  melbourne: 'Australia/Melbourne',
  brisbane: 'Australia/Brisbane',
  perth: 'Australia/Perth',
  auckland: 'Pacific/Auckland',
  honolulu: 'Pacific/Honolulu',
  hawaii: 'Pacific/Honolulu',
  anchorage: 'America/Anchorage',
  seattle: 'America/Los_Angeles',
  denver: 'America/Denver',
  phoenix: 'America/Phoenix',
  dallas: 'America/Chicago',
  houston: 'America/Chicago',
  miami: 'America/New_York',
  boston: 'America/New_York',
  washington: 'America/New_York',
  philadelphia: 'America/New_York',
  atlanta: 'America/New_York',
  detroit: 'America/Detroit',
  // Timezone abbreviations
  est: 'America/New_York',
  edt: 'America/New_York',
  cst: 'America/Chicago',
  cdt: 'America/Chicago',
  mst: 'America/Denver',
  mdt: 'America/Denver',
  pst: 'America/Los_Angeles',
  pdt: 'America/Los_Angeles',
  cet: 'Europe/Paris',
  cest: 'Europe/Paris',
  eet: 'Europe/Athens',
  ist: 'Asia/Kolkata',
  jst: 'Asia/Tokyo',
  kst: 'Asia/Seoul',
  sgt: 'Asia/Singapore',
  aest: 'Australia/Sydney',
  nzst: 'Pacific/Auckland',
}

// ─── Parse helpers ────────────────────────────────────────────────────────────

/**
 * Finds a timezone string from a city/alias name within the query text.
 * Returns { tz, label } or null.
 */
function findTimezone(text) {
  const lower = text.toLowerCase()
  // Try longest match first (multi-word cities)
  const sorted = Object.keys(CITY_TO_TZ).sort((a, b) => b.length - a.length)
  for (const key of sorted) {
    if (lower.includes(key)) {
      return { tz: CITY_TO_TZ[key], label: toTitleCase(key) }
    }
  }
  return null
}

function toTitleCase(str) {
  return str.replace(/\b\w/g, (c) => c.toUpperCase())
}

/**
 * Parse a time string like "12pm", "3:30am", "15:00", "3 pm" into { hours, minutes }.
 * Returns null if no time found.
 */
function parseTime(text) {
  const lower = text.toLowerCase()

  // Match "3:30 pm", "12:00am", "3pm", "15:00", etc.
  const patterns = [
    /(\d{1,2}):(\d{2})\s*(am|pm)/i,
    /(\d{1,2})\s*(am|pm)/i,
    /(\d{1,2}):(\d{2})/,
  ]

  for (const re of patterns) {
    const m = lower.match(re)
    if (m) {
      let hours = parseInt(m[1], 10)
      const mins = m[2] && /\d/.test(m[2]) && m[2].length === 2 ? parseInt(m[2], 10) : 0
      const meridiem = (m[3] || m[2] || '').toLowerCase()

      if (meridiem === 'pm' && hours !== 12) hours += 12
      if (meridiem === 'am' && hours === 12) hours = 0

      return { hours, minutes: mins }
    }
  }
  return null
}

/**
 * Detect whether the query looks like a time-conversion request.
 * Returns true for queries like:
 *  "12pm here in london"
 *  "what time is 9am new york in tokyo"
 *  "3:30 pm paris to istanbul"
 */
function isTimeQuery(text) {
  const lower = text.toLowerCase()
  // Match 12h ("12pm", "3:30am") or 24h ("14:00", "9:00")
  const hasTime =
    /\d{1,2}(:\d{2})?\s*(am|pm)/i.test(lower) || /\b\d{1,2}:\d{2}\b/.test(lower)
  return hasTime
}

/**
 * Extract source timezone from query.
 * Looks for patterns like "... here in CITY", "... from CITY to CITY",
 * or defaults to local if "here" / "my time" is present.
 */
function extractSourceTz(text) {
  const lower = text.toLowerCase()

  // "here in X" → source = local
  if (/\bhere\b/.test(lower) || /\bmy time\b/.test(lower) || /\blocal\b/.test(lower)) {
    return { tz: Intl.DateTimeFormat().resolvedOptions().timeZone, label: 'Local', isLocal: true }
  }

  // "X to Y" or "X in Y" → first city is source
  // We'll parse the first timezone match as destination and leave source as local
  return { tz: Intl.DateTimeFormat().resolvedOptions().timeZone, label: 'Local', isLocal: true }
}

/**
 * Convert a { hours, minutes } in sourceTz to targetTz.
 *
 * Strategy: find the delta between the *desired* wall-clock time in sourceTz
 * and the *current* wall-clock time in sourceTz, then apply that delta to the
 * current UTC instant. This gives us the correct UTC instant for
 * "hours:minutes in sourceTz" regardless of what the local system timezone is.
 */
function convertTime(hours, minutes, sourceTz, targetTz) {
  const now = new Date()

  // Get current hour/minute/second in the source timezone
  const srcParts = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: sourceTz,
  }).formatToParts(now)

  const srcH = parseInt(srcParts.find((p) => p.type === 'hour').value, 10)
  const srcM = parseInt(srcParts.find((p) => p.type === 'minute').value, 10)
  const srcS = parseInt(srcParts.find((p) => p.type === 'second').value, 10)

  // Delta in ms: how far the desired time is from the current source time
  const currentSourceMs = srcH * 3_600_000 + srcM * 60_000 + srcS * 1_000
  const desiredSourceMs = hours * 3_600_000 + minutes * 60_000

  let deltaMs = desiredSourceMs - currentSourceMs

  // Keep within ±12 h to stay on the same day (best-effort for ambiguous midnight)
  if (deltaMs > 43_200_000) deltaMs -= 86_400_000
  if (deltaMs < -43_200_000) deltaMs += 86_400_000

  // The correct UTC instant for "hours:minutes in sourceTz"
  const resultDate = new Date(now.getTime() + deltaMs)

  // Format in target timezone
  const formatted = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: targetTz,
  }).format(resultDate)

  const formatted12h = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: targetTz,
  }).format(resultDate)

  const tzLabel =
    new Intl.DateTimeFormat('en-US', { timeZoneName: 'short', timeZone: targetTz })
      .formatToParts(resultDate)
      .find((p) => p.type === 'timeZoneName')?.value || targetTz

  return { time24: formatted, time12h: formatted12h, tzLabel }
}

/**
 * Format { hours, minutes } as "12:00 PM"
 */
function formatTime12h(hours, minutes) {
  const suffix = hours >= 12 ? 'PM' : 'AM'
  const h = hours % 12 || 12
  const m = String(minutes).padStart(2, '0')
  return `${h}:${m} ${suffix}`
}

// ─── Main register function ────────────────────────────────────────────────────

/** @param {CoreContext} core */
export function register(core) {
  core.registry.registerProvider({
    name: 'time-calculator',
  })

  // ─── In-memory last result (for orchestrator → frontend display) ──────────
  let lastResult = null

  core.ipc.handle('getLastResult', async () => {
    return lastResult
  })

  // Called by the AI orchestrator after a successful tool invocation
  core.ipc.handle('setLastResult', async (data) => {
    lastResult = data
    core.logger.info(`[Time Calculator] Last result updated: ${JSON.stringify(data)}`)
    return { ok: true }
  })

  core.ipc.handle('eval', async (payload) => {
    const text = payload?.text ?? ''

    if (!isTimeQuery(text)) {
      return { items: [] }
    }

    try {
      const parsed = parseTime(text)
      if (!parsed) return { items: [] }

      const dest = findTimezone(text)
      const src = extractSourceTz(text)
      const srcFormatted = formatTime12h(parsed.hours, parsed.minutes)

      // If no destination city recognized, show a hint item prompting the user
      if (!dest) {
        return {
          items: [
            {
              id: 'time-calc-hint',
              title: srcFormatted,
              subtitle: 'Add a city — e.g. "in london", "in tokyo"',
              value: srcFormatted,
            },
          ],
        }
      }

      const result = convertTime(parsed.hours, parsed.minutes, src.tz, dest.tz)

      // The time portion for display (e.g. "10:00")
      const [hh, mm] = result.time24.split(':')
      const displayHour = hh.replace(/^0/, '') || '0'
      const displayTime = `${displayHour}:${mm}`

      return {
        items: [
          {
            id: 'time-calc-result',
            title: `${text} → ${displayTime}`,
            subtitle: `${srcFormatted} → ${result.time12h} (${dest.label}, ${result.tzLabel})`,
            value: result.time12h,
            // Extra metadata for the frontend card renderer
            meta: {
              sourceText: text,
              sourceTime: srcFormatted,
              sourceLabel: src.label,
              destTime: displayTime,
              destTime12h: result.time12h,
              destLabel: dest.label,
              destTzLabel: result.tzLabel,
              left: {
                text: text,
                badge: srcFormatted
              },
              right: {
                text: displayTime,
                badge: `${dest.label}, ${result.tzLabel}`
              }
            },
          },
        ],
      }
    } catch (err) {
      core.logger.error('Time calculator eval failed:', err)
      return { items: [] }
    }
  })

  // Allow AI orchestrator to invoke this tool directly
  core.ipc.handle('convert', async (payload) => {
    const { time, from, to } = payload ?? {}
    if (!time) return { error: 'Missing required parameter: time' }

    // Aliases that mean "local / system timezone"
    const LOCAL_ALIASES = new Set([
      'local', 'local time', 'here', 'my time', 'my timezone', 'current', 'system',
    ])

    const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone

    try {
      const parsed = parseTime(time)
      if (!parsed) return { error: `Could not parse time: ${time}` }

      // Resolve source timezone
      const fromKey = (from ?? '').toLowerCase().trim()
      const fromTz =
        LOCAL_ALIASES.has(fromKey) || !fromKey
          ? localTz
          : (CITY_TO_TZ[fromKey] ?? localTz)

      // Resolve destination timezone
      const toKey = (to ?? '').toLowerCase().trim()
      const toTz =
        LOCAL_ALIASES.has(toKey) || !toKey
          ? localTz
          : CITY_TO_TZ[toKey]

      if (!toTz) return { error: `Unknown timezone/city: "${to}". Try a city name like "london", "tokyo", "new york".` }

      const result = convertTime(parsed.hours, parsed.minutes, fromTz, toTz)
      const srcFormatted = formatTime12h(parsed.hours, parsed.minutes)

      const response = {
        originalTime: srcFormatted,
        convertedTime: result.time12h,
        timezone: toKey,
        tzAbbreviation: result.tzLabel,
        // Rich meta for the frontend card
        meta: {
          sourceText: `${srcFormatted}${fromKey && !LOCAL_ALIASES.has(fromKey) ? ' · ' + toTitleCase(fromKey) : ''}`,
          sourceTime: srcFormatted,
          sourceLabel: fromKey && !LOCAL_ALIASES.has(fromKey) ? toTitleCase(fromKey) : 'Local',
          destTime: result.time24.replace(/^0/, '') || result.time24,
          destTime12h: result.time12h,
          destLabel: toKey ? toTitleCase(toKey) : 'Destination',
          destTzLabel: result.tzLabel,
          left: {
            text: `${srcFormatted}${fromKey && !LOCAL_ALIASES.has(fromKey) ? ' · ' + toTitleCase(fromKey) : ''}`,
            badge: srcFormatted
          },
          right: {
            text: result.time24.replace(/^0/, '') || result.time24,
            badge: `${toKey ? toTitleCase(toKey) : 'Destination'}, ${result.tzLabel}`
          }
        },
      }

      // Persist as last result so the frontend can display it when opened
      lastResult = response
      core.logger.info(`[Time Calculator] convert result stored as lastResult`)

      return response
    } catch (err) {
      return { error: String(err) }
    }
  })
}
