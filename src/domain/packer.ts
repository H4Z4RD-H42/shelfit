import { cubeSlots, unitGeometry, type CubeSlot } from './geometry'
import { isTopFree, unitOverhang, unitOverhangSide } from './kallax'
import { detectSagas } from './saga'
import { groupOf } from './grouping'
import { boxVolume, orderUnits } from './sorting'
import { STANDARD_BOX, assignZones, rankSlots } from './zones'
import {
  hasDims,
  type Align,
  type BoxDimensions,
  type CubeLayout,
  type CubeSize,
  type Game,
  type Layout,
  type Orientation,
  type OverhangSide,
  type PackOptions,
  type Placement,
  type ShelfUnit,
  type TopLayout,
  type UnplacedGame,
  type Zone,
  type ZoneStats,
} from './types'

/*
 * Packing model
 * -------------
 * Boxes are never placed one behind the other, so each cube is a 2D problem on
 * its front face. The cube width is split into columns, left to right:
 *   - a vertical column holds one box standing on its side, like a book;
 *   - a stack column holds boxes lying flat, one on top of the other.
 * A stack is as wide as its widest box and as tall as the sum of its boxes, so
 * its feasibility does not depend on the order of the boxes inside it.
 * Cubes are filled with a beam search that explores, for every box, all the
 * possible columns it can go into.
 */

const BEAM_ORDERED = 32
const BEAM_COMPACT = 12

interface Extents {
  sx: number
  sy: number
  sz: number
}

type Fits = Partial<Record<Orientation, Extents>>

interface Item {
  game: Game
  /** Index in the ordered sequence. */
  order: number
  volume: number
  /**
   * Extents for each feasible orientation, already filtered by preference,
   * for each kind of cube the box fits in (see `Ctx.key`).
   */
  fits: Map<string, Fits>
}

interface Column {
  kind: Orientation
  /** Width including clearance. */
  width: number
  /** Height including clearance. */
  height: number
  entries: { item: Item; ext: Extents }[]
}

interface CubeState {
  columns: Column[]
  used: number
  /** Front area still usable: free width plus room above stacks. */
  free: number
  volume: number
}

interface Ctx {
  cube: CubeSize
  clearance: number
  stackHeight: number
  align: Align
  overhangSide: OverhangSide
  /** Cubes with the same key take the same boxes: the key of `Item.fits`. */
  key: string
}

/** Room for a box in a cube: its interior plus the overhang of the unit. */
const roomOf = (cube: CubeSize, overhang: number): CubeSize => ({ ...cube, depth: cube.depth + overhang })
const roomKey = (room: CubeSize) => `${room.width}x${room.height}x${room.depth}`

/** Computes the possible extents of a box in each orientation. */
export function orientations(dims: BoxDimensions, cube: CubeSize, clearance: number, longSideFront = false): Fits {
  const [a, b, c] = [dims.width, dims.height, dims.depth].sort((x, y) => y - x) as [number, number, number]
  const fits: Fits = {}

  // Vertical: thinnest side along the width; prefer standing as tall as possible.
  if (c + clearance <= cube.width) {
    if (a + clearance <= cube.height && b <= cube.depth) fits.vertical = { sx: c, sy: a, sz: b }
    else if (b + clearance <= cube.height && a <= cube.depth) fits.vertical = { sx: c, sy: b, sz: a }
  }
  // Horizontal: lying flat. By default the long side goes towards the back,
  // so stacks take less width; optionally it faces out, like on a bookshelf.
  if (c + clearance <= cube.height) {
    const longBack = a <= cube.depth && b + clearance <= cube.width ? { sx: b, sy: c, sz: a } : undefined
    const longFront = b <= cube.depth && a + clearance <= cube.width ? { sx: a, sy: c, sz: b } : undefined
    const flat = longSideFront ? (longFront ?? longBack) : (longBack ?? longFront)
    if (flat) fits.horizontal = flat
  }
  return fits
}

/** How many copies of a box an empty cube holds, standing like books or lying in stacks. */
export function cubeCapacity(fits: Fits, cube: CubeSize, clearance: number, stackHeight: number): number {
  const across = (sx: number) => Math.floor((cube.width + 1e-9) / (sx + clearance))
  const standing = fits.vertical ? across(fits.vertical.sx) : 0
  const h = fits.horizontal
  const lying = h ? across(h.sx) * Math.floor((stackHeight + 1e-9) / (h.sy + clearance)) : 0
  return Math.max(standing, lying)
}

function allowedFits(game: Game & { dims: BoxDimensions }, options: PackOptions, cube: CubeSize): Fits {
  const fits = orientations(game.dims, cube, options.clearance, options.longSideFront)
  const pref = game.orientation === 'inherit' ? options.orientation : game.orientation
  if (pref === 'auto') return fits
  // A forced orientation that cannot work falls back to the other one.
  const forced = fits[pref]
  return forced ? { [pref]: forced } : fits
}

const NO_FITS: Fits = {}
const fitsAt = (item: Item, ctx: Ctx) => item.fits.get(ctx.key) ?? NO_FITS
const fitsIn = (item: Item, ctx: Ctx) => {
  const fits = fitsAt(item, ctx)
  return !!(fits.vertical || fits.horizontal)
}

const emptyState = (ctx: Ctx): CubeState => makeState([], 0, ctx)

function makeState(columns: Column[], volume: number, ctx: Ctx): CubeState {
  let used = 0
  let free = 0
  for (const col of columns) {
    used += col.width
    // The room above a stack can still host flat boxes; above a book it is lost.
    if (col.kind === 'horizontal') free += col.width * (ctx.stackHeight - col.height)
  }
  free += (ctx.cube.width - used) * ctx.cube.height
  return { columns, used, free, volume }
}

/** How much (cm) a box may exceed the one below: same-size boxes often differ by a few mm. */
export const STACK_TOLERANCE = 1

const fitsOn = (upper: Extents, lower: Extents) =>
  upper.sx <= lower.sx + STACK_TOLERANCE && upper.sz <= lower.sz + STACK_TOLERANCE

/**
 * Two boxes can share a stack only if one fits within the footprint of the
 * other: nobody puts a box on top of a narrower or shallower one.
 */
const stackable = (a: Extents, b: Extents) => fitsOn(a, b) || fitsOn(b, a)

/** All the states reachable by adding `item` to `state`. */
function expand(state: CubeState, item: Item, ctx: Ctx): CubeState[] {
  const { cube, clearance, stackHeight } = ctx
  const out: CubeState[] = []
  const volume = state.volume + item.volume

  const fits = fitsAt(item, ctx)
  const v = fits.vertical
  if (v) {
    const width = v.sx + clearance
    if (state.used + width <= cube.width + 1e-9) {
      const col: Column = { kind: 'vertical', width, height: v.sy + clearance, entries: [{ item, ext: v }] }
      out.push(makeState([...state.columns, col], volume, ctx))
    }
  }

  const h = fits.horizontal
  if (h) {
    const itemWidth = h.sx + clearance
    const itemHeight = h.sy + clearance
    state.columns.forEach((col, i) => {
      if (col.kind !== 'horizontal' || col.height + itemHeight > stackHeight + 1e-9) return
      if (!col.entries.every((e) => stackable(h, e.ext))) return
      const width = Math.max(col.width, itemWidth)
      if (state.used - col.width + width > cube.width + 1e-9) return
      const columns = state.columns.slice()
      columns[i] = { ...col, width, height: col.height + itemHeight, entries: [...col.entries, { item, ext: h }] }
      out.push(makeState(columns, volume, ctx))
    })
    if (state.used + itemWidth <= cube.width + 1e-9) {
      const col: Column = { kind: 'horizontal', width: itemWidth, height: itemHeight, entries: [{ item, ext: h }] }
      out.push(makeState([...state.columns, col], volume, ctx))
    }
  }
  return out
}

function signature(state: CubeState): string {
  return state.columns
    .map((c) => `${c.kind[0]}${c.width.toFixed(1)}/${c.height.toFixed(1)}`)
    .sort()
    .join('|')
}

/** Keeps the `size` most promising distinct states. */
function prune(states: CubeState[], size: number, better: (a: CubeState, b: CubeState) => number): CubeState[] {
  const seen = new Set<string>()
  const out: CubeState[] = []
  for (const s of states.sort(better)) {
    const sig = signature(s)
    if (seen.has(sig)) continue
    seen.add(sig)
    out.push(s)
    if (out.length === size) break
  }
  return out
}

const byFreeArea = (a: CubeState, b: CubeState) => b.free - a.free

/**
 * Places as many consecutive items as possible in an empty cube.
 * Returns the best state found after placing each prefix of `items`.
 */
function fillConsecutive(items: Item[], ctx: Ctx): CubeState[] {
  const best: CubeState[] = [emptyState(ctx)]
  let frontier = best.slice()
  for (const item of items) {
    const next = frontier.flatMap((s) => expand(s, item, ctx))
    if (next.length === 0) break
    frontier = prune(next, BEAM_ORDERED, byFreeArea)
    best.push(frontier[0]!)
  }
  return best
}

/** Adds a single item to a cube using the option that wastes the least room. */
function addBest(state: CubeState, item: Item, ctx: Ctx): CubeState | undefined {
  return expand(state, item, ctx).sort(byFreeArea)[0]
}

function fitsInEmptyCube(items: Item[], ctx: Ctx): boolean {
  return fillConsecutive(items, ctx).length === items.length + 1
}

interface Packed {
  states: CubeState[]
  leftover: Item[]
}

interface QueuedUnit {
  items: Item[]
  group: string
  /** Some of its items already went into earlier cubes. */
  started?: boolean
}

/** How many empty cubes the items need, in order; Infinity if one never fits. */
function cubesNeeded(items: Item[], ctx: Ctx): number {
  let rest = items
  let cubes = 0
  while (rest.length > 0) {
    const count = fillConsecutive(rest, ctx).length - 1
    if (count === 0) return Infinity
    rest = rest.slice(count)
    cubes++
  }
  return cubes
}

/**
 * Index of the first cube of the next shelf line, when the saga split at
 * `taken` items in cube `index` would wrap onto it but fits in that line if
 * moved there whole. `lines` holds the line of every cube.
 */
function wrapTarget(unit: QueuedUnit, taken: number, index: number, lines: number[], ctx: Ctx): number | undefined {
  const line = lines[index]!
  const next = lines.indexOf(line + 1, index)
  if (next < 0) return undefined
  const end = index + cubesNeeded(unit.items.slice(taken), ctx)
  if (end < next) return undefined
  const lineLength = lines.filter((l) => l === line + 1).length
  return cubesNeeded(unit.items, ctx) <= lineLength ? next : undefined
}

function packOrdered(units: QueuedUnit[], lines: number[], ctxs: Ctx[], options: PackOptions): Packed {
  let queue: QueuedUnit[] = units.map((u) => ({ ...u, items: u.items.slice() }))
  const states: CubeState[] = []
  const newCubePerGroup = options.groupStartsNewCube && options.groupBy.length > 0

  while (queue.length > 0 && states.length < ctxs.length) {
    const ctx = ctxs[states.length]!
    // With "new cube per group", a cube only takes games of the current group.
    const group = queue[0]!.group
    const end = newCubePerGroup ? queue.findIndex((u) => u.group !== group) : -1
    // Boxes too deep for this unit wait for a unit they fit in; the next games move up.
    const current = (end < 0 ? queue : queue.slice(0, end)).filter((u) => u.items.every((i) => fitsIn(i, ctx)))
    const flat = current.flatMap((u) => u.items)
    const prefixes = fillConsecutive(flat, ctx)
    let count = prefixes.length - 1
    if (count === 0) {
      states.push(emptyState(ctx))
      continue
    }

    // Avoid splitting a saga that would fit entirely in the next cube.
    if (options.groupSagas && options.keepSagasInCube && count < flat.length) {
      let start = 0
      for (const { items } of current) {
        const stop = start + items.length
        if (count > start && count < stop && start > 0 && items.length > 1 && fitsInEmptyCube(items, ctx)) {
          count = start
          break
        }
        if (stop > count) break
        start = stop
      }
    }

    // Move a saga to the next line of the shelf instead of letting it wrap.
    let skipTo: number | undefined
    if (options.groupSagas && options.keepSagasInLine && count < flat.length) {
      let start = 0
      for (const unit of current) {
        const stop = start + unit.items.length
        if (count > start && count < stop) {
          if (!unit.started && unit.items.length > 1) {
            skipTo = wrapTarget(unit, count - start, states.length, lines, ctx)
            if (skipTo !== undefined) count = start
          }
          break
        }
        start = stop
      }
    }

    let state = prefixes[count]!
    // Consume `count` items from the units that went into the cube.
    const taken = new Map<QueuedUnit, number>()
    let toTake = count
    for (const unit of current) {
      if (toTake === 0) break
      const n = Math.min(toTake, unit.items.length)
      taken.set(unit, n)
      toTake -= n
    }
    queue = queue.flatMap((unit) => {
      const n = taken.get(unit) ?? 0
      if (n === 0) return [unit]
      return n === unit.items.length ? [] : [{ ...unit, items: unit.items.slice(n), started: true }]
    })

    if (options.fillGaps) {
      queue = queue.filter((unit) => {
        if (unit.items.length !== 1 || (newCubePerGroup && unit.group !== group)) return true
        const next = addBest(state, unit.items[0]!, ctx)
        if (!next) return true
        state = next
        return false
      })
    }
    states.push(state)
    // The cubes left at the end of the line stay empty.
    while (skipTo !== undefined && states.length < skipTo) states.push(emptyState(ctxs[states.length]!))
  }
  return { states, leftover: queue.flatMap((u) => u.items) }
}

/** One context per kind of cube (same room). */
const distinct = (ctxs: Ctx[]) => [...new Map(ctxs.map((c) => [c.key, c])).values()]

function packCompact(units: Item[][], ctxs: Ctx[]): Packed {
  const kinds = distinct(ctxs)
  // Sagas larger than a cube cannot stay together anyway.
  let remaining = units
    .flatMap((u) => (u.length > 1 && !kinds.some((c) => fitsInEmptyCube(u, c)) ? u.map((i) => [i]) : [u]))
    .sort((a, b) => sum(b) - sum(a))
  const states: CubeState[] = []

  while (remaining.length > 0 && states.length < ctxs.length) {
    const ctx = ctxs[states.length]!
    // `taken` is a persistent linked list, so branching does not copy it.
    type Taken = { index: number; prev: Taken | null } | null
    type Node = { state: CubeState; taken: Taken }
    let frontier: Node[] = [{ state: emptyState(ctx), taken: null }]
    remaining.forEach((unit, index) => {
      const next: Node[] = [...frontier]
      for (const node of frontier) {
        let partial = [node.state]
        for (const item of unit)
          partial = prune(
            partial.flatMap((s) => expand(s, item, ctx)),
            4,
            byFreeArea,
          )
        for (const state of partial) next.push({ state, taken: { index, prev: node.taken } })
      }
      const seen = new Set<string>()
      frontier = next
        .sort((a, b) => b.state.volume - a.state.volume || byFreeArea(a.state, b.state))
        .filter((n) => {
          const sig = signature(n.state)
          if (seen.has(sig)) return false
          seen.add(sig)
          return true
        })
        .slice(0, BEAM_COMPACT)
    })
    const best = frontier[0]!
    // Nothing left fits in this unit: try the next cube.
    if (!best.taken) {
      states.push(best.state)
      continue
    }
    const taken = new Set<number>()
    for (let t: Taken = best.taken; t; t = t.prev) taken.add(t.index)
    states.push(best.state)
    remaining = remaining.filter((_, i) => !taken.has(i))
  }
  return { states, leftover: remaining.flat() }
}

/** Fills the given cubes of a zone. */
function packZone(units: QueuedUnit[], zone: Zone, ctxs: Ctx[], options: PackOptions): Packed {
  if (units.length === 0 || ctxs.length === 0) return { states: [], leftover: units.flatMap((u) => u.items) }
  if (zone.strategy === 'compact')
    return packCompact(
      units.map((u) => u.items),
      ctxs,
    )
  // Groups and shelf lines belong to the rest of the collection.
  return packOrdered(units, new Array<number>(ctxs.length).fill(0), ctxs, { ...options, groupBy: [], keepSagasInLine: false })
}

function sum(unit: Item[]): number {
  return unit.reduce((acc, i) => acc + i.volume, 0)
}

/** Converts the abstract columns of a cube into absolute placements. */
function toPlacements(state: CubeState, ctx: Ctx): Placement[] {
  const half = ctx.clearance / 2
  // Boxes deeper than the cube stick out of the front, flush with the back,
  // or out of the back, flush with the front.
  const front = (ext: Extents) => (ctx.overhangSide === 'back' ? 0 : Math.min(0, ctx.cube.depth - ext.sz))
  const placements: Placement[] = []
  const free = ctx.cube.width - state.used
  let x = ctx.align === 'left' ? 0 : ctx.align === 'center' ? free / 2 : free
  // Position of a box of width `sx` inside a column of width `width`.
  const inColumn = (width: number, sx: number) =>
    ctx.align === 'left' ? half : ctx.align === 'center' ? (width - sx) / 2 : width - half - sx
  for (const [column, col] of state.columns.entries()) {
    if (col.kind === 'vertical') {
      const { item, ext } = col.entries[0]!
      placements.push({
        gameId: item.game.id,
        orientation: 'vertical',
        order: item.order,
        column,
        level: 0,
        x: x + half,
        y: 0,
        z: front(ext),
        ...ext,
      })
    } else {
      // Biggest footprint at the bottom: every box fits within the one below.
      const entries = [...col.entries].sort((p, q) => q.ext.sx * q.ext.sz - p.ext.sx * p.ext.sz)
      let y = 0
      for (const [level, { item, ext }] of entries.entries()) {
        placements.push({
          gameId: item.game.id,
          orientation: 'horizontal',
          order: item.order,
          column,
          level,
          x: x + inColumn(col.width, ext.sx),
          y,
          z: front(ext),
          ...ext,
        })
        y += ext.sy + ctx.clearance
      }
    }
    x += col.width
  }
  return placements
}

/** The most frequent cube size; the first one on a tie. */
function mostCommon(cubes: CubeSize[]): CubeSize | undefined {
  const count = new Map<string, { cube: CubeSize; n: number }>()
  for (const cube of cubes) {
    const entry = count.get(roomKey(cube)) ?? { cube, n: 0 }
    entry.n++
    count.set(roomKey(cube), entry)
  }
  let best: { cube: CubeSize; n: number } | undefined
  for (const entry of count.values()) if (!best || entry.n > best.n) best = entry
  return best?.cube
}

/** Height (cm) up to which boxes are stacked on top of a unit. */
export const TOP_HEIGHT = 40

/** On top of a unit a box lies flat, long side along the shelf when it fits. */
function topExtents(dims: BoxDimensions, width: number, clearance: number): Extents | undefined {
  const [a, b, c] = [dims.width, dims.height, dims.depth].sort((x, y) => y - x) as [number, number, number]
  if (a + clearance <= width) return { sx: a, sy: c, sz: b }
  if (b + clearance <= width) return { sx: b, sy: c, sz: a }
  return undefined
}

/** Stacks the given games on top of the units, unit after unit. */
function packTop(
  games: Game[],
  units: ShelfUnit[],
  clearance: number,
  align: Align,
): { tops: TopLayout[]; leftover: Game[]; tooBig: Game[] } {
  const tops: TopLayout[] = []
  const free = units.filter(isTopFree)
  if (free.length === 0) return { tops, leftover: games, tooBig: [] }
  const widest = Math.max(...free.map((u) => unitGeometry(u).top.width))
  const tooBig = games.filter((g) => !topExtents(g.dims!, widest, clearance))
  let queue = games.filter((g) => !tooBig.includes(g))
  for (const unit of free) {
    if (queue.length === 0) break
    const { top, depth } = unitGeometry(unit)
    const width = top.width
    const ctx: Ctx = {
      cube: { width, height: TOP_HEIGHT, depth },
      clearance,
      stackHeight: TOP_HEIGHT,
      align,
      overhangSide: unitOverhangSide(unit),
      key: 'top',
    }
    const items: Item[] = []
    for (const [order, game] of queue.entries()) {
      const ext = topExtents(game.dims!, width, clearance)
      if (!ext) break
      items.push({ game, order, volume: boxVolume(game), fits: new Map([['top', { horizontal: ext }]]) })
    }
    const prefixes = fillConsecutive(items, ctx)
    const count = prefixes.length - 1
    if (count === 0) continue
    // Placements on top are relative to the left side of the unit.
    const placements = toPlacements(prefixes[count]!, ctx).map((p) => ({ ...p, x: p.x + top.x }))
    tops.push({ unitId: unit.id, placements })
    queue = queue.slice(count)
  }
  return { tops, leftover: queue, tooBig }
}

/** Numbers the shelf lines (rows, or columns) of the cubes, in filling order. */
function shelfLines(slots: CubeSlot[]): number[] {
  let line = -1
  let previous = ''
  return slots.map((s) => {
    const key = `${s.unitId}:${s.line}`
    if (key !== previous) line++
    previous = key
    return line
  })
}

export function packCollection(games: Game[], units: ShelfUnit[], options: PackOptions, zones: Zone[] = []): Layout {
  const sagas = detectSagas(games, options.autoDetectSagas)
  const stackHeightOf = (cube: CubeSize) =>
    options.maxStackHeight > 0 ? Math.min(options.maxStackHeight, cube.height) : cube.height
  const slots = cubeSlots(units, options.fillOrder)
  const unitOf = new Map(units.map((u) => [u.id, u]))
  // Every cube has its own size and every unit its own overhang, so a box may fit in some cubes only.
  const rooms = new Map<string, CubeSize>()
  const slotCtx = slots.map((slot): Ctx => {
    const unit = unitOf.get(slot.unitId)!
    const cube = slot.cell.size
    const room = roomOf(cube, unitOverhang(unit))
    const key = roomKey(room)
    rooms.set(key, room)
    return {
      cube,
      clearance: options.clearance,
      stackHeight: stackHeightOf(cube),
      align: options.align,
      overhangSide: unitOverhangSide(unit),
      key,
    }
  })
  // Small and large boxes are judged against the most common cube.
  const reference = mostCommon(slots.map((s) => s.cell.size)) ?? { width: 0, height: 0, depth: 0 }
  const deepest = roomOf(reference, Math.max(0, ...units.map(unitOverhang)))
  const topFree = units.some(isTopFree)
  const shelved = games.filter((g) => !g.excluded)
  const unplaced: UnplacedGame[] = []
  const itemOf = new Map<string, Item>()
  const onTop: Game[] = []
  for (const game of shelved) {
    if (!hasDims(game)) {
      unplaced.push({ gameId: game.id, reason: 'no-size' })
      continue
    }
    if (game.onTop) {
      onTop.push(game)
      continue
    }
    const fits = new Map<string, Fits>()
    for (const [key, room] of rooms) {
      const f = allowedFits(game, options, room)
      if (f.vertical || f.horizontal) fits.set(key, f)
    }
    // Games that fit in no cube go on top of the shelves, where there is room.
    if (fits.size > 0) itemOf.set(game.id, { game, order: 0, volume: boxVolume(game), fits })
    else if (topFree) onTop.push(game)
    else unplaced.push({ gameId: game.id, reason: 'too-big' })
  }

  const top = packTop(
    orderUnits(onTop, {}, { ...options, groupSagas: false, groupBy: [] }).flatMap((u) => u.games),
    units,
    options.clearance,
    options.align,
  )
  for (const g of top.tooBig) unplaced.push({ gameId: g.id, reason: 'too-big' })
  for (const g of top.leftover) unplaced.push({ gameId: g.id, reason: 'no-space' })

  const inCubes = shelved.filter((g) => itemOf.has(g.id))
  const capacityOf = (dims: BoxDimensions) =>
    cubeCapacity(
      orientations(dims, deepest, options.clearance, options.longSideFront),
      reference,
      options.clearance,
      stackHeightOf(reference),
    )
  const zoneOf =
    zones.length > 0
      ? assignZones(inCubes, zones, {
          sagas,
          groupSagas: options.groupSagas,
          capacity: new Map(inCubes.map((g) => [g.id, capacityOf(g.dims!)])),
          standard: capacityOf(STANDARD_BOX),
        })
      : {}

  let order = 0
  const queue = (list: Game[], opts: PackOptions): QueuedUnit[] =>
    orderUnits(list, sagas, opts).map((u) => ({
      group: u.group,
      items: u.games.map((g) => {
        const item = itemOf.get(g.id)!
        item.order = order++
        return item
      }),
    }))
  const mainUnits = queue(
    inCubes.filter((g) => !zoneOf[g.id]),
    options,
  )

  const ctxsOf = (indexes: number[]) => indexes.map((i) => slotCtx[i]!)
  const states: (CubeState | undefined)[] = []
  const slotZone: (string | undefined)[] = []
  let free = slots.map((_, i) => i)
  const zoneStats: Record<string, ZoneStats> = {}
  const zoneUnits: QueuedUnit[] = []
  // Cubes chosen by hand are taken first. Zones at the end of the shelves
  // follow the list order, so the last one takes the last cubes.
  const sequence = [
    ...zones.filter((z) => z.place === 'cubes'),
    ...zones.filter((z) => z.place !== 'cubes' && z.place !== 'end'),
    ...zones.filter((z) => z.place === 'end').reverse(),
  ]
  for (const zone of sequence) {
    const members = inCubes.filter((g) => zoneOf[g.id] === zone.id)
    const unitsOfZone = queue(members, { ...options, groupBy: [] })
    zoneUnits.push(...unitsOfZone)
    const ranked = rankSlots(zone, slots, free)
    let taken = ranked
    if (zone.place !== 'cubes') {
      // How many of the preferred cubes the zone needs; they are then filled in reading order.
      const trial = packZone(unitsOfZone, zone, ctxsOf(ranked), options)
      const needed = trial.states.reduce((n, state, k) => (state.columns.length > 0 ? k + 1 : n), 0)
      taken = ranked.slice(0, needed).sort((a, b) => a - b)
    }
    const packed = packZone(unitsOfZone, zone, ctxsOf(taken), options)
    taken.forEach((slot, k) => {
      states[slot] = packed.states[k]
      slotZone[slot] = zone.id
    })
    for (const item of packed.leftover) unplaced.push({ gameId: item.game.id, reason: 'zone-full' })
    const reserved = new Set(taken)
    free = free.filter((i) => !reserved.has(i))
    zoneStats[zone.id] = { games: members.length, cubes: taken.length, unplaced: packed.leftover.length }
  }

  const mainSlots = free.map((i) => slots[i]!)
  const packed =
    options.strategy === 'ordered'
      ? packOrdered(mainUnits, shelfLines(mainSlots), ctxsOf(free), options)
      : packCompact(
          mainUnits.map((u) => u.items),
          ctxsOf(free),
        )
  packed.states.forEach((state, k) => {
    states[free[k]!] = state
  })
  for (const item of packed.leftover) unplaced.push({ gameId: item.game.id, reason: 'no-space' })

  const cubes: CubeLayout[] = slots.map((slot, index) => {
    const state = states[index]
    const zoneId = slotZone[index]
    return {
      index,
      unitId: slot.unitId,
      column: slot.column,
      row: slot.row,
      placements: state ? toPlacements(state, slotCtx[index]!) : [],
      usedWidth: state?.used ?? 0,
      ...(zoneId && { zoneId }),
    }
  })

  const groups: Record<string, string> = {}
  const outer = options.groupBy[0]?.key
  if (outer) {
    for (const g of shelved) {
      const value = groupOf(g, outer)
      if (value !== undefined) groups[g.id] = value
    }
    // A saga follows the group of its first chapter, as it does on the shelf.
    for (const u of [...mainUnits, ...zoneUnits])
      for (const { game } of u.items) {
        if (u.group) groups[game.id] = u.group
        else delete groups[game.id]
      }
  }

  const used = states.flatMap((s, i) => (s && s.columns.length > 0 ? [{ state: s, cube: slots[i]!.cell.size }] : []))
  const placedVolume = used.reduce((acc, u) => acc + u.state.volume, 0)
  const usedVolume = used.reduce((acc, u) => acc + u.cube.width * u.cube.height * u.cube.depth, 0)
  const usedCubes = used.length
  return {
    cubes,
    tops: top.tops,
    unplaced,
    sagas,
    groups,
    zones: zoneOf,
    zoneStats,
    stats: {
      totalGames: shelved.length,
      placedGames: shelved.length - unplaced.length,
      totalCubes: slots.length,
      usedCubes,
      volumeFill: usedVolume ? placedVolume / usedVolume : 0,
    },
    relaxed: [],
  }
}
