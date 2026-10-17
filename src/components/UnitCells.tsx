import type { CSSProperties, ReactNode } from 'react'
import { interiorBox, unitGeometry, type UnitCell } from '../domain/geometry'
import type { ShelfUnit } from '../domain/types'

/** Room (px) left between two compartments, however thin the panel. */
const GAP = 3

/**
 * The compartments of a unit drawn to scale within `max` (px), as a picker:
 * `render` draws each of them, given the style that puts it in place.
 */
export function UnitCells({
  unit,
  max,
  render,
}: {
  unit: ShelfUnit
  max: { width: number; height: number }
  render: (cell: UnitCell, style: CSSProperties) => ReactNode
}) {
  const box = interiorBox(unit)
  const scale = Math.min(max.width / box.width, max.height / box.height)
  return (
    <div className="relative shrink-0" style={{ width: box.width * scale, height: box.height * scale }}>
      {unitGeometry(unit).cells.map((cell) =>
        render(cell, {
          position: 'absolute',
          left: (cell.x - box.left) * scale + GAP / 2,
          top: (box.top - cell.y - cell.size.height) * scale + GAP / 2,
          width: cell.size.width * scale - GAP,
          height: cell.size.height * scale - GAP,
        }),
      )}
    </div>
  )
}
