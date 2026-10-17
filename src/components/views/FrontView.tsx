import { useMemo } from 'react'
import { contrastText } from '../../domain/color'
import { LINE_HEIGHT } from '../../domain/label'
import { cellAt, unitGeometry, unitOffsets } from '../../domain/geometry'
import { isBlocked } from '../../domain/kallax'
import type { Placement, Zone } from '../../domain/types'
import { cubeId, zoneRuns, type ZoneRun } from '../../domain/zones'
import { useBoxColor } from '../../hooks/useBoxColor'
import { useGamesById, useLayout } from '../../hooks/useLayout'
import { useDimmed } from '../../hooks/useLens'
import { useZonesById } from '../../hooks/useZones'
import { useAppStore } from '../../store/appStore'
import { fitBoxLabel, LABEL_WEIGHT } from '../boxLabel'
import { zoneName } from '../labels'
import { useT } from '../../i18n'

const PAD = 6

/** Flat, printable elevation of the shelves seen from the front. */
export function FrontView() {
  const units = useAppStore((s) => s.units)
  const selectedId = useAppStore((s) => s.selectedId)
  const select = useAppStore((s) => s.select)
  const layout = useLayout()
  const games = useGamesById()
  const boxColor = useBoxColor()
  const dimmed = useDimmed()
  const zonesById = useZonesById()
  const cubeZone = new Map(layout.cubes.flatMap((c) => (c.zoneId ? [[cubeId(c), zonesById.get(c.zoneId)] as const] : [])))
  const runs = zoneRuns(layout.cubes, units)

  const offsets = useMemo(() => unitOffsets(units), [units])
  const sizes = units.map(unitGeometry)
  const width = offsets.length ? offsets[offsets.length - 1]! + sizes[sizes.length - 1]!.width : 0
  const topHeight = (unitId: string) =>
    Math.max(0, ...(layout.tops.find((t) => t.unitId === unitId)?.placements.map((p) => p.y + p.sy) ?? []))
  const shelfHeight = Math.max(...sizes.map((s) => s.height))
  // Room above the tallest unit for the boxes stored on top.
  const height = Math.max(...units.map((u, i) => sizes[i]!.top.y + topHeight(u.id)), shelfHeight)

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
              <polygon
                points={size.outline.map((p) => `${p.x},${size.height - p.y}`).join(' ')}
                fill={unit.color}
                stroke="rgba(0,0,0,.25)"
                strokeWidth={0.2}
                strokeLinejoin="round"
              />
              {size.cells.map(({ column, row, x, y: bottom, size: cube }) => {
                const key = `${column}:${row}`
                const y = size.height - bottom - cube.height
                if (isBlocked(unit, column, row))
                  return <DrawerInsert key={key} x={x} y={y} width={cube.width} height={cube.height} />
                const zone = cubeZone.get(cubeId({ unitId: unit.id, column, row }))
                return (
                  <g key={key}>
                    <rect x={x} y={y} width={cube.width} height={cube.height} fill="rgba(0,0,0,.28)" />
                    {zone && <rect x={x} y={y} width={cube.width} height={cube.height} fill={zone.color} opacity={0.3} />}
                  </g>
                )
              })}
              {runs.map((run) => {
                const zone = zonesById.get(run.zoneId)
                if (run.unitId !== unit.id || !zone) return null
                return <ZoneLabel key={`${run.x}:${run.y}`} run={run} zone={zone} unitHeight={size.height} />
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
          const cell = cellAt(sizes[ui]!, c.column, c.row)
          if (!cell) return null
          const baseX = offsets[ui]! + cell.x
          const baseY = height - cell.y // SVG y of the cube floor
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
                dimmed={dimmed(p.gameId)}
                selected={p.gameId === selectedId}
                onSelect={() => select(p.gameId)}
              />
            )
          })
        })}

        {layout.tops.map((top) => {
          const ui = unitIndex.get(top.unitId)
          if (ui === undefined) return null
          const baseY = height - sizes[ui]!.top.y // SVG y of the top panel
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
                dimmed={dimmed(p.gameId)}
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
function ZoneLabel({ run, zone, unitHeight }: { run: ZoneRun; zone: Zone; unitHeight: number }) {
  const t = useT()
  const height = Math.min(run.below, 2)
  const { x, width } = run
  const y = unitHeight - run.y + (run.below - height) / 2
  return (
    <g style={{ pointerEvents: 'none' }}>
      <rect x={x} y={y} width={width} height={height} rx={0.2} fill={zone.color} />
      <text
        x={x + width / 2}
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
function DrawerInsert({ x, y, width, height }: { x: number; y: number; width: number; height: number }) {
  const h = height / 2
  const handle = Math.min(6, width / 3)
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill="rgba(0,0,0,.12)" />
      {[0, 1].map((i) => (
        <g key={i}>
          <rect
            x={x + 0.6}
            y={y + i * h + 0.6}
            width={width - 1.2}
            height={h - 1.2}
            rx={0.4}
            fill="rgba(255,255,255,.18)"
            stroke="rgba(0,0,0,.2)"
            strokeWidth={0.15}
          />
          <rect
            x={x + width / 2 - handle / 2}
            y={y + i * h + h / 2 - 0.4}
            width={handle}
            height={0.8}
            rx={0.4}
            fill="rgba(0,0,0,.35)"
          />
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
  dimmed,
  selected,
  onSelect,
}: {
  p: Placement
  x: number
  y: number
  name: string
  color: string
  /** Faded out by the filters of the lens. */
  dimmed: boolean
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
      opacity={dimmed && !selected ? 0.3 : 1}
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
        filter={dimmed ? undefined : 'url(#box-shadow)'}
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
