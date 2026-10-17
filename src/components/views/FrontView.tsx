import { useMemo } from 'react'
import { contrastText } from '../../domain/color'
import { LINE_HEIGHT } from '../../domain/label'
import { cubeOrigin, isBlocked, unitOffsets, unitOuterSize } from '../../domain/kallax'
import type { Placement } from '../../domain/types'
import { useBoxColor } from '../../hooks/useBoxColor'
import { useGamesById, useLayout } from '../../hooks/useLayout'
import { useAppStore } from '../../store/appStore'
import { fitBoxLabel, LABEL_WEIGHT } from '../boxLabel'

const PAD = 6

/** Flat, printable elevation of the shelves seen from the front. */
export function FrontView() {
  const units = useAppStore((s) => s.units)
  const cube = useAppStore((s) => s.cube)
  const selectedId = useAppStore((s) => s.selectedId)
  const select = useAppStore((s) => s.select)
  const layout = useLayout()
  const games = useGamesById()
  const boxColor = useBoxColor()

  const offsets = useMemo(() => unitOffsets(units, cube), [units, cube])
  const sizes = units.map((u) => unitOuterSize(u, cube))
  const width = offsets.length ? offsets[offsets.length - 1]! + sizes[sizes.length - 1]!.width : 0
  const topHeight = (unitId: string) =>
    Math.max(0, ...(layout.tops.find((t) => t.unitId === unitId)?.placements.map((p) => p.y + p.sy) ?? []))
  const shelfHeight = Math.max(...sizes.map((s) => s.height))
  // Room above the tallest unit for the boxes stored on top.
  const height = Math.max(...units.map((u, i) => sizes[i]!.height + topHeight(u.id)), shelfHeight)

  const unitIndex = new Map(units.map((u, i) => [u.id, i]))

  return (
    <div className="flex h-full w-full items-center justify-center overflow-auto p-4 sm:p-8">
      <svg
        viewBox={`${-PAD} ${-PAD} ${width + 2 * PAD} ${height + 2 * PAD}`}
        className="h-full max-h-full w-full max-w-full"
        role="img"
        onClick={() => select(null)}
      >
        <defs>
          <filter id="box-shadow" x="-10%" y="-10%" width="120%" height="120%">
            <feDropShadow dx="0" dy="0.3" stdDeviation="0.3" floodOpacity="0.35" />
          </filter>
        </defs>
        {units.map((unit, ui) => {
          const size = sizes[ui]!
          const ox = offsets[ui]!
          const top = height - size.height
          return (
            <g key={unit.id} transform={`translate(${ox} ${top})`}>
              <rect
                width={size.width}
                height={size.height}
                rx={0.6}
                fill={unit.color}
                stroke="rgba(0,0,0,.25)"
                strokeWidth={0.2}
              />
              {Array.from({ length: unit.columns * unit.rows }, (_, k) => {
                const column = k % unit.columns
                const row = Math.floor(k / unit.columns)
                const o = cubeOrigin(unit, column, row, cube)
                const y = size.height - o.y - cube.height
                if (isBlocked(unit, column, row)) return <DrawerInsert key={k} x={o.x} y={y} size={cube.width} />
                return <rect key={k} x={o.x} y={y} width={cube.width} height={cube.height} fill="rgba(0,0,0,.28)" />
              })}
              <text x={size.width / 2} y={size.height + 4.5} textAnchor="middle" fontSize={2.6} className="fill-ink-soft">
                {unit.name}
              </text>
            </g>
          )
        })}

        {layout.cubes.map((c) => {
          const ui = unitIndex.get(c.unitId)
          if (ui === undefined) return null
          const unit = units[ui]!
          const o = cubeOrigin(unit, c.column, c.row, cube)
          const baseX = offsets[ui]! + o.x
          const baseY = height - o.y // SVG y of the cube floor
          return c.placements.map((p) => {
            const game = games.get(p.gameId)
            if (!game) return null
            return (
              <BoxRect
                key={p.gameId}
                p={p}
                x={baseX + p.x}
                y={baseY - p.y - p.sy}
                name={game.name}
                color={boxColor(game)}
                selected={p.gameId === selectedId}
                onSelect={() => select(p.gameId)}
              />
            )
          })
        })}

        {layout.tops.map((top) => {
          const ui = unitIndex.get(top.unitId)
          if (ui === undefined) return null
          const baseY = height - sizes[ui]!.height // SVG y of the top panel
          return top.placements.map((p) => {
            const game = games.get(p.gameId)
            if (!game) return null
            return (
              <BoxRect
                key={p.gameId}
                p={p}
                x={offsets[ui]! + p.x}
                y={baseY - p.y - p.sy}
                name={game.name}
                color={boxColor(game)}
                selected={p.gameId === selectedId}
                onSelect={() => select(p.gameId)}
              />
            )
          })
        })}
      </svg>
    </div>
  )
}

/** A cube taken by an insert: drawn as two drawers. */
function DrawerInsert({ x, y, size }: { x: number; y: number; size: number }) {
  const h = size / 2
  return (
    <g>
      <rect x={x} y={y} width={size} height={size} fill="rgba(0,0,0,.12)" />
      {[0, 1].map((i) => (
        <g key={i}>
          <rect
            x={x + 0.6}
            y={y + i * h + 0.6}
            width={size - 1.2}
            height={h - 1.2}
            rx={0.4}
            fill="rgba(255,255,255,.18)"
            stroke="rgba(0,0,0,.2)"
            strokeWidth={0.15}
          />
          <rect x={x + size / 2 - 3} y={y + i * h + h / 2 - 0.4} width={6} height={0.8} rx={0.4} fill="rgba(0,0,0,.35)" />
        </g>
      ))}
    </g>
  )
}

function BoxRect({
  p,
  x,
  y,
  name,
  color,
  selected,
  onSelect,
}: {
  p: Placement
  x: number
  y: number
  name: string
  color: string
  selected: boolean
  onSelect: () => void
}) {
  const vertical = p.orientation === 'vertical'
  const along = vertical ? p.sy : p.sx
  const across = vertical ? p.sx : p.sy
  const label = useMemo(
    () => fitBoxLabel(name, { width: along - 1.5, height: across, maxFont: 2.4, minFont: 0.9 }),
    [name, along, across],
  )
  const cx = x + p.sx / 2
  const cy = y + p.sy / 2

  return (
    <g
      className="cursor-pointer"
      onClick={(e) => {
        e.stopPropagation()
        onSelect()
      }}
    >
      <title>{name}</title>
      <rect
        x={x}
        y={y}
        width={p.sx}
        height={p.sy}
        rx={0.25}
        fill={color}
        filter="url(#box-shadow)"
        stroke={selected ? 'var(--accent)' : 'rgba(0,0,0,.35)'}
        strokeWidth={selected ? 0.6 : 0.12}
      />
      {label && (
        <text
          fontSize={label.fontSize}
          fontWeight={LABEL_WEIGHT}
          fill={contrastText(color)}
          textAnchor="middle"
          dominantBaseline="central"
          transform={vertical ? `rotate(-90 ${cx} ${cy})` : undefined}
          style={{ pointerEvents: 'none', fontFamily: 'var(--font-display)' }}
        >
          {label.lines.map((line, i) => (
            <tspan
              key={i}
              x={cx}
              y={cy + (i - (label.lines.length - 1) / 2) * LINE_HEIGHT * label.fontSize}
              dominantBaseline="central"
            >
              {line}
            </tspan>
          ))}
        </text>
      )}
    </g>
  )
}
