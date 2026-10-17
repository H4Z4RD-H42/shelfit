import type { CubeSize, OverhangSide, ShelfUnit } from './types'

/** Usable interior of a KALLAX cube, measured on the real furniture. */
export const KALLAX_CUBE: CubeSize = { width: 33.5, height: 33.5, depth: 38.5 }

/** Panel thickness of the outer frame and of the inner dividers; depth of the frame. */
export const FRAME = {
  outer: 4.25,
  inner: 1.5,
  depth: 39,
} as const

/** Official KALLAX grid sizes (columns × rows). */
export const KALLAX_PRESETS: ReadonlyArray<{ columns: number; rows: number }> = [
  { columns: 1, rows: 1 },
  { columns: 1, rows: 2 },
  { columns: 2, rows: 1 },
  { columns: 1, rows: 4 },
  { columns: 4, rows: 1 },
  { columns: 2, rows: 2 },
  { columns: 2, rows: 4 },
  { columns: 4, rows: 2 },
  { columns: 2, rows: 5 },
  { columns: 5, rows: 2 },
  { columns: 4, rows: 4 },
  { columns: 5, rows: 5 },
]

/** Finishes available for the frame. */
export const KALLAX_FINISHES: ReadonlyArray<{ id: string; color: string }> = [
  { id: 'white', color: '#f2f0eb' },
  { id: 'black-brown', color: '#2f2723' },
  { id: 'white-oak', color: '#e3d7c3' },
  { id: 'oak', color: '#c9a675' },
  { id: 'high-gloss-red', color: '#a3242b' },
  { id: 'gray-turquoise', color: '#6f8f8c' },
]

export const unitOverhang = (unit: Pick<ShelfUnit, 'overhang'>) => Math.max(0, unit.overhang ?? 0)
export const unitOverhangSide = (unit: Pick<ShelfUnit, 'overhangSide'>): OverhangSide => unit.overhangSide ?? 'front'
export const isTopFree = (unit: Pick<ShelfUnit, 'topFree'>) => unit.topFree !== false

export const cubeKey = (column: number, row: number) => `${column}:${row}`

export function isBlocked(unit: Pick<ShelfUnit, 'blocked'>, column: number, row: number): boolean {
  return !!unit.blocked?.includes(cubeKey(column, row))
}
