import { describe, expect, it } from 'vitest'
import { DEFAULT_OPTIONS, migrateCube } from './defaults'
import { cellAt, cubeSlots, editShape, existingIn, kallaxShape, remapKeys, unitGeometry } from './geometry'
import { FRAME, KALLAX_CUBE } from './kallax'
import { packCollection } from './packer'
import type { CustomShape, Game, ShelfUnit } from './types'

const kallax = (columns: number, rows: number): ShelfUnit => ({ id: 'k', name: 'K', columns, rows, color: '#fff' })

/** A bookcase with a wide column of two tall compartments and a narrow one of three, shorter overall. */
const shape: CustomShape = {
  columns: [
    { width: 60, cells: [40, 40] },
    { width: 30, cells: [20, 20, 20] },
  ],
  depth: 30,
  outer: 2,
  inner: 1,
}
const custom = (s: CustomShape = shape): ShelfUnit => ({
  id: 'c',
  name: 'C',
  kind: 'custom',
  columns: 1,
  rows: 1,
  color: '#fff',
  custom: s,
})

describe('unitGeometry', () => {
  it('builds a KALLAX from its standard sizes', () => {
    const g = unitGeometry(kallax(2, 2))
    expect(g.width).toBeCloseTo(2 * KALLAX_CUBE.width + FRAME.inner + 2 * FRAME.outer)
    expect(g.height).toBeCloseTo(g.width)
    expect(g.depth).toBe(FRAME.depth)
    expect(g.cells).toHaveLength(4)
    // Row 0 is the top row.
    expect(cellAt(g, 1, 0)).toMatchObject({
      x: FRAME.outer + KALLAX_CUBE.width + FRAME.inner,
      y: FRAME.outer + KALLAX_CUBE.height + FRAME.inner,
      size: KALLAX_CUBE,
      below: FRAME.inner,
    })
    expect(cellAt(g, 0, 1)).toMatchObject({ y: FRAME.outer, below: FRAME.outer })
    expect(g.top).toEqual({ x: 0, y: g.height, width: g.width })
  })

  it('lets every column of a custom unit have its own sizes', () => {
    const g = unitGeometry(custom())
    expect(g.width).toBe(2 + 60 + 1 + 30 + 2)
    // The wide column is 2 + 40 + 1 + 40 + 2 = 85 cm tall, the narrow one 2 + 3 × 20 + 2 × 1 + 2 = 66.
    expect(g.height).toBe(85)
    expect(g.depth).toBe(30)
    expect(cellAt(g, 1, 2)).toEqual({ column: 1, row: 2, x: 63, y: 2, size: { width: 30, height: 20, depth: 30 }, below: 2 })
    expect(cellAt(g, 1, 0)!.y).toBe(2 + 20 + 1 + 20 + 1)
    // Boxes on top go on the tall column only.
    expect(g.top).toEqual({ x: 0, y: 85, width: 2 + 60 + 1 })
    // The silhouette steps down over the narrow column.
    expect(g.outline).toEqual([
      { x: 0, y: 0 },
      { x: 0, y: 85 },
      { x: 63, y: 85 },
      { x: 63, y: 66 },
      { x: 95, y: 66 },
      { x: 95, y: 0 },
    ])
  })
})

describe('cubeSlots', () => {
  it('reads a custom unit by rows, from the highest compartment down', () => {
    const slots = cubeSlots([custom()], 'rows')
    // Tops: wide 83 and 42; narrow 64, 43 and 22. Tops 1 cm apart make one row.
    expect(slots.map((s) => `${s.column}:${s.row}`)).toEqual(['0:0', '1:0', '0:1', '1:1', '1:2'])
    expect(slots.map((s) => s.line)).toEqual([0, 1, 2, 2, 3])
  })

  it('reads by columns, each from the top', () => {
    expect(cubeSlots([custom()], 'columns').map((s) => `${s.column}:${s.row}`)).toEqual(['0:0', '0:1', '1:0', '1:1', '1:2'])
  })

  it('keeps the KALLAX order and skips blocked cubes', () => {
    const slots = cubeSlots([{ ...kallax(2, 2), blocked: ['1:0'] }], 'rows')
    expect(slots.map((s) => `${s.column}:${s.row}`)).toEqual(['0:0', '0:1', '1:1'])
    expect(slots.map((s) => s.line)).toEqual([0, 1, 1])
  })
})

describe('editShape', () => {
  it('starts a custom unit from the KALLAX grid', () => {
    const s = kallaxShape(kallax(2, 3))
    expect(s.columns).toHaveLength(2)
    expect(s.columns[0]).toEqual({ width: KALLAX_CUBE.width, cells: [33.5, 33.5, 33.5] })
    expect(unitGeometry(custom(s)).width).toBeCloseTo(unitGeometry(kallax(2, 3)).width)
  })

  it('adds a compartment and moves the keys below it', () => {
    const { shape: s, remap } = editShape(shape, { type: 'addCell', column: 1, at: 1, copy: 1 })
    expect(s.columns[1]!.cells).toHaveLength(4)
    expect(shape.columns[1]!.cells).toHaveLength(3)
    expect(remapKeys(['1:0', '1:1', '1:2', '0:1'], remap)).toEqual(['1:0', '1:2', '1:3', '0:1'])
  })

  it('removes a column and forgets its keys', () => {
    const { shape: s, remap } = editShape(shape, { type: 'removeColumn', column: 0 })
    expect(s.columns).toEqual([shape.columns[1]])
    expect(remapKeys(['u:0:0', 'u:1:2', 'v:1:0'], remap, 'u:')).toEqual(['u:0:2', 'v:1:0'])
  })

  it('copies a column next to it', () => {
    const { shape: s, remap } = editShape(shape, { type: 'addColumn', at: 1, copy: 0 })
    expect(s.columns.map((c) => c.width)).toEqual([60, 60, 30])
    expect(remap(1, 2)).toEqual([2, 2])
  })

  it('never removes the last compartment or the last column', () => {
    const one: CustomShape = { ...shape, columns: [{ width: 40, cells: [30] }] }
    expect(editShape(one, { type: 'removeCell', column: 0, row: 0 }).shape.columns).toEqual(one.columns)
    expect(editShape(one, { type: 'removeColumn', column: 0 }).shape.columns).toEqual(one.columns)
  })
})

describe('migrateCube', () => {
  it('turns KALLAX units with a changed cube into custom units', () => {
    const units = [kallax(2, 1)]
    expect(migrateCube(units, KALLAX_CUBE)).toBe(units)
    const [u] = migrateCube(units, { width: 40, height: 35, depth: 30 })
    expect(u!.kind).toBe('custom')
    expect(u!.custom!.columns).toEqual([
      { width: 40, cells: [35] },
      { width: 40, cells: [35] },
    ])
    expect(u!.custom!.depth).toBe(30)
  })
})

describe('packing custom units', () => {
  let seq = 0
  const game = (name: string, w: number, h: number, d: number): Game => ({
    id: `g${++seq}`,
    name,
    dims: { width: w, height: h, depth: d },
    orientation: 'inherit',
    createdAt: seq,
  })

  it('puts each box in a compartment large enough for it', () => {
    const tall = game('Tall', 36, 28, 8)
    const small = game('Small', 18, 18, 5)
    const narrowFirst = custom({ ...shape, columns: [shape.columns[1]!, shape.columns[0]!] })
    const layout = packCollection([small, tall], [narrowFirst], {
      ...DEFAULT_OPTIONS,
      orientation: 'vertical',
      fillOrder: 'columns',
    })
    const where = (g: Game) => layout.cubes.find((c) => c.placements.some((p) => p.gameId === g.id))
    expect(where(small)).toMatchObject({ column: 0, row: 0 })
    // Too tall for the 20 cm compartments: it waits for the wide column.
    expect(where(tall)).toMatchObject({ column: 1, row: 0 })
    expect(layout.unplaced).toEqual([])
    expect(layout.stats.totalCubes).toBe(5)
  })

  it('stores boxes on the highest top, measured from the left side of the unit', () => {
    const steps = custom({
      ...shape,
      columns: [
        { width: 30, cells: [20] },
        { width: 60, cells: [40] },
      ],
    })
    const box = game('Box', 50, 40, 10)
    const [p] = packCollection([box], [steps], DEFAULT_OPTIONS).tops[0]!.placements
    // The top of the tall column starts after the short column and the divider.
    expect(p!.x).toBeCloseTo(2 + 30 + DEFAULT_OPTIONS.clearance / 2)
    const huge = game('Huge', 80, 70, 10)
    expect(packCollection([huge], [steps], DEFAULT_OPTIONS).unplaced).toEqual([{ gameId: huge.id, reason: 'too-big' }])
    const flat = custom({
      ...shape,
      columns: [
        { width: 30, cells: [40] },
        { width: 60, cells: [40] },
      ],
    })
    expect(packCollection([huge], [flat], DEFAULT_OPTIONS).tops[0]!.placements).toHaveLength(1)
  })
})

describe('existingIn', () => {
  it('drops the keys of cubes a smaller KALLAX no longer has', () => {
    const unit: ShelfUnit = { id: 'u', name: 'U', columns: 2, rows: 2, color: '#fff' }
    expect(remapKeys(['0:0', '1:1', '6:3', '0:2'], existingIn(unit))).toEqual(['0:0', '1:1'])
    expect(remapKeys(['u:1:1', 'u:2:0', 'v:5:5'], existingIn(unit), 'u:')).toEqual(['u:1:1', 'v:5:5'])
  })
})
