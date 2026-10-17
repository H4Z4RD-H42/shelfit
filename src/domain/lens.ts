import type { Game } from './types'

/*
 * Lens
 * ----
 * A way of looking at the shelves, like the data views of a city builder:
 * the boxes stay where they are but take the colour of some data. Filters
 * keep the games that match lit and fade the others; a map paints each box on
 * a colour scale (year, complexity…) or with the colour of its value (genre,
 * publisher…). Both can be on at the same time: the map then paints only the
 * games that pass the filters.
 */

/** Numeric data a filter can limit to a range. */
export type RangeKey = 'year' | 'complexity' | 'playTime' | 'rating' | 'plays' | 'weightKg'
/** Text data a filter can limit to some values. */
export type ValueKey = 'genre' | 'category' | 'designer' | 'publisher' | 'language' | 'tag'
/** Yes/no data. */
export type FlagKey = 'expansion' | 'forTrade' | 'unplayed'
/** Numeric data a map paints on a colour scale. */
export type NumberHeatKey = RangeKey | 'maxPlayers' | 'volume'
/** Text data a map paints with one colour per value. */
export type ValueHeatKey = 'genre' | 'designer' | 'publisher' | 'language'
export type HeatKey = NumberHeatKey | ValueHeatKey

export type Range = [min: number, max: number]

export interface Lens {
  /** Data painted on the boxes; their own colours when missing. */
  heat?: HeatKey
  /** Numbers of players the game must be playable with, all of them. */
  players: number[]
  ranges: Partial<Record<RangeKey, Range>>
  /** A game passes when it has at least one of the chosen values. */
  values: Partial<Record<ValueKey, string[]>>
  /** True: the game must have it; false: it must not. */
  flags: Partial<Record<FlagKey, boolean>>
}

export const EMPTY_LENS: Lens = { players: [], ranges: {}, values: {}, flags: {} }

export const RANGE_KEYS: RangeKey[] = ['year', 'complexity', 'playTime', 'rating', 'plays', 'weightKg']
export const VALUE_KEYS: ValueKey[] = ['genre', 'category', 'designer', 'publisher', 'language', 'tag']
export const FLAG_KEYS: FlagKey[] = ['expansion', 'forTrade', 'unplayed']
export const HEAT_KEYS: HeatKey[] = [
  'year',
  'complexity',
  'playTime',
  'maxPlayers',
  'rating',
  'plays',
  'weightKg',
  'volume',
  'genre',
  'designer',
  'publisher',
  'language',
]

/** Player counts offered as filters; the last one means "that many or more". */
export const PLAYER_COUNTS = [1, 2, 3, 4, 5, 6, 7]

/** Step of the range sliders. */
export const RANGE_STEP: Record<RangeKey, number> = {
  year: 1,
  complexity: 0.1,
  playTime: 5,
  rating: 0.5,
  plays: 1,
  weightKg: 0.1,
}

/** Sequential scale (viridis without its darkest end, which vanishes on a dark stage). */
export const HEAT_RAMP = ['#472d7b', '#3b528b', '#2c728e', '#21918c', '#28ae80', '#5ec962', '#addc30', '#fde725']

/** Colours of the most common values of a text map (Okabe–Ito, colour-blind safe). */
export const VALUE_COLORS = ['#e69f00', '#56b4e9', '#009e73', '#f0e442', '#0072b2', '#d55e00', '#cc79a7', '#c9a66b']

/** Values of a text map beyond the palette. */
export const OTHER_COLOR = '#9a8f80'
/** Games without the data of the map. */
export const NO_DATA_COLOR = '#5d626c'

const VALUE_HEAT_KEYS = new Set<HeatKey>(['genre', 'designer', 'publisher', 'language'])

export const isValueHeat = (key: HeatKey): key is ValueHeatKey => VALUE_HEAT_KEYS.has(key)

/** Numbers spread over orders of magnitude are painted on a logarithmic scale. */
const LOG_KEYS = new Set<HeatKey>(['plays', 'volume'])

const split = (list: string | undefined) =>
  (list ?? '')
    .split(';')
    .map((v) => v.trim())
    .filter(Boolean)

/** A numeric datum of a game, or undefined when unknown. */
export function numberOf(game: Game, key: NumberHeatKey): number | undefined {
  switch (key) {
    case 'volume': {
      const d = game.dims
      // Litres: cm³ / 1000.
      return d && d.width > 0 && d.height > 0 && d.depth > 0 ? (d.width * d.height * d.depth) / 1000 : undefined
    }
    case 'complexity':
    case 'rating':
    case 'maxPlayers':
    case 'playTime':
    case 'weightKg':
    case 'year': {
      // Zero means "not entered" for these.
      const v = game[key]
      return v ? v : undefined
    }
    case 'plays':
      return game.plays
  }
}

/** The values of a text datum of a game; designers, publishers and languages may be lists. */
export function valuesOf(game: Game, key: ValueKey): string[] {
  switch (key) {
    case 'genre':
      return split(game.genre)
    case 'category':
      return game.categories ?? []
    case 'tag':
      return game.tags ?? []
    case 'designer':
    case 'publisher':
    case 'language':
      return split(game[key])
  }
}

/** A yes/no datum of a game, or undefined when unknown. */
export function flagOf(game: Game, key: FlagKey): boolean | undefined {
  switch (key) {
    case 'expansion':
      return !!game.expansion
    case 'forTrade':
      return !!game.forTrade
    case 'unplayed':
      return game.plays === undefined ? undefined : game.plays === 0
  }
}

/** Whether the game can be played by `n` players; the last count of the filters means "n or more". */
export function playableWith(game: Game, n: number): boolean {
  const max = game.maxPlayers
  if (!max) return false
  const min = game.minPlayers || 1
  if (n >= PLAYER_COUNTS[PLAYER_COUNTS.length - 1]!) return max >= n
  return min <= n && n <= max
}

/** Smallest and largest value of a numeric datum in the collection. */
export function boundsOf(games: Game[], key: NumberHeatKey): Range | undefined {
  let min = Infinity
  let max = -Infinity
  for (const g of games) {
    const v = numberOf(g, key)
    if (v === undefined) continue
    if (v < min) min = v
    if (v > max) max = v
  }
  return min <= max ? [min, max] : undefined
}

export interface ValueCount {
  value: string
  count: number
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

/** Values of a text datum in the collection, the most common first. */
export function valueCounts(games: Game[], key: ValueKey): ValueCount[] {
  const counts = new Map<string, number>()
  for (const g of games) for (const v of new Set(valuesOf(g, key))) counts.set(v, (counts.get(v) ?? 0) + 1)
  return [...counts]
    .map(([value, count]) => ({ value, count }))
    .sort((a, b) => b.count - a.count || collator.compare(a.value, b.value))
}

/** Whether the collection has any game with a value for a yes/no datum worth filtering. */
export function hasFlag(games: Game[], key: FlagKey): boolean {
  return games.some((g) => flagOf(g, key) !== undefined) && games.some((g) => flagOf(g, key) === true)
}

/** Number of filters in use. */
export function activeFilters(lens: Lens): number {
  return (
    (lens.players.length > 0 ? 1 : 0) +
    Object.keys(lens.ranges).length +
    Object.values(lens.values).filter((v) => v && v.length > 0).length +
    Object.keys(lens.flags).length
  )
}

/** Tolerance for the float steps of the sliders (0.1 + 0.2 ≠ 0.3). */
const EPS = 1e-6

/** Whether a game passes every filter of the lens. Unknown data never passes a filter on it. */
export function matchesLens(game: Game, lens: Lens): boolean {
  if (!lens.players.every((n) => playableWith(game, n))) return false
  for (const key of RANGE_KEYS) {
    const range = lens.ranges[key]
    if (!range) continue
    const v = numberOf(game, key)
    if (v === undefined || v < range[0] - EPS || v > range[1] + EPS) return false
  }
  for (const key of VALUE_KEYS) {
    const wanted = lens.values[key]
    if (!wanted?.length) continue
    const have = valuesOf(game, key)
    if (!wanted.some((w) => have.includes(w))) return false
  }
  for (const key of FLAG_KEYS) {
    const wanted = lens.flags[key]
    if (wanted !== undefined && flagOf(game, key) !== wanted) return false
  }
  return true
}

export type HeatScale =
  | { kind: 'number'; key: NumberHeatKey; min: number; max: number; log: boolean; missing: number }
  | { kind: 'value'; key: ValueHeatKey; entries: (ValueCount & { color: string })[]; others: number; missing: number }

/** Colour at `t` (0..1) along the sequential scale. */
export function rampColor(t: number): string {
  const x = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0)) * (HEAT_RAMP.length - 1)
  const i = Math.min(HEAT_RAMP.length - 2, Math.floor(x))
  const f = x - i
  const a = parseInt(HEAT_RAMP[i]!.slice(1), 16)
  const b = parseInt(HEAT_RAMP[i + 1]!.slice(1), 16)
  const mix = (shift: number) => Math.round(((a >> shift) & 255) * (1 - f) + ((b >> shift) & 255) * f)
  return `#${((mix(16) << 16) | (mix(8) << 8) | mix(0)).toString(16).padStart(6, '0')}`
}

/** The main value of a game for a text map: the first designer, publisher or language. */
function heatValue(game: Game, key: ValueHeatKey): string | undefined {
  return valuesOf(game, key)[0]
}

/** The scale of a map over the given games. */
export function heatScale(games: Game[], key: HeatKey): HeatScale {
  if (isValueHeat(key)) {
    const counts = new Map<string, number>()
    let missing = 0
    for (const g of games) {
      const v = heatValue(g, key)
      if (v === undefined) missing++
      else counts.set(v, (counts.get(v) ?? 0) + 1)
    }
    const sorted = [...counts]
      .map(([value, count]) => ({ value, count }))
      .sort((a, b) => b.count - a.count || collator.compare(a.value, b.value))
    const entries = sorted.slice(0, VALUE_COLORS.length).map((e, i) => ({ ...e, color: VALUE_COLORS[i]! }))
    const others = sorted.slice(VALUE_COLORS.length).reduce((acc, e) => acc + e.count, 0)
    return { kind: 'value', key, entries, others, missing }
  }
  const bounds = boundsOf(games, key)
  const missing = games.filter((g) => numberOf(g, key) === undefined).length
  return { kind: 'number', key, min: bounds?.[0] ?? 0, max: bounds?.[1] ?? 0, log: LOG_KEYS.has(key), missing }
}

/** Position (0..1) of a value along a numeric scale. */
export function scalePosition(scale: Extract<HeatScale, { kind: 'number' }>, v: number): number {
  const f = scale.log ? Math.log1p : (x: number) => x
  const lo = f(scale.min)
  const hi = f(scale.max)
  return hi > lo ? (f(v) - lo) / (hi - lo) : 0.5
}

/** Colour of a game on a map. */
export function heatColor(scale: HeatScale, game: Game): string {
  if (scale.kind === 'value') {
    const v = heatValue(game, scale.key)
    if (v === undefined) return NO_DATA_COLOR
    return scale.entries.find((e) => e.value === v)?.color ?? OTHER_COLOR
  }
  const v = numberOf(game, scale.key)
  return v === undefined ? NO_DATA_COLOR : rampColor(scalePosition(scale, v))
}

export interface LensPaint {
  /** Games passing the filters; null when no filter is in use. */
  matches: Set<string> | null
  /** Scale of the map, when one is on. */
  scale: HeatScale | null
  /** Colour of each game on the map, when one is on. */
  colors: Map<string, string> | null
}

/**
 * Applies a lens to the collection. The map scale is measured on the games
 * that pass the filters, so it spreads over what is left to compare.
 */
export function paintLens(games: Game[], lens: Lens): LensPaint {
  const filtered = activeFilters(lens) > 0
  const lit = filtered ? games.filter((g) => matchesLens(g, lens)) : games
  const matches = filtered ? new Set(lit.map((g) => g.id)) : null
  if (!lens.heat) return { matches, scale: null, colors: null }
  const scale = heatScale(lit, lens.heat)
  const colors = new Map(lit.map((g) => [g.id, heatColor(scale, g)]))
  return { matches, scale, colors }
}
