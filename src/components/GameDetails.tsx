import { Pencil, X } from 'lucide-react'
import { gameColor } from '../domain/color'
import type { GameOrientation } from '../domain/types'
import { useGamesById, useLayout } from '../hooks/useLayout'
import { useT } from '../i18n'
import { useAppStore } from '../store/appStore'
import { Button, Segmented } from './ui'

/** Floating card describing the selected game and where it ended up. */
export function GameDetails() {
  const t = useT()
  const selectedId = useAppStore((s) => s.selectedId)
  const units = useAppStore((s) => s.units)
  const { select, edit, updateGame } = useAppStore.getState()
  const games = useGamesById()
  const layout = useLayout()
  const game = selectedId ? games.get(selectedId) : undefined
  if (!game) return null

  const cube = layout.cubes.find((c) => c.placements.some((p) => p.gameId === game.id))
  const placement = cube?.placements.find((p) => p.gameId === game.id)
  const unplaced = layout.unplaced.find((u) => u.gameId === game.id)
  const unit = cube && units.find((u) => u.id === cube.unitId)
  const saga = layout.sagas[game.id]

  return (
    <div className="absolute right-3 bottom-3 left-3 z-10 rounded-2xl border border-line bg-surface-0/95 p-4 shadow-2xl backdrop-blur sm:left-auto sm:w-80">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 h-10 w-3 shrink-0 rounded" style={{ background: gameColor(game) }} />
        <div className="min-w-0 flex-1">
          <h3 className="font-display leading-tight font-semibold">{game.name}</h3>
          <p className="text-xs text-ink-soft">{[saga, game.year].filter(Boolean).join(' · ')}</p>
        </div>
        <Button variant="ghost" className="-mt-1 -mr-2 px-2 py-1" onClick={() => select(null)} aria-label="Close">
          <X className="size-4" />
        </Button>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
        <dt className="text-ink-faint">{t('game.dims')}</dt>
        <dd className="text-right tabular-nums">
          {game.dims.width} × {game.dims.height} × {game.dims.depth}
        </dd>
        {cube && unit && placement && (
          <>
            <dt className="text-ink-faint">{t('list.cube', { n: cube.index + 1 })}</dt>
            <dd className="truncate text-right">
              {unit.name} · {t('list.position', { row: cube.row + 1, column: cube.column + 1 })}
            </dd>
            <dt className="text-ink-faint">{t('game.orientation')}</dt>
            <dd className="text-right">{t(`orientation.${placement.orientation}`)}</dd>
          </>
        )}
        {unplaced && (
          <dd className="col-span-2 font-medium text-danger">
            {t(unplaced.reason === 'too-big' ? 'game.tooBig' : 'game.noSpace')}
          </dd>
        )}
      </dl>
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1">
          <Segmented<GameOrientation>
            size="sm"
            value={game.orientation}
            onChange={(orientation) => updateGame(game.id, { orientation })}
            options={(['inherit', 'vertical', 'horizontal'] as const).map((o) => ({ value: o, label: t(`orientation.${o}`) }))}
          />
        </div>
        <Button className="px-2 py-1.5" onClick={() => edit(game.id)} aria-label={t('game.edit')} title={t('game.edit')}>
          <Pencil className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
