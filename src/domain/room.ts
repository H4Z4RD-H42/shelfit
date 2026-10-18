import { cubeSlots } from './geometry'
import { cubeCapacity, orientations } from './packer'
import { missing, planLayout } from './rules'
import { STANDARD_BOX } from './zones'
import type { Game, Layout, PackOptions, ShelfUnit, Zone } from './types'

export interface FreeRoom {
  /** Cubes with no game. */
  emptyCubes: number
  /** Standard boxes (30 × 30 × 7 cm) that could join the collection with no game left out. */
  boxes: number
}

// The name sorts after every title and makes no saga.
const standardBox = (i: number): Game => ({
  id: `room:${i}`,
  name: '￿',
  dims: STANDARD_BOX,
  orientation: 'inherit',
  createdAt: Number.MAX_SAFE_INTEGER,
})

/**
 * Room left on the shelves, counted in standard boxes: how many could join
 * the collection and still find a place, with no game left out that has one
 * now. The engine plans the whole collection again for each try, giving up
 * rules as the priorities allow, as it would for real new games.
 */
export function freeRoom(games: Game[], units: ShelfUnit[], options: PackOptions, zones: Zone[], layout: Layout): FreeRoom {
  const emptyCubes = layout.cubes.filter((c) => c.placements.length === 0).length
  const out = missing(layout)
  const fits = (n: number) =>
    missing(planLayout([...games, ...Array.from({ length: n }, (_, i) => standardBox(i))], units, options, zones)) <= out
  // No cube takes more standard boxes than an empty one.
  let hi = cubeSlots(units, options.fillOrder).reduce(
    (n, { cell: { size } }) =>
      n + cubeCapacity(orientations(STANDARD_BOX, size, options.clearance), size, options.clearance, size.height),
    0,
  )
  let lo = 0
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    if (fits(mid)) lo = mid
    else hi = mid - 1
  }
  return { emptyCubes, boxes: lo }
}
