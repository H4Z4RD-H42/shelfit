import { FRAME, cubeSlots, unitOuterSize } from './kallax'
import { detectSagas } from './saga'
import { groupOf } from './grouping'
import { boxVolume, orderUnits } from './sorting'
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

interface Item {
  game: Game
  /** Index in the ordered sequence. */
  order: number
  volume: number
  /** Extents for each feasible orientation, already filtered by preference. */
  fits: Partial<Record<Orientation, Extents>>
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
}

/** Computes the possible extents of a box in each orientation. */
export function orientations(
  dims: BoxDimensions,
  cube: CubeSize,
  clearance: number,
  longSideFront = false,
): Partial<Record<Orientation, Extents>> {
  const [a, b, c] = [dims.width, dims.height, dims.depth].sort((x, y) => y - x) as [number, number, number]
  const fits: Partial<Record<Orientation, Extents>> = {}

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

function allowedFits(game: Game & { dims: BoxDimensions }, options: PackOptions, cube: CubeSize): Item['fits'] {
  const fits = orientations(game.dims, cube, options.clearance, options.longSideFront)
  const pref = game.orientation === 'inherit' ? options.orientation : game.orientation
  if (pref === 'auto') return fits
  // A forced orientation that cannot work falls back to the other one.
  const forced = fits[pref]
  return forced ? { [pref]: forced } : fits
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

  const v = item.fits.vertical
  if (v) {
    const width = v.sx + clearance
    if (state.used + width <= cube.width + 1e-9) {
      const col: Column = { kind: 'vertical', width, height: v.sy + clearance, entries: [{ item, ext: v }] }
      out.push(makeState([...state.columns, col], volume, ctx))
    }
  }

  const h = item.fits.horizontal
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
}

function packOrdered(units: QueuedUnit[], cubes: number, ctx: Ctx, options: PackOptions): Packed {
  let queue = units.map((u) => ({ ...u, items: u.items.slice() }))
  const states: CubeState[] = []
  const newCubePerGroup = options.groupStartsNewCube && options.groupBy.length > 0

  while (queue.length > 0 && states.length < cubes) {
    // With "new cube per group", a cube only takes games of the current group.
    const group = queue[0]!.group
    const end = newCubePerGroup ? queue.findIndex((u) => u.group !== group) : -1
    const current = end < 0 ? queue : queue.slice(0, end)
    const flat = current.flatMap((u) => u.items)
    const prefixes = fillConsecutive(flat, ctx)
    let count = prefixes.length - 1
    if (count === 0) break

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

    let state = prefixes[count]!
    // Consume `count` items from the queue.
    let toTake = count
    const rest: QueuedUnit[] = []
    for (const unit of queue) {
      if (toTake >= unit.items.length) toTake -= unit.items.length
      else {
        rest.push({ ...unit, items: unit.items.slice(toTake) })
        toTake = 0
      }
    }
    queue = rest

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
  }
  return { states, leftover: queue.flatMap((u) => u.items) }
}

function packCompact(units: Item[][], cubes: number, ctx: Ctx): Packed {
  // Sagas larger than a cube cannot stay together anyway.
  let remaining = units
    .flatMap((u) => (u.length > 1 && !fitsInEmptyCube(u, ctx) ? u.map((i) => [i]) : [u]))
    .sort((a, b) => sum(b) - sum(a))
  const states: CubeState[] = []

  while (remaining.length > 0 && states.length < cubes) {
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
    if (!best.taken) break
    const taken = new Set<number>()
    for (let t: Taken = best.taken; t; t = t.prev) taken.add(t.index)
    states.push(best.state)
    remaining = remaining.filter((_, i) => !taken.has(i))
  }
  return { states, leftover: remaining.flat() }
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
  cube: CubeSize,
  clearance: number,
  align: Align,
  overhangSide: OverhangSide,
): { tops: TopLayout[]; leftover: Game[]; tooBig: Game[] } {
  const tops: TopLayout[] = []
  const widest = Math.max(0, ...units.map((u) => unitOuterSize(u, cube).width))
  const tooBig = games.filter((g) => !topExtents(g.dims!, widest, clearance))
  let queue = games.filter((g) => !tooBig.includes(g))
  for (const unit of units) {
    if (queue.length === 0) break
    const width = unitOuterSize(unit, cube).width
    const ctx: Ctx = {
      cube: { width, height: TOP_HEIGHT, depth: FRAME.depth },
      clearance,
      stackHeight: TOP_HEIGHT,
      align,
      overhangSide,
    }
    const items: Item[] = []
    for (const [order, game] of queue.entries()) {
      const ext = topExtents(game.dims!, width, clearance)
      if (!ext) break
      items.push({ game, order, volume: boxVolume(game), fits: { horizontal: ext } })
    }
    const prefixes = fillConsecutive(items, ctx)
    const count = prefixes.length - 1
    if (count === 0) continue
    tops.push({ unitId: unit.id, placements: toPlacements(prefixes[count]!, ctx) })
    queue = queue.slice(count)
  }
  return { tops, leftover: queue, tooBig }
}

export function packCollection(games: Game[], units: ShelfUnit[], cube: CubeSize, options: PackOptions): Layout {
  const sagas = detectSagas(games, options.autoDetectSagas)
  const ctx: Ctx = {
    cube,
    clearance: options.clearance,
    stackHeight: options.maxStackHeight > 0 ? Math.min(options.maxStackHeight, cube.height) : cube.height,
    align: options.align,
    overhangSide: options.overhangSide,
  }

  const fitCube = { ...cube, depth: cube.depth + Math.max(0, options.overhang) }
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
    const fits = allowedFits(game, options, fitCube)
    if (fits.vertical || fits.horizontal) itemOf.set(game.id, { game, order: 0, volume: boxVolume(game), fits })
    else if (options.oversizedOnTop) onTop.push(game)
    else unplaced.push({ gameId: game.id, reason: 'too-big' })
  }

  const top = packTop(
    orderUnits(onTop, {}, { ...options, groupSagas: false, groupBy: [] }).flatMap((u) => u.games),
    units,
    cube,
    options.clearance,
    options.align,
    options.overhangSide,
  )
  for (const g of top.tooBig) unplaced.push({ gameId: g.id, reason: 'too-big' })
  for (const g of top.leftover) unplaced.push({ gameId: g.id, reason: 'no-space' })

  let order = 0
  const unitsOrdered = orderUnits(
    shelved.filter((g) => itemOf.has(g.id)),
    sagas,
    options,
  ).map((u) => ({
    group: u.group,
    items: u.games.map((g) => {
      const item = itemOf.get(g.id)!
      item.order = order++
      return item
    }),
  }))

  const slots = cubeSlots(units, options.fillOrder)
  const packed =
    options.strategy === 'ordered'
      ? packOrdered(unitsOrdered, slots.length, ctx, options)
      : packCompact(
          unitsOrdered.map((u) => u.items),
          slots.length,
          ctx,
        )

  for (const item of packed.leftover) unplaced.push({ gameId: item.game.id, reason: 'no-space' })

  const cubes: CubeLayout[] = slots.map((slot, index) => {
    const state = packed.states[index]
    return {
      index,
      unitId: slot.unitId,
      column: slot.column,
      row: slot.row,
      placements: state ? toPlacements(state, ctx) : [],
      usedWidth: state?.used ?? 0,
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
    for (const u of unitsOrdered)
      for (const { game } of u.items) {
        if (u.group) groups[game.id] = u.group
        else delete groups[game.id]
      }
  }

  const placedVolume = packed.states.reduce((acc, s) => acc + s.volume, 0)
  const cubeVolume = cube.width * cube.height * cube.depth
  return {
    cubes,
    tops: top.tops,
    unplaced,
    sagas,
    groups,
    stats: {
      totalGames: shelved.length,
      placedGames: shelved.length - unplaced.length,
      totalCubes: slots.length,
      usedCubes: packed.states.length,
      volumeFill: packed.states.length ? placedVolume / (packed.states.length * cubeVolume) : 0,
    },
  }
}
