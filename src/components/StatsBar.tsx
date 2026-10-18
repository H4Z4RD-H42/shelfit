import { Scale } from 'lucide-react'
import { useLayout, useRoom } from '../hooks/useLayout'
import { useT } from '../i18n'
import { useAppStore } from '../store/appStore'
import { ruleName } from './labels'

export function StatsBar() {
  const t = useT()
  const layout = useLayout()
  const options = useAppStore((s) => s.options)
  const focusOptions = useAppStore((s) => s.focusOptions)
  const room = useRoom()
  const { stats, unplaced, relaxed } = layout
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
      {room && (
        <span
          title={t('stats.roomHint', { empty: room.emptyCubes, fill: Math.round(stats.volumeFill * 100) })}
          className="cursor-help underline decoration-dotted underline-offset-2"
        >
          {t('stats.room', { count: room.boxes })}
        </span>
      )}
      {unplaced.length > 0 && <span className="font-medium text-danger">{t('stats.unplaced', { count: unplaced.length })}</span>}
      {relaxed.length > 0 && (
        <button
          type="button"
          onClick={() => focusOptions('priorities')}
          title={t('stats.relaxedHint', { rules: relaxed.map((r) => ruleName(t, r, options)).join(', ') })}
          className="flex items-center gap-1.5 rounded-full bg-warn/15 px-2 py-0.5 font-medium text-warn hover:bg-warn/25"
        >
          <Scale className="size-3.5" />
          {t(relaxed.length === 1 ? 'stats.relaxed.one' : 'stats.relaxed.other', { count: relaxed.length })}
        </button>
      )}
    </div>
  )
}
