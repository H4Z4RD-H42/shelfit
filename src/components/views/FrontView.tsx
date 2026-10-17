import { useMemo } from 'react'
import { contrastText } from '../../domain/color'
import { LINE_HEIGHT } from '../../domain/label'
import { FRAME, cubeOrigin, isBlocked, unitOffsets, unitOuterSize } from '../../domain/kallax'
import type { Placement, ShelfUnit, Zone } from '../../domain/types'
import { cubeId, zoneRuns } from '../../domain/zones'
import { useBoxColor } from '../../hooks/useBoxColor'
import { useGamesById, useLayout } from '../../hooks/useLayout'
import { useZonesById } from '../../hooks/useZones'
import { useAppStore } from '../../store/appStore'
import { fitBoxLabel, LABEL_WEIGHT } from '../boxLabel'
import { zoneName } from '../labels'
import { useT } from '../../i18n'

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
  const zonesById = useZonesById()
  const cubeZone = new Map(layout.cubes.flatMap((c) => (c.zoneId ? [[cubeId(c), zonesById.get(c.zoneId)] as const] : [])))
  const runs = zoneRuns(layout.cubes)

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
                const zone = cubeZone.get(cubeId({ unitId: unit.id, column, row }))
                return (
                  <g key={k}>
                    <rect x={o.x} y={y} width={cube.width} height={cube.height} fill="rgba(0,0,0,.28)" />
                    {zone && <rect x={o.x} y={y} width={cube.width} height={cube.height} fill={zone.color} opacity={0.3} />}
                  </g>
                )
              })}
              {runs.map((run) => {
                const zone = zonesById.get(run.zoneId)
                if (run.unitId !== unit.id || !zone) return null
                return <ZoneLabel key={`${run.row}:${run.first}`} unit={unit} run={run} zone={zone} unitHeight={size.height} />
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

/** Label of a zone on the panel under its cubes, like a label-maker strip. */
function ZoneLabel({
  unit,
  run,
  zone,
  unitHeight,
}: {
  unit: ShelfUnit
  run: { row: number; first: number; last: number }
  zone: Zone
  unitHeight: number
}) {
  const t = useT()
  const cube = useAppStore((s) => s.cube)
  const first = cubeOrigin(unit, run.first, run.row, cube)
  const last = cubeOrigin(unit, run.last, run.row, cube)
  const panel = run.row === unit.rows - 1 ? FRAME.outer : FRAME.inner
  const height = Math.min(panel, 2)
  const width = last.x + cube.width - first.x
  const y = unitHeight - first.y + (panel - height) / 2
  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect x={first.x} y={y} width={width} height={height} rx={0.2} fill={zone.color} />
      <text
        x={first.x + width / 2}
        y={y + height / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={height * 0.7}
        fontWeight={LABEL_WEIGHT}
        fill={contrastText(zone.color)}
        style={{ fontFamily: 'var(--font-display)' }}
      >
        {zoneName(t, zone)}
      </text>
    </g>
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
