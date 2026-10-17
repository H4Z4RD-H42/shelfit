import { useMemo } from 'react'
import { contrastText, gameColor } from '../../domain/color'
import { cubeOrigin, unitOffsets, unitOuterSize } from '../../domain/kallax'
import type { Placement } from '../../domain/types'
import { useGamesById, useLayout } from '../../hooks/useLayout'
import { useAppStore } from '../../store/appStore'

const PAD = 6

/** Flat, printable elevation of the shelves seen from the front. */
export function FrontView() {
  const units = useAppStore((s) => s.units)
  const cube = useAppStore((s) => s.cube)
  const selectedId = useAppStore((s) => s.selectedId)
  const select = useAppStore((s) => s.select)
  const layout = useLayout()
  const games = useGamesById()

  const offsets = useMemo(() => unitOffsets(units, cube), [units, cube])
  const sizes = units.map((u) => unitOuterSize(u, cube))
  const width = offsets.length ? offsets[offsets.length - 1]! + sizes[sizes.length - 1]!.width : 0
  const height = Math.max(...sizes.map((s) => s.height))

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
                return (
                  <rect
                    key={k}
                    x={o.x}
                    y={size.height - o.y - cube.height}
                    width={cube.width}
                    height={cube.height}
                    fill="rgba(0,0,0,.28)"
                  />
                )
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
                color={gameColor(game)}
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
  const fontSize = Math.min(across * 0.5, 2.4)
  const maxChars = Math.floor((along - 1.5) / (fontSize * 0.56))
  const label = name.length > maxChars ? `${name.slice(0, Math.max(0, maxChars - 1))}…` : name
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
      {fontSize >= 0.9 && maxChars >= 3 && (
        <text
          x={cx}
          y={cy}
          fontSize={fontSize}
          fontWeight={600}
          fill={contrastText(color)}
          textAnchor="middle"
          dominantBaseline="central"
          transform={vertical ? `rotate(-90 ${cx} ${cy})` : undefined}
          style={{ pointerEvents: 'none', fontFamily: 'var(--font-display)' }}
        >
          {label}
        </text>
      )}
    </g>
  )
}
