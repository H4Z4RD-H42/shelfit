import { FRAME, KALLAX_CUBE, isBlocked } from './kallax'
import type { CubeSize, CustomColumn, CustomShape, FillOrder, ShelfUnit } from './types'

/*
 * Every unit, KALLAX or custom, is a row of columns standing on the floor.
 * Each column holds compartments stacked on top of each other; a KALLAX unit
 * is the special case where all the columns and all the compartments match.
 * Coordinates are relative to the bottom-left-front outer corner of the unit,
 * x to the right and y up.
 */

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** A compartment (cube) of a unit. */
export interface UnitCell {
  column: number
  /** Compartment of the column, from the top (0-based); the row in a KALLAX grid. */
  row: number
  /** Bottom-left-front interior corner. */
  x: number
  y: number
  size: CubeSize
  /** Thickness of the panel the compartment stands on. */
  below: number
}

export interface UnitGeometry {
  width: number
  height: number
  /** Depth of the frame. */
  depth: number
  /** Column by column, each from the top. */
  cells: UnitCell[]
  /** Front faces of the panels; every panel is as deep as the frame. */
  panels: Rect[]
  /** Silhouette of the unit seen from the front, as a polygon. */
  outline: { x: number; y: number }[]
  /** The highest flat top, where boxes may lie. */
  top: { x: number; y: number; width: number }
}

export const isCustom = (unit: Pick<ShelfUnit, 'kind'>) => unit.kind === 'custom'

/** Custom shape matching a KALLAX grid: the starting point of a unit built by hand. */
export function kallaxShape(unit: Pick<ShelfUnit, 'columns' | 'rows'>, cube: CubeSize = KALLAX_CUBE): CustomShape {
  return {
    columns: Array.from({ length: unit.columns }, () => ({
      width: cube.width,
      cells: Array.from({ length: unit.rows }, () => cube.height),
    })),
    depth: cube.depth,
    outer: FRAME.outer,
    inner: FRAME.inner,
  }
}

/** Shape of any unit; `frameDepth` differs from the interior depth only for KALLAX. */
export function unitShape(unit: ShelfUnit): CustomShape & { frameDepth: number } {
  if (isCustom(unit) && unit.custom) return { ...unit.custom, frameDepth: unit.custom.depth }
  return { ...kallaxShape(unit), frameDepth: FRAME.depth }
}

const columnInterior = (c: CustomColumn, inner: number) => c.cells.reduce((acc, h) => acc + h, 0) + (c.cells.length - 1) * inner

const cache = new WeakMap<ShelfUnit, UnitGeometry>()

/** Cells, panels and size of a unit (cached: units are immutable). */
export function unitGeometry(unit: ShelfUnit): UnitGeometry {
  let geometry = cache.get(unit)
  if (!geometry) {
    geometry = buildGeometry(unitShape(unit))
    cache.set(unit, geometry)
  }
  return geometry
}

function buildGeometry(shape: CustomShape & { frameDepth: number }): UnitGeometry {
  const { columns, outer, inner, depth } = shape
  const n = columns.length
  const xs: number[] = []
  let x = outer
  for (const c of columns) {
    xs.push(x)
    x += c.width + inner
  }
  const width = x - inner + outer
  const heights = columns.map((c) => columnInterior(c, inner) + 2 * outer)
  const height = Math.max(...heights)

  const cells: UnitCell[] = []
  const panels: Rect[] = [
    { x: outer, y: 0, width: width - 2 * outer, height: outer },
    { x: 0, y: 0, width: outer, height: heights[0]! },
    { x: width - outer, y: 0, width: outer, height: heights[n - 1]! },
  ]
  columns.forEach((c, column) => {
    const cx = xs[column]!
    panels.push({ x: cx, y: heights[column]! - outer, width: c.width, height: outer })
    if (column < n - 1) {
      const h = Math.max(heights[column]!, heights[column + 1]!)
      panels.push({ x: cx + c.width, y: outer, width: inner, height: h - outer })
    }
    let y = outer
    for (let row = c.cells.length - 1; row >= 0; row--) {
      const h = c.cells[row]!
      const last = row === c.cells.length - 1
      if (!last) panels.push({ x: cx, y: y - inner, width: c.width, height: inner })
      cells.push({ column, row, x: cx, y, size: { width: c.width, height: h, depth }, below: last ? outer : inner })
      y += h + inner
    }
  })
  cells.sort((a, b) => a.column - b.column || a.row - b.row)

  // Silhouette: the height of each stretch of the front, from left to right.
  const stretches: { x0: number; x1: number; h: number }[] = []
  const push = (x0: number, x1: number, h: number) => {
    const last = stretches[stretches.length - 1]
    if (last && Math.abs(last.h - h) < 1e-9) last.x1 = x1
    else stretches.push({ x0, x1, h })
  }
  push(0, outer, heights[0]!)
  columns.forEach((c, column) => {
    const cx = xs[column]!
    push(cx, cx + c.width, heights[column]!)
    if (column < n - 1) push(cx + c.width, cx + c.width + inner, Math.max(heights[column]!, heights[column + 1]!))
  })
  push(width - outer, width, heights[n - 1]!)
  const outline = [
    { x: 0, y: 0 },
    ...stretches.flatMap((s) => [
      { x: s.x0, y: s.h },
      { x: s.x1, y: s.h },
    ]),
    { x: width, y: 0 },
  ]

  // The widest run of columns as tall as the unit.
  let best = { first: 0, last: -1 }
  for (let first = 0; first < n; first++) {
    if (Math.abs(heights[first]! - height) > 1e-9) continue
    let last = first
    while (last + 1 < n && Math.abs(heights[last + 1]! - height) < 1e-9) last++
    if (last - first > best.last - best.first) best = { first, last }
    first = last
  }
  const left = best.first === 0 ? 0 : xs[best.first]! - inner
  const right = best.last === n - 1 ? width : xs[best.last]! + columns[best.last]!.width + inner
  return {
    width,
    height,
    depth: shape.frameDepth,
    cells,
    panels,
    outline,
    top: { x: left, y: height, width: right - left },
  }
}

/** Interior of a unit: the box around its compartments. */
export function interiorBox(unit: ShelfUnit) {
  const { cells } = unitGeometry(unit)
  const left = Math.min(...cells.map((c) => c.x))
  const right = Math.max(...cells.map((c) => c.x + c.size.width))
  const bottom = Math.min(...cells.map((c) => c.y))
  const top = Math.max(...cells.map((c) => c.y + c.size.height))
  return { left, bottom, top, width: right - left, height: top - bottom }
}

export function cellAt(geometry: UnitGeometry, column: number, row: number): UnitCell | undefined {
  return geometry.cells.find((c) => c.column === column && c.row === row)
}

/** Horizontal gap between two units placed side by side in the views. */
export const UNIT_GAP = 12

/** Left offset of every unit when they stand side by side. */
export function unitOffsets(units: ShelfUnit[]): number[] {
  let x = 0
  return units.map((u) => {
    const offset = x
    x += unitGeometry(u).width + UNIT_GAP
    return offset
  })
}

export interface CubeSlot {
  unitId: string
  column: number
  /** Row 0 is the top row (in a custom unit, the top compartment of the column). */
  row: number
  /** Shelf line of the unit the cube belongs to: a row, or a column. */
  line: number
  cell: UnitCell
}

/** Compartments whose tops differ by less than this (cm) are on the same row. */
const SAME_ROW = 1

/**
 * Lists every usable cube of every unit, in the order in which they are filled.
 * By rows, the cubes go from the highest to the lowest, left to right; in a
 * custom unit the shelves of different columns need not line up, so a row
 * is made of the compartments whose tops are at about the same height.
 */
export function cubeSlots(units: ShelfUnit[], fillOrder: FillOrder): CubeSlot[] {
  const slots: CubeSlot[] = []
  for (const unit of units) {
    const cells = unitGeometry(unit).cells.filter((c) => !isBlocked(unit, c.column, c.row))
    if (fillOrder === 'columns') {
      for (const cell of cells) slots.push({ unitId: unit.id, column: cell.column, row: cell.row, line: cell.column, cell })
      continue
    }
    const topOf = (c: UnitCell) => c.y + c.size.height
    const sorted = cells.slice().sort((a, b) => topOf(b) - topOf(a) || a.x - b.x)
    let line = -1
    let lineTop = Infinity
    const rows: UnitCell[][] = []
    for (const cell of sorted) {
      if (topOf(cell) < lineTop - SAME_ROW) {
        line++
        lineTop = topOf(cell)
        rows.push([])
      }
      rows[line]!.push(cell)
    }
    rows.forEach((row, l) => {
      for (const cell of row.sort((a, b) => a.x - b.x))
        slots.push({ unitId: unit.id, column: cell.column, row: cell.row, line: l, cell })
    })
  }
  return slots
}

export type ShapeEdit =
  | { type: 'addColumn'; at: number; copy: number }
  | { type: 'removeColumn'; column: number }
  | { type: 'addCell'; column: number; at: number; copy: number }
  | { type: 'removeCell'; column: number; row: number }

/** New place of a compartment after an edit, or undefined when it is gone. */
export type Remap = (column: number, row: number) => [number, number] | undefined

/**
 * Adds or removes a column or a compartment. A new one copies the size of an
 * existing one. The remap tells where every compartment went, so that the keys
 * pointing to them (blocked cubes, zone cubes) follow.
 */
export function editShape(shape: CustomShape, edit: ShapeEdit): { shape: CustomShape; remap: Remap } {
  const columns = shape.columns.map((c) => ({ ...c, cells: c.cells.slice() }))
  let remap: Remap = (column, row) => [column, row]
  switch (edit.type) {
    case 'addColumn': {
      const source = columns[edit.copy]
      if (!source) break
      columns.splice(edit.at, 0, { ...source, cells: source.cells.slice() })
      remap = (column, row) => [column >= edit.at ? column + 1 : column, row]
      break
    }
    case 'removeColumn':
      if (columns.length < 2 || !columns[edit.column]) break
      columns.splice(edit.column, 1)
      remap = (column, row) => (column === edit.column ? undefined : [column > edit.column ? column - 1 : column, row])
      break
    case 'addCell': {
      const c = columns[edit.column]
      const height = c?.cells[edit.copy]
      if (!c || height === undefined) break
      c.cells.splice(edit.at, 0, height)
      remap = (column, row) => [column, column === edit.column && row >= edit.at ? row + 1 : row]
      break
    }
    case 'removeCell': {
      const c = columns[edit.column]
      if (!c || c.cells.length < 2 || c.cells[edit.row] === undefined) break
      c.cells.splice(edit.row, 1)
      remap = (column, row) =>
        column !== edit.column ? [column, row] : row === edit.row ? undefined : [column, row > edit.row ? row - 1 : row]
      break
    }
  }
  return { shape: { ...shape, columns }, remap }
}

/** Keeps the compartments the unit has: a smaller KALLAX drops the keys of the cubes it lost. */
export function existingIn(unit: ShelfUnit): Remap {
  const { columns } = unitShape(unit)
  return (column, row) => (row >= 0 && row < (columns[column]?.cells.length ?? 0) ? [column, row] : undefined)
}

/** Applies a remap to `column:row` keys, after an optional prefix (e.g. `unitId:`). */
export function remapKeys(keys: string[] | undefined, remap: Remap, prefix = ''): string[] | undefined {
  if (!keys) return keys
  return keys.flatMap((key) => {
    if (!key.startsWith(prefix)) return [key]
    const [column, row] = key.slice(prefix.length).split(':').map(Number) as [number, number]
    const to = remap(column, row)
    return to ? [`${prefix}${to[0]}:${to[1]}`] : []
  })
}
