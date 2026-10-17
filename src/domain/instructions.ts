import type { Placement } from './types'

/** One step of the instructions to fill a cube by hand, left to right. */
export interface Step {
  kind: 'standing' | 'stack'
  /** For a stack, from the bottom up. */
  gameIds: string[]
}

/** Turns the placements of a cube (or of a top panel) into ordered steps. */
export function placementSteps(placements: Placement[]): Step[] {
  const columns = new Map<number, Placement[]>()
  for (const p of placements) {
    const list = columns.get(p.column) ?? []
    list.push(p)
    columns.set(p.column, list)
  }
  return [...columns.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, list]) => ({
      kind: list[0]!.orientation === 'vertical' ? 'standing' : 'stack',
      gameIds: list.sort((a, b) => a.level - b.level).map((p) => p.gameId),
    }))
}
