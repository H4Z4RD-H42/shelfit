import { useLayout } from '../hooks/useLayout'
import { useT } from '../i18n'

export function StatsBar() {
  const t = useT()
  const { stats, unplaced } = useLayout()
  const placedRatio = stats.totalGames ? stats.placedGames / stats.totalGames : 0

  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-ink-soft">
      <span className="flex items-center gap-2">
        <span className="relative h-1.5 w-20 overflow-hidden rounded-full bg-surface-3">
          <span className="absolute inset-y-0 left-0 rounded-full bg-accent" style={{ width: `${placedRatio * 100}%` }} />
        </span>
        {t('stats.placed', { placed: stats.placedGames, total: stats.totalGames })}
      </span>
      <span>{t('stats.cubes', { used: stats.usedCubes, total: stats.totalCubes })}</span>
      <span title={t('stats.fillHint')} className="cursor-help underline decoration-dotted underline-offset-2">
        {t('stats.fill', { fill: Math.round(stats.volumeFill * 100) })}
      </span>
      {unplaced.length > 0 && <span className="font-medium text-danger">{t('stats.unplaced', { count: unplaced.length })}</span>}
    </div>
  )
}
