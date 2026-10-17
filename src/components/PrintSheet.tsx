import { useState } from 'react'
import { createPortal } from 'react-dom'
import { APP_NAME } from '../config'
import { placementSteps } from '../domain/instructions'
import { cubeKey, isBlocked } from '../domain/kallax'
import type { CubeLayout, Placement, ShelfUnit } from '../domain/types'
import { useGamesById, useLayout } from '../hooks/useLayout'
import { useT } from '../i18n'
import { useAppStore } from '../store/appStore'
import { UNPLACED_LABEL, groupLabel, zoneName } from './labels'
import { useZonesById } from '../hooks/useZones'

/** Grid of a unit with the number of every cube, to find "cube 7" quickly. */
function UnitMap({ unit, numbers }: { unit: ShelfUnit; numbers: Map<string, number> }) {
  const cell = 12
  return (
    <svg className="unit-map" viewBox={`0 0 ${unit.columns * cell + 2} ${unit.rows * cell + 2}`} width={unit.columns * 34}>
      {Array.from({ length: unit.columns * unit.rows }, (_, k) => {
        const column = k % unit.columns
        const row = Math.floor(k / unit.columns)
        const x = 1 + column * cell
        const y = 1 + row * cell
        const blocked = isBlocked(unit, column, row)
        const n = numbers.get(cubeKey(column, row))
        return (
          <g key={k}>
            <rect x={x} y={y} width={cell} height={cell} fill={blocked ? '#ddd' : '#fff'} stroke="#000" strokeWidth={0.4} />
            {blocked ? (
              <path d={`M${x} ${y}L${x + cell} ${y + cell}M${x + cell} ${y}L${x} ${y + cell}`} stroke="#888" strokeWidth={0.4} />
            ) : (
              <text
                x={x + cell / 2}
                y={y + cell / 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={5}
                fontWeight={700}
              >
                {n}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

function Steps({ placements }: { placements: Placement[] }) {
  const t = useT()
  const games = useGamesById()
  const name = (id: string) => games.get(id)?.name ?? '?'
  const steps = placementSteps(placements)
  if (steps.length === 0) return <p className="empty">{t('list.empty')}</p>
  return (
    <ol className="steps">
      {steps.map((step, i) =>
        step.gameIds.length === 1 ? (
          <li key={i}>
            <span className="box" /> {name(step.gameIds[0]!)}{' '}
            <span className="how">{t(step.kind === 'standing' ? 'print.standing' : 'print.flat')}</span>
          </li>
        ) : (
          <li key={i}>
            <span className="how">{t('print.stack')}</span>
            <ul>
              {step.gameIds.map((id) => (
                <li key={id}>
                  <span className="box" /> {name(id)}
                </li>
              ))}
            </ul>
          </li>
        ),
      )}
    </ol>
  )
}

/**
 * Printable, step-by-step instructions to rebuild the shelves by hand. It is
 * always mounted but only visible when printing (see index.css).
 */
export function PrintSheet() {
  const t = useT()
  const units = useAppStore((s) => s.units)
  const allGames = useAppStore((s) => s.games)
  const outer = useAppStore((s) => s.options.groupBy[0]?.key)
  const layout = useLayout()
  const games = useGamesById()
  const zonesById = useZonesById()
  const excluded = allGames.filter((g) => g.excluded)
  const [today] = useState(() => new Date().toLocaleDateString())

  const cubesOf = (unitId: string) => layout.cubes.filter((c) => c.unitId === unitId)
  const groupsOf = (c: CubeLayout) => {
    const zone = c.zoneId ? zonesById.get(c.zoneId) : undefined
    const groups = outer ? [...new Set(c.placements.map((p) => groupLabel(t, outer, layout.groups[p.gameId])))] : []
    return [zone && zoneName(t, zone), ...groups].filter(Boolean).join(' · ')
  }

  return createPortal(
    <div className="print-sheet" lang={document.documentElement.lang}>
      <header>
        <h1>
          {APP_NAME} — {t('print.title')}
        </h1>
        <p>
          {today} · {t('stats.placed', { placed: layout.stats.placedGames, total: layout.stats.totalGames })} ·{' '}
          {t('stats.cubes', { used: layout.stats.usedCubes, total: layout.stats.totalCubes })}
        </p>
        <p className="how">{t('print.howTo')}</p>
      </header>

      {units.map((unit, ui) => {
        const cubes = cubesOf(unit.id)
        const numbers = new Map(cubes.map((c) => [cubeKey(c.column, c.row), c.index + 1]))
        const top = layout.tops.find((tp) => tp.unitId === unit.id)
        return (
          <section key={unit.id} className="unit">
            <div className="unit-head">
              <div>
                <h2>{t('print.unit', { n: ui + 1, name: unit.name })}</h2>
                <p className="how">
                  {unit.columns} × {unit.rows} · {t('print.mapHint')}
                </p>
              </div>
              <UnitMap unit={unit} numbers={numbers} />
            </div>
            <div className="cubes">
              {top && (
                <article className="cube">
                  <h3>{t('list.top', { unit: unit.name })}</h3>
                  <Steps placements={top.placements} />
                </article>
              )}
              {cubes.map((c) => (
                <article key={c.index} className="cube">
                  <h3>
                    {t('list.cube', { n: c.index + 1 })}{' '}
                    <span className="how">{t('list.position', { row: c.row + 1, column: c.column + 1 })}</span>
                  </h3>
                  {groupsOf(c) && <p className="group">{groupsOf(c)}</p>}
                  <Steps placements={c.placements} />
                </article>
              ))}
            </div>
          </section>
        )
      })}

      {(layout.unplaced.length > 0 || excluded.length > 0) && (
        <section className="unit">
          <h2>{t('print.elsewhere')}</h2>
          <ul className="steps">
            {layout.unplaced.map((u) => (
              <li key={u.gameId}>
                <span className="box" /> {games.get(u.gameId)?.name} <span className="how">{t(UNPLACED_LABEL[u.reason])}</span>
              </li>
            ))}
            {excluded.map((g) => (
              <li key={g.id}>
                <span className="box" /> {g.name} <span className="how">{t('game.excludedShort')}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>,
    document.body,
  )
}
