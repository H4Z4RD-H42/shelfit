import type { CubeSize, FillOrder, ShelfUnit } from './types'

/** Usable interior of a KALLAX cube, measured on the real furniture. */
export const KALLAX_CUBE: CubeSize = { width: 33.5, height: 33.5, depth: 38.5 }

/** Panel thickness of the outer frame and of the inner dividers. */
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

/** External size of a unit, derived from the cube interior. */
export function unitOuterSize(unit: Pick<ShelfUnit, 'columns' | 'rows'>, cube: CubeSize) {
  return {
    width: unit.columns * cube.width + (unit.columns - 1) * FRAME.inner + 2 * FRAME.outer,
    height: unit.rows * cube.height + (unit.rows - 1) * FRAME.inner + 2 * FRAME.outer,
    depth: FRAME.depth,
  }
}

/** Bottom-left-front interior corner of a cube, relative to the unit's
 * bottom-left-front outer corner. Row 0 is the top row. */
export function cubeOrigin(unit: Pick<ShelfUnit, 'rows'>, column: number, row: number, cube: CubeSize) {
  return {
    x: FRAME.outer + column * (cube.width + FRAME.inner),
    y: FRAME.outer + (unit.rows - 1 - row) * (cube.height + FRAME.inner),
  }
}

/** Horizontal gap between two units placed side by side in the views. */
export const UNIT_GAP = 12

/** Left offset of every unit when they stand side by side. */
export function unitOffsets(units: ShelfUnit[], cube: CubeSize): number[] {
  let x = 0
  return units.map((u) => {
    const offset = x
    x += unitOuterSize(u, cube).width + UNIT_GAP
    return offset
  })
}

export interface CubeSlot {
  unitId: string
  column: number
  /** Row 0 is the top row. */
  row: number
}

/** Lists every cube of every unit, in the order in which they are filled. */
export function cubeSlots(units: ShelfUnit[], fillOrder: FillOrder): CubeSlot[] {
  const slots: CubeSlot[] = []
  for (const unit of units) {
    if (fillOrder === 'rows') {
      for (let row = 0; row < unit.rows; row++)
        for (let column = 0; column < unit.columns; column++) slots.push({ unitId: unit.id, column, row })
    } else {
      for (let column = 0; column < unit.columns; column++)
        for (let row = 0; row < unit.rows; row++) slots.push({ unitId: unit.id, column, row })
    }
  }
  return slots
}
