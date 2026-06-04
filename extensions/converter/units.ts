import type { UnitCategory, UnitSystem, ConversionResult } from './types.ts'

export type ConvertFn = (v: number) => number

export interface UnitEntry {
  symbol: string
  label: string
  aliases: string[]
  system: 'metric' | 'imperial' | 'both'
  toBase: ConvertFn
  fromBase: ConvertFn
}

export interface CategoryDef {
  name: string
  baseUnit: string
  units: Record<string, UnitEntry>
}

// ─── Category definitions ─────────────────────────────────────────────────────

const CATEGORIES: Record<UnitCategory, CategoryDef> = {
  length: {
    name: 'length',
    baseUnit: 'm',
    units: {
      m: {
        symbol: 'm',
        label: 'Meters',
        aliases: ['meter', 'meters', 'metre', 'metres'],
        system: 'metric',
        toBase: (v) => v,
        fromBase: (v) => v,
      },
      km: {
        symbol: 'km',
        label: 'Kilometers',
        aliases: ['kilometer', 'kilometers', 'kilometre', 'kilometres'],
        system: 'metric',
        toBase: (v) => v * 1000,
        fromBase: (v) => v / 1000,
      },
      cm: {
        symbol: 'cm',
        label: 'Centimeters',
        aliases: ['centimeter', 'centimeters', 'centimetre', 'centimetres'],
        system: 'metric',
        toBase: (v) => v * 0.01,
        fromBase: (v) => v / 0.01,
      },
      mm: {
        symbol: 'mm',
        label: 'Millimeters',
        aliases: ['millimeter', 'millimeters', 'millimetre', 'millimetres'],
        system: 'metric',
        toBase: (v) => v * 0.001,
        fromBase: (v) => v / 0.001,
      },
      mi: {
        symbol: 'mi',
        label: 'Miles',
        aliases: ['mile', 'miles'],
        system: 'imperial',
        toBase: (v) => v * 1609.344,
        fromBase: (v) => v / 1609.344,
      },
      ft: {
        symbol: 'ft',
        label: 'Feet',
        aliases: ['foot', 'feet'],
        system: 'imperial',
        toBase: (v) => v * 0.3048,
        fromBase: (v) => v / 0.3048,
      },
      in: {
        symbol: 'in',
        label: 'Inches',
        aliases: ['inch', 'inches'],
        system: 'imperial',
        toBase: (v) => v * 0.0254,
        fromBase: (v) => v / 0.0254,
      },
      yd: {
        symbol: 'yd',
        label: 'Yards',
        aliases: ['yard', 'yards'],
        system: 'imperial',
        toBase: (v) => v * 0.9144,
        fromBase: (v) => v / 0.9144,
      },
    },
  },

  weight: {
    name: 'weight',
    baseUnit: 'g',
    units: {
      g: {
        symbol: 'g',
        label: 'Grams',
        aliases: ['gram', 'grams'],
        system: 'metric',
        toBase: (v) => v,
        fromBase: (v) => v,
      },
      kg: {
        symbol: 'kg',
        label: 'Kilograms',
        aliases: ['kilogram', 'kilograms'],
        system: 'metric',
        toBase: (v) => v * 1000,
        fromBase: (v) => v / 1000,
      },
      mg: {
        symbol: 'mg',
        label: 'Milligrams',
        aliases: ['milligram', 'milligrams'],
        system: 'metric',
        toBase: (v) => v * 0.001,
        fromBase: (v) => v / 0.001,
      },
      lb: {
        symbol: 'lb',
        label: 'Pounds',
        aliases: ['pound', 'pounds', 'lbs'],
        system: 'imperial',
        toBase: (v) => v * 453.592,
        fromBase: (v) => v / 453.592,
      },
      oz: {
        symbol: 'oz',
        label: 'Ounces',
        aliases: ['ounce', 'ounces'],
        system: 'imperial',
        toBase: (v) => v * 28.3495,
        fromBase: (v) => v / 28.3495,
      },
    },
  },

  temperature: {
    name: 'temperature',
    baseUnit: 'c',
    units: {
      c: {
        symbol: '°C',
        label: 'Celsius',
        aliases: ['celsius', '°c', 'deg c', 'degc'],
        system: 'both',
        toBase: (v) => v,
        fromBase: (v) => v,
      },
      f: {
        symbol: '°F',
        label: 'Fahrenheit',
        aliases: ['fahrenheit', '°f', 'deg f', 'degf'],
        system: 'both',
        toBase: (v) => ((v - 32) * 5) / 9,
        fromBase: (v) => (v * 9) / 5 + 32,
      },
      k: {
        symbol: 'K',
        label: 'Kelvin',
        aliases: ['kelvin', '°k'],
        system: 'both',
        toBase: (v) => v - 273.15,
        fromBase: (v) => v + 273.15,
      },
    },
  },

  area: {
    name: 'area',
    baseUnit: 'm2',
    units: {
      m2: {
        symbol: 'm²',
        label: 'Square Meters',
        aliases: [
          'm²',
          'sqm',
          'sq m',
          'square meter',
          'square meters',
          'square metre',
          'square metres',
        ],
        system: 'metric',
        toBase: (v) => v,
        fromBase: (v) => v,
      },
      km2: {
        symbol: 'km²',
        label: 'Square Kilometers',
        aliases: ['km²', 'sqkm', 'sq km', 'square kilometer', 'square kilometers'],
        system: 'metric',
        toBase: (v) => v * 1e6,
        fromBase: (v) => v / 1e6,
      },
      cm2: {
        symbol: 'cm²',
        label: 'Square Centimeters',
        aliases: ['cm²', 'sqcm', 'sq cm', 'square centimeter', 'square centimeters'],
        system: 'metric',
        toBase: (v) => v * 0.0001,
        fromBase: (v) => v / 0.0001,
      },
      ft2: {
        symbol: 'ft²',
        label: 'Square Feet',
        aliases: ['ft²', 'sqft', 'sq ft', 'square foot', 'square feet'],
        system: 'imperial',
        toBase: (v) => v * 0.092903,
        fromBase: (v) => v / 0.092903,
      },
      mi2: {
        symbol: 'mi²',
        label: 'Square Miles',
        aliases: ['mi²', 'sqmi', 'sq mi', 'square mile', 'square miles'],
        system: 'imperial',
        toBase: (v) => v * 2589988.110336,
        fromBase: (v) => v / 2589988.110336,
      },
      acre: {
        symbol: 'ac',
        label: 'Acres',
        aliases: ['acres', 'ac'],
        system: 'imperial',
        toBase: (v) => v * 4046.856,
        fromBase: (v) => v / 4046.856,
      },
    },
  },

  volume: {
    name: 'volume',
    baseUnit: 'l',
    units: {
      l: {
        symbol: 'L',
        label: 'Liters',
        aliases: ['liter', 'liters', 'litre', 'litres'],
        system: 'metric',
        toBase: (v) => v,
        fromBase: (v) => v,
      },
      ml: {
        symbol: 'mL',
        label: 'Milliliters',
        aliases: ['milliliter', 'milliliters', 'millilitre', 'millilitres'],
        system: 'metric',
        toBase: (v) => v * 0.001,
        fromBase: (v) => v / 0.001,
      },
      cl: {
        symbol: 'cL',
        label: 'Centiliters',
        aliases: ['centiliter', 'centiliters', 'centilitre', 'centilitres'],
        system: 'metric',
        toBase: (v) => v * 0.01,
        fromBase: (v) => v / 0.01,
      },
      gal: {
        symbol: 'gal',
        label: 'Gallons',
        aliases: ['gallon', 'gallons', 'us gal', 'us gallon'],
        system: 'imperial',
        toBase: (v) => v * 3.78541,
        fromBase: (v) => v / 3.78541,
      },
      oz_fl: {
        symbol: 'fl oz',
        label: 'Fluid Ounces',
        aliases: ['fl oz', 'floz', 'fluid ounce', 'fluid ounces', 'oz fl', 'oz_fl'],
        system: 'imperial',
        toBase: (v) => v * 0.0295735,
        fromBase: (v) => v / 0.0295735,
      },
      pt: {
        symbol: 'pt',
        label: 'Pints',
        aliases: ['pint', 'pints'],
        system: 'imperial',
        toBase: (v) => v * 0.473176,
        fromBase: (v) => v / 0.473176,
      },
    },
  },

  speed: {
    name: 'speed',
    baseUnit: 'ms',
    units: {
      ms: {
        symbol: 'm/s',
        label: 'Meters per Second',
        aliases: ['m/s', 'meters per second', 'metres per second', 'mps'],
        system: 'metric',
        toBase: (v) => v,
        fromBase: (v) => v,
      },
      kph: {
        symbol: 'km/h',
        label: 'Kilometers per Hour',
        aliases: ['km/h', 'kmh', 'kph', 'kilometers per hour', 'kilometres per hour'],
        system: 'metric',
        toBase: (v) => v / 3.6,
        fromBase: (v) => v * 3.6,
      },
      mph: {
        symbol: 'mph',
        label: 'Miles per Hour',
        aliases: ['mi/h', 'miles per hour'],
        system: 'imperial',
        toBase: (v) => v * 0.44704,
        fromBase: (v) => v / 0.44704,
      },
      knot: {
        symbol: 'kn',
        label: 'Knots',
        aliases: ['kn', 'kt', 'knot', 'knots', 'nautical miles per hour'],
        system: 'imperial',
        toBase: (v) => v * 0.514444,
        fromBase: (v) => v / 0.514444,
      },
    },
  },

  time: {
    name: 'time',
    baseUnit: 's',
    units: {
      s: {
        symbol: 's',
        label: 'Seconds',
        aliases: ['sec', 'second', 'seconds'],
        system: 'both',
        toBase: (v) => v,
        fromBase: (v) => v,
      },
      ms_time: {
        symbol: 'ms',
        label: 'Milliseconds',
        aliases: ['ms', 'millisecond', 'milliseconds'],
        system: 'both',
        toBase: (v) => v * 0.001,
        fromBase: (v) => v / 0.001,
      },
      min: {
        symbol: 'min',
        label: 'Minutes',
        aliases: ['minute', 'minutes', 'mins'],
        system: 'both',
        toBase: (v) => v * 60,
        fromBase: (v) => v / 60,
      },
      h: {
        symbol: 'h',
        label: 'Hours',
        aliases: ['hr', 'hrs', 'hour', 'hours'],
        system: 'both',
        toBase: (v) => v * 3600,
        fromBase: (v) => v / 3600,
      },
      day: {
        symbol: 'day',
        label: 'Days',
        aliases: ['days', 'd'],
        system: 'both',
        toBase: (v) => v * 86400,
        fromBase: (v) => v / 86400,
      },
      week: {
        symbol: 'wk',
        label: 'Weeks',
        aliases: ['wk', 'wks', 'week', 'weeks'],
        system: 'both',
        toBase: (v) => v * 604800,
        fromBase: (v) => v / 604800,
      },
    },
  },

  data: {
    name: 'data',
    baseUnit: 'b',
    units: {
      b: {
        symbol: 'B',
        label: 'Bytes',
        aliases: ['byte', 'bytes'],
        system: 'both',
        toBase: (v) => v,
        fromBase: (v) => v,
      },
      kb: {
        symbol: 'kB',
        label: 'Kilobytes',
        aliases: ['kilobyte', 'kilobytes'],
        system: 'both',
        toBase: (v) => v * 1000,
        fromBase: (v) => v / 1000,
      },
      mb: {
        symbol: 'MB',
        label: 'Megabytes',
        aliases: ['megabyte', 'megabytes'],
        system: 'both',
        toBase: (v) => v * 1e6,
        fromBase: (v) => v / 1e6,
      },
      gb: {
        symbol: 'GB',
        label: 'Gigabytes',
        aliases: ['gigabyte', 'gigabytes'],
        system: 'both',
        toBase: (v) => v * 1e9,
        fromBase: (v) => v / 1e9,
      },
      tb: {
        symbol: 'TB',
        label: 'Terabytes',
        aliases: ['terabyte', 'terabytes'],
        system: 'both',
        toBase: (v) => v * 1e12,
        fromBase: (v) => v / 1e12,
      },
      kib: {
        symbol: 'KiB',
        label: 'Kibibytes',
        aliases: ['kibibyte', 'kibibytes'],
        system: 'both',
        toBase: (v) => v * 1024,
        fromBase: (v) => v / 1024,
      },
      mib: {
        symbol: 'MiB',
        label: 'Mebibytes',
        aliases: ['mebibyte', 'mebibytes'],
        system: 'both',
        toBase: (v) => v * 1048576,
        fromBase: (v) => v / 1048576,
      },
      gib: {
        symbol: 'GiB',
        label: 'Gibibytes',
        aliases: ['gibibyte', 'gibibytes'],
        system: 'both',
        toBase: (v) => v * 1073741824,
        fromBase: (v) => v / 1073741824,
      },
    },
  },
}

// ─── Unit lookup helpers ──────────────────────────────────────────────────────

/**
 * Find which category and unit key a given normalized string refers to.
 * Returns null if not found.
 */
function findUnit(
  normalized: string,
  hintCategory?: UnitCategory | null
): { category: UnitCategory; unitKey: string } | null {
  // If we have a category hint, try that category first
  const categoriesToSearch: UnitCategory[] = hintCategory
    ? [hintCategory, ...ALL_CATEGORIES.filter((c) => c !== hintCategory)]
    : ALL_CATEGORIES

  for (const cat of categoriesToSearch) {
    const catDef = CATEGORIES[cat]
    for (const [key, entry] of Object.entries(catDef.units)) {
      if (key === normalized) return { category: cat, unitKey: key }
      if (entry.symbol.toLowerCase() === normalized) return { category: cat, unitKey: key }
      if (entry.aliases.map((a) => a.toLowerCase()).includes(normalized)) {
        return { category: cat, unitKey: key }
      }
    }
  }
  return null
}

const ALL_CATEGORIES: UnitCategory[] = [
  'length',
  'weight',
  'temperature',
  'area',
  'volume',
  'speed',
  'time',
  'data',
]

// ─── parseQuery ───────────────────────────────────────────────────────────────

const QUERY_REGEX =
  /^([\d.,]+)\s*([a-zA-Z°\/²³]+(?:\s*\/\s*[a-zA-Z]+)?)\s*(?:(?:to|in|→|->)\s*([a-zA-Z°\/²³]+(?:\s*\/\s*[a-zA-Z]+)?))?$/i

export function parseQuery(query: string): {
  value: number
  fromUnit: string
  toUnit: string | null
  category: UnitCategory | null
} | null {
  const trimmed = query.trim()
  if (!trimmed) return null

  const match = trimmed.match(QUERY_REGEX)
  if (!match) return null

  const rawValue = match[1].replace(',', '.')
  const value = parseFloat(rawValue)
  if (isNaN(value)) return null

  const rawFrom = match[2].trim().toLowerCase()
  const rawTo = match[3] ? match[3].trim().toLowerCase() : null

  // Find fromUnit
  const fromResult = findUnit(rawFrom)
  if (!fromResult) return null

  // Find toUnit within the same category as fromUnit
  let toUnit: string | null = null
  if (rawTo !== null) {
    const toResult = findUnit(rawTo, fromResult.category)
    if (!toResult) return null
    // toUnit must be in the same category
    if (toResult.category !== fromResult.category) return null
    toUnit = toResult.unitKey
  }

  return {
    value,
    fromUnit: fromResult.unitKey,
    toUnit,
    category: fromResult.category,
  }
}

// ─── convert ─────────────────────────────────────────────────────────────────

export function convert(
  value: number,
  fromUnit: string,
  toUnit: string,
  category: UnitCategory,
  precision: number
): ConversionResult {
  const catDef = CATEGORIES[category]
  const fromEntry = catDef.units[fromUnit]
  const toEntry = catDef.units[toUnit]

  if (!fromEntry) throw new Error(`Unknown unit "${fromUnit}" in category "${category}"`)
  if (!toEntry) throw new Error(`Unknown unit "${toUnit}" in category "${category}"`)

  const baseValue = fromEntry.toBase(value)
  const toValue = toEntry.fromBase(baseValue)
  const formatted = parseFloat(toValue.toFixed(precision)).toString()
  const formattedResult = `${formatted} ${toEntry.symbol}`

  return {
    id: `${fromUnit}-${toUnit}`,
    fromValue: value,
    fromUnit,
    fromSymbol: fromEntry.symbol,
    toValue,
    toUnit,
    toSymbol: toEntry.symbol,
    formattedResult,
    category,
  }
}

// ─── getConversionsForCategory ────────────────────────────────────────────────

export function getConversionsForCategory(
  value: number,
  fromUnit: string,
  category: UnitCategory,
  system: UnitSystem,
  precision: number
): ConversionResult[] {
  const catDef = CATEGORIES[category]
  const results: ConversionResult[] = []

  for (const [toKey, toEntry] of Object.entries(catDef.units)) {
    // Skip identity
    if (toKey === fromUnit) continue

    // Filter by system
    if (system !== 'both') {
      // Include unit if it matches the requested system or is 'both'
      if (toEntry.system !== system && toEntry.system !== 'both') continue
    }

    try {
      const result = convert(value, fromUnit, toKey, category, precision)
      results.push(result)
    } catch {
      // skip invalid conversions
    }
  }

  return results
}
