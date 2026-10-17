import { groupOf } from './grouping'
import { cubeOrigin, type CubeSlot } from './kallax'
import { compareInSaga } from './sorting'
import type { BoxDimensions, CubeLayout, CubeSize, Game, ShelfUnit, Strategy, Zone, ZonePlace, ZoneRule } from './types'

/*
 * Zones
 * -----
 * A zone takes some games out of the normal order and gives them cubes of
 * their own: all the small boxes together, the party games within reach, the
 * games for trade apart. A zone has a rule (which games), a place (which
 * cubes) and a strategy (how its cubes are filled).
 *
 * Rules avoid fixed thresholds where the collection can speak for itself:
 * "small" means small compared with the other boxes of this collection, found
 * where the sizes split most clearly into two families.
 */

export const ZONE_RULES: ZoneRule[] = [
  'small',
  'large',
  'children',
  'party',
  'solo',
  'duo',
  'favorites',
  'unplayed',
  'forTrade',
  'heavy',
  'tag',
  'manual',
]

export const ZONE_PLACES: ZonePlace[] = ['end', 'start', 'bottom', 'eye', 'cubes']

export const ZONE_COLORS = ['#e07a5f', '#3d85c6', '#5fa777', '#d9a420', '#9b5de5', '#e05f9b', '#2fb5c4', '#8d6e63']

/** Rating from which a game is a favourite: "8 – Very good game" on the BGG scale. */
export const FAVORITE_RATING = 8

/** Height (cm) from the floor of the cubes at eye level. */
export const EYE_HEIGHT = 140

/** The most common square box (Catan, Ticket to Ride): the "normal" size. */
export const STANDARD_BOX: BoxDimensions = { width: 29.6, height: 29.6, depth: 7.2 }

/** BGG categories behind the category rules. */
const CATEGORY: Partial<Record<ZoneRule, string>> = {
  children: "Children's Game",
  party: 'Party Game',
}

/** Small boxes are worth fitting together; the other zones follow the sort order. */
export const defaultStrategy = (rule: ZoneRule): Strategy => (rule === 'small' ? 'compact' : 'ordered')

/** A new zone with the first colour not used yet. */
export function newZone(id: string, existing: Zone[], rule: ZoneRule = 'small'): Zone {
  const used = new Set(existing.map((z) => z.color))
  const color = ZONE_COLORS.find((c) => !used.has(c)) ?? ZONE_COLORS[existing.length % ZONE_COLORS.length]!
  return { id, rule, place: 'end', strategy: defaultStrategy(rule), color }
}

/** Key of a cube in `Zone.cubes`. */
export const cubeId = (slot: Pick<CubeSlot, 'unitId' | 'column' | 'row'>) => `${slot.unitId}:${slot.column}:${slot.row}`

/**
 * Splits values into two classes as cleanly as possible (Otsu's method: the
 * split that maximises the variance between the classes). Returns the smallest
 * value of the upper class, or undefined with fewer than two distinct values.
 */
export function splitPoint(values: number[]): number | undefined {
  const v = [...values].sort((a, b) => a - b)
  const n = v.length
  if (n < 2 || v[0] === v[n - 1]) return undefined
  const total = v.reduce((acc, x) => acc + x, 0)
  let best = -1
  let at: number | undefined
  let left = 0
  for (let i = 1; i < n; i++) {
    left += v[i - 1]!
    if (v[i] === v[i - 1]) continue
    const between = i * (n - i) * ((total - left) / (n - i) - left / i) ** 2
    if (between > best) {
      best = between
      at = v[i]
    }
  }
  return at
}

/**
 * Small and large boxes, from how many copies of each box a cube holds
 * (`capacity`). Boxes smaller than the standard one are split into "normal"
 * and "small" where the collection splits most clearly, on a logarithmic
 * scale (8 and 16 boxes per cube differ as much as 2 and 4); the same for the
 * boxes larger than the standard one. The standard box takes part in both
 * splits, so a collection made only of small boxes still has them all small.
 */
export function sizeClasses(capacity: Map<string, number>, standard: number): { small: Set<string>; large: Set<string> } {
  const small = new Set<string>()
  const large = new Set<string>()
  const ref = Math.max(1, standard)
  const entries = [...capacity].filter(([, c]) => c > 0)

  const smaller = entries.filter(([, c]) => c > ref)
  const s = splitPoint([ref, ...smaller.map(([, c]) => c)].map(Math.log))
  if (s !== undefined) for (const [id, c] of smaller) if (Math.log(c) >= s - 1e-9) small.add(id)

  const larger = entries.filter(([, c]) => c < ref)
  const l = splitPoint([ref, ...larger.map(([, c]) => c)].map(Math.log))
  if (l !== undefined) for (const [id, c] of larger) if (Math.log(c) < l - 1e-9) large.add(id)

  return { small, large }
}

export interface ZoneContext {
  sagas: Record<string, string>
  groupSagas: boolean
  /** How many copies of each game's box an empty cube holds. */
  capacity: Map<string, number>
  /** The same for the standard box. */
  standard: number
}

const normalize = (text: string) => text.trim().toLowerCase()

/** Tests whether a game satisfies the rule of a zone, within its collection. */
export function zoneMatcher(games: Game[], ctx: Pick<ZoneContext, 'capacity' | 'standard'>) {
  const sizes = sizeClasses(ctx.capacity, ctx.standard)
  const heavyFrom = splitPoint(games.flatMap((g) => (g.weightKg && g.weightKg > 0 ? [g.weightKg] : [])))
  return (game: Game, zone: Zone): boolean => {
    switch (zone.rule) {
      case 'small':
        return sizes.small.has(game.id)
      case 'large':
        return sizes.large.has(game.id)
      case 'heavy':
        return heavyFrom !== undefined && (game.weightKg ?? 0) >= heavyFrom
      case 'favorites':
        return (game.rating ?? 0) >= FAVORITE_RATING
      case 'solo':
      case 'duo':
        return groupOf(game, 'players') === zone.rule
      case 'children':
      case 'party':
        return !!game.categories?.includes(CATEGORY[zone.rule]!)
      case 'unplayed':
        return game.plays === 0
      case 'forTrade':
        return !!game.forTrade
      case 'tag': {
        const tag = normalize(zone.tag ?? '')
        return !!tag && !!game.tags?.some((t) => normalize(t) === tag)
      }
      case 'manual':
        return false
    }
  }
}

/**
 * Zone of every game that belongs to one. A game put in a zone by hand goes
 * there; otherwise it goes to the first zone whose rule it satisfies, unless
 * it was kept out of it by hand. With sagas grouped, a saga follows its first
 * chapter, so a small expansion stays next to its big base game.
 */
export function assignZones(games: Game[], zones: Zone[], ctx: ZoneContext): Record<string, string> {
  if (zones.length === 0) return {}
  const matches = zoneMatcher(games, ctx)
  const forced = (g: Game) => zones.find((z) => g.zones?.[z.id] === true)
  const own = new Map<string, string>()
  for (const g of games) {
    const zone = forced(g) ?? zones.find((z) => g.zones?.[z.id] !== false && matches(g, z))
    if (zone) own.set(g.id, zone.id)
  }

  const lead = new Map<string, Game>()
  if (ctx.groupSagas)
    for (const g of games) {
      const saga = ctx.sagas[g.id]
      if (!saga) continue
      const first = lead.get(saga)
      if (!first || compareInSaga(g, first) < 0) lead.set(saga, g)
    }

  const result: Record<string, string> = {}
  for (const g of games) {
    const hand = forced(g)
    if (hand) {
      result[g.id] = hand.id
      continue
    }
    const saga = ctx.groupSagas ? ctx.sagas[g.id] : undefined
    const zone = own.get((saga && lead.get(saga)?.id) || g.id)
    if (zone && g.zones?.[zone] !== false) result[g.id] = zone
  }
  return result
}

/**
 * Free cubes in the order a zone prefers them. `free` lists slot indexes in
 * filling order. A zone on chosen cubes gets exactly those, in filling order.
 */
export function rankSlots(zone: Zone, slots: CubeSlot[], free: number[], units: ShelfUnit[], cube: CubeSize): number[] {
  if (zone.place === 'cubes') {
    const chosen = new Set(zone.cubes)
    return free.filter((i) => chosen.has(cubeId(slots[i]!)))
  }
  const unitOf = new Map(units.map((u) => [u.id, u]))
  const rank = (i: number): number => {
    const slot = slots[i]!
    const unit = unitOf.get(slot.unitId)!
    switch (zone.place) {
      case 'start':
      case 'cubes':
        return i
      case 'end':
        return -i
      case 'bottom':
        // Rows counted from the floor.
        return unit.rows - 1 - slot.row
      case 'eye':
        return Math.abs(cubeOrigin(unit, slot.column, slot.row, cube).y + cube.height / 2 - EYE_HEIGHT)
    }
  }
  return [...free].sort((a, b) => rank(a) - rank(b) || a - b)
}

/**
 * The cubes of a zone that needs `needed` of them, in filling order. A zone on
 * chosen cubes keeps all of them, even the ones it does not fill yet: room to grow.
 */
export function zoneSlots(
  zone: Zone,
  needed: number,
  slots: CubeSlot[],
  free: number[],
  units: ShelfUnit[],
  cube: CubeSize,
): number[] {
  const ranked = rankSlots(zone, slots, free, units, cube)
  if (zone.place === 'cubes') return ranked
  return ranked.slice(0, Math.max(0, needed)).sort((a, b) => a - b)
}

export interface ZoneRun {
  zoneId: string
  unitId: string
  row: number
  first: number
  last: number
}

/** Groups the cubes of each zone into runs of adjacent cubes on one row: one label per run. */
export function zoneRuns(cubes: Pick<CubeLayout, 'unitId' | 'row' | 'column' | 'zoneId'>[]): ZoneRun[] {
  const sorted = cubes
    .filter((c) => c.zoneId)
    .sort((a, b) => a.unitId.localeCompare(b.unitId) || a.row - b.row || a.column - b.column)
  const runs: ZoneRun[] = []
  for (const c of sorted) {
    const run = runs[runs.length - 1]
    if (run && run.zoneId === c.zoneId && run.unitId === c.unitId && run.row === c.row && run.last === c.column - 1)
      run.last = c.column
    else runs.push({ zoneId: c.zoneId!, unitId: c.unitId, row: c.row, first: c.column, last: c.column })
  }
  return runs
}
