import { RectangleHorizontal, RectangleVertical } from 'lucide-react'
import { useGamesById, useLayout } from '../../hooks/useLayout'
import { useBoxColor } from '../../hooks/useBoxColor'
import { useZonesById } from '../../hooks/useZones'
import { useT } from '../../i18n'
import { UNPLACED_LABEL, groupLabel, zoneName } from '../labels'
import { useAppStore } from '../../store/appStore'
import { cx } from '../styles'

export function ListView() {
  const t = useT()
  const units = useAppStore((s) => s.units)
  const cube = useAppStore((s) => s.cube)
  const selectedId = useAppStore((s) => s.selectedId)
  const select = useAppStore((s) => s.select)
  const layout = useLayout()
  const games = useGamesById()
  const boxColor = useBoxColor()
  const zonesById = useZonesById()
  const unitName = new Map(units.map((u) => [u.id, u.name]))
  const outer = useAppStore((s) => s.options.groupBy[0]?.key)
  const cubeGroups = (gameIds: string[]) =>
    outer ? [...new Set(gameIds.map((id) => groupLabel(t, outer, layout.groups[id])))] : []

  return (
    <div className="h-full overflow-y-auto p-4 sm:p-6">
      <div className="grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-3">
        {layout.tops.map((top) => (
          <article key={`top-${top.unitId}`} className="rounded-xl border border-accent/40 bg-surface-0 p-3">
            <header className="mb-2">
              <h3 className="font-display text-sm font-semibold">{t('list.top', { unit: unitName.get(top.unitId) ?? '' })}</h3>
            </header>
            <ul className="space-y-0.5">
              {[...top.placements]
                .sort((a, b) => a.order - b.order)
                .map((p) => {
                  const game = games.get(p.gameId)
                  if (!game) return null
                  return (
                    <li key={p.gameId}>
                      <button
                        type="button"
                        onClick={() => select(p.gameId)}
                        className={cx(
                          'flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm',
                          p.gameId === selectedId ? 'bg-accent/15' : 'hover:bg-surface-2',
                        )}
                      >
                        <span className="size-2.5 shrink-0 rounded-sm" style={{ background: boxColor(game) }} />
                        <span className="min-w-0 flex-1 truncate">{game.name}</span>
                      </button>
                    </li>
                  )
                })}
            </ul>
          </article>
        ))}
        {layout.cubes.map((c) => {
          const fill = Math.round((c.usedWidth / cube.width) * 100)
          const zone = c.zoneId ? zonesById.get(c.zoneId) : undefined
          return (
            <article
              key={c.index}
              className="rounded-xl border border-line bg-surface-0 p-3"
              style={zone && { borderColor: zone.color, boxShadow: `inset 3px 0 0 ${zone.color}` }}
            >
              <header className="mb-2 flex items-baseline justify-between gap-2">
                <h3 className="font-display text-sm font-semibold">{t('list.cube', { n: c.index + 1 })}</h3>
                <span className="truncate text-xs text-ink-faint">
                  {unitName.get(c.unitId)} · {t('list.position', { row: c.row + 1, column: c.column + 1 })}
                </span>
              </header>
              {zone && (
                <p className="mb-1.5 flex items-center gap-1.5 truncate text-xs font-medium">
                  <span className="size-2 shrink-0 rounded-full" style={{ background: zone.color }} />
                  {zoneName(t, zone)}
                </p>
              )}
              {cubeGroups(c.placements.map((p) => p.gameId)).length > 0 && (
                <p className="mb-1.5 truncate text-xs font-medium text-accent">
                  {cubeGroups(c.placements.map((p) => p.gameId)).join(' · ')}
                </p>
              )}
              <div className="mb-2 h-1 overflow-hidden rounded-full bg-surface-2">
                <div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, fill)}%` }} />
              </div>
              {c.placements.length === 0 ? (
                <p className="text-xs text-ink-faint italic">{t('list.empty')}</p>
              ) : (
                <ul className="space-y-0.5">
                  {[...c.placements]
                    .sort((a, b) => a.order - b.order)
                    .map((p) => {
                      const game = games.get(p.gameId)
                      if (!game) return null
                      const Icon = p.orientation === 'vertical' ? RectangleVertical : RectangleHorizontal
                      return (
                        <li key={p.gameId}>
                          <button
                            type="button"
                            onClick={() => select(p.gameId)}
                            className={cx(
                              'flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left text-sm',
                              p.gameId === selectedId ? 'bg-accent/15' : 'hover:bg-surface-2',
                            )}
                          >
                            <span className="size-2.5 shrink-0 rounded-sm" style={{ background: boxColor(game) }} />
                            <span className="min-w-0 flex-1 truncate">{game.name}</span>
                            <Icon className="size-3.5 shrink-0 text-ink-faint" aria-label={t(`orientation.${p.orientation}`)} />
                          </button>
                        </li>
                      )
                    })}
                </ul>
              )}
            </article>
          )
        })}
      </div>

      {layout.unplaced.length > 0 && (
        <section className="mt-6">
          <h3 className="mb-2 font-display text-sm font-semibold text-danger">{t('list.unplaced')}</h3>
          <ul className="flex flex-wrap gap-2">
            {layout.unplaced.map((u) => (
              <li key={u.gameId} className="rounded-full border border-danger/30 bg-danger/10 px-3 py-1 text-xs">
                {games.get(u.gameId)?.name} · {t(UNPLACED_LABEL[u.reason])}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
