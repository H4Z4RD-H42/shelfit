import { Download, Layers, MapPin, Pencil, Plus, RulerDimensionLine, Search, Sparkles, Trash2, Upload } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { createBackup, parseBackup, parseCsv } from '../../domain/backup'
import { hasDims } from '../../domain/types'
import { sortTitle } from '../../domain/sorting'
import { useLayout } from '../../hooks/useLayout'
import { useIsDesktop } from '../../hooks/useMediaQuery'
import { useZonesById } from '../../hooks/useZones'
import { useBoxColor } from '../../hooks/useBoxColor'
import { useT } from '../../i18n'
import { useAppStore } from '../../store/appStore'
import { UNPLACED_LABEL, zoneName } from '../labels'
import { Button, Segmented } from '../ui'
import { cx, inputClass } from '../styles'
import { GameEditor } from './GameEditor'

type Filter = 'all' | 'missing' | 'unplaced'

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

function download(name: string, content: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

export function CollectionPanel() {
  const t = useT()
  const games = useAppStore((s) => s.games)
  const selectedId = useAppStore((s) => s.selectedId)
  const editing = useAppStore((s) => s.editing)
  const {
    addGame,
    updateGame,
    removeGame,
    importGames,
    loadSample,
    clearGames,
    select,
    restore,
    edit: setEditing,
    locate,
  } = useAppStore.getState()
  const layout = useLayout()
  const boxColor = useBoxColor()
  const zonesById = useZonesById()
  const isDesktop = useIsDesktop()
  const language = useAppStore((s) => s.language)
  const ignoreArticles = useAppStore((s) => s.options.ignoreArticles)
  const num = (n: number) => n.toLocaleString(language)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const unplaced = useMemo(() => new Map(layout.unplaced.map((u) => [u.gameId, u.reason])), [layout.unplaced])
  const suggestions = useMemo(() => {
    const collect = (key: 'genre' | 'designer' | 'publisher' | 'language') =>
      [...new Set(games.flatMap((g) => (g[key] ?? '').split(';').map((v) => v.trim())).filter(Boolean))].sort(collator.compare)
    return {
      genre: collect('genre'),
      designer: collect('designer'),
      publisher: collect('publisher'),
      language: collect('language'),
    }
  }, [games])
  const sagaNames = useMemo(() => [...new Set(Object.values(layout.sagas))].sort(collator.compare), [layout.sagas])
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (
      games
        .filter((g) => !q || g.name.toLowerCase().includes(q) || layout.sagas[g.id]?.toLowerCase().includes(q))
        .filter((g) => filter === 'all' || (filter === 'missing' ? !hasDims(g) : unplaced.has(g.id)))
        // Same filing as the shelves: with articles skipped, "Le Case della Follia" is listed under C.
        .sort((a, b) => collator.compare(sortTitle(a.name, ignoreArticles), sortTitle(b.name, ignoreArticles)))
    )
  }, [games, query, filter, layout.sagas, unplaced, ignoreArticles])
  const missingCount = useMemo(() => games.filter((g) => !hasDims(g)).length, [games])

  const importFile = async (file: File) => {
    try {
      const text = await file.text()
      if (file.name.toLowerCase().endsWith('.json')) {
        const backup = parseBackup(text)
        restore(backup)
        setMessage({ text: t('collection.imported', { count: backup.games.length }) })
      } else {
        const rows = parseCsv(text)
        const { added, updated, missing, keptManual } = importGames(rows)
        const kept = keptManual ? ' ' + t('collection.keptManual', { count: keptManual }) : ''
        setMessage({ text: t('collection.importedCsv', { added, updated, missing }) + kept })
      }
    } catch (err) {
      setMessage({ text: t('collection.importError', { error: (err as Error).message }), error: true })
    }
  }

  const exportBackup = () => {
    const { games, units, options, zones } = useAppStore.getState()
    const stamp = new Date().toISOString().slice(0, 10)
    download(
      `shelf-planner-${stamp}.json`,
      JSON.stringify(createBackup({ games, units, options, zones }), null, 2),
      'application/json',
    )
  }

  const editingGame = editing && editing !== 'new' ? games.find((g) => g.id === editing) : undefined

  return (
    <div className="flex h-full flex-col">
      <div className="space-y-3 border-b border-line px-5 py-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint" />
            <input
              className={cx(inputClass, 'pl-9')}
              placeholder={t('collection.search')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <Button
            variant="primary"
            onClick={() => setEditing('new')}
            aria-label={t('collection.add')}
            title={t('collection.add')}
          >
            <Plus className="size-4" />
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <span className="mr-auto text-ink-soft">{t('collection.count', { count: games.length })}</span>
          <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => fileInput.current?.click()}>
            <Upload className="size-3.5" /> {t('collection.import')}
          </Button>
          <Button variant="ghost" className="px-2 py-1 text-xs" onClick={exportBackup} disabled={games.length === 0}>
            <Download className="size-3.5" /> {t('collection.export')}
          </Button>
          <Button
            variant="ghost"
            className="px-2 py-1 text-xs"
            disabled={games.length === 0}
            title={t('collection.clear')}
            aria-label={t('collection.clear')}
            onClick={() => window.confirm(t('collection.clearConfirm', { count: games.length })) && clearGames()}
          >
            <Trash2 className="size-3.5" />
          </Button>
          <input
            ref={fileInput}
            type="file"
            accept=".json,.csv,text/csv,application/json"
            hidden
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void importFile(file)
              e.target.value = ''
            }}
          />
        </div>
        {message && (
          <p className={cx('text-xs', message.error ? 'text-danger' : 'text-ink-soft')} role="status">
            {message.text}
          </p>
        )}
      </div>

      {games.length > 0 && (
        <div className="border-b border-line px-5 py-2.5">
          <Segmented<Filter>
            size="sm"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: t('collection.filter.all') },
              { value: 'missing', label: `${t('collection.filter.missing')} (${missingCount})` },
              { value: 'unplaced', label: `${t('collection.filter.unplaced')} (${layout.unplaced.length})` },
            ]}
          />
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {editing && (
          <div className="mb-3">
            <GameEditor
              key={editing}
              initial={editingGame}
              sagas={sagaNames}
              detectedSaga={editingGame && layout.sagas[editingGame.id]}
              suggestions={suggestions}
              onCancel={() => setEditing(null)}
              onSave={(draft) => {
                if (editingGame) updateGame(editingGame.id, draft)
                else addGame(draft)
                setEditing(null)
              }}
              onDelete={
                editingGame
                  ? () => {
                      removeGame(editingGame.id)
                      setEditing(null)
                    }
                  : undefined
              }
            />
          </div>
        )}

        {games.length === 0 && !editing && (
          <div className="flex flex-col items-center gap-4 px-6 py-12 text-center">
            <p className="text-sm text-ink-soft">{t('collection.empty')}</p>
            <Button variant="primary" onClick={loadSample}>
              <Sparkles className="size-4" /> {t('collection.loadSample')}
            </Button>
            <p className="text-xs text-ink-faint">{t('collection.sampleNote')}</p>
          </div>
        )}

        <ul className="space-y-0.5">
          {visible.map((g) => {
            const reason = unplaced.get(g.id)
            const saga = layout.sagas[g.id]
            const zone = zonesById.get(layout.zones[g.id] ?? '')
            return (
              <li
                key={g.id}
                className={cx(
                  'group flex items-center rounded-lg pr-1 transition-colors',
                  g.id === selectedId ? 'bg-accent/15 ring-1 ring-accent/50' : 'hover:bg-surface-2',
                )}
              >
                <button
                  type="button"
                  onClick={() => select(g.id === selectedId ? null : g.id)}
                  onDoubleClick={() => setEditing(g.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 px-2 py-2 text-left"
                >
                  <span
                    className={cx('h-8 w-2.5 shrink-0 rounded-sm', g.excluded && 'opacity-30')}
                    style={{ background: boxColor(g) }}
                  />
                  <span className={cx('min-w-0 flex-1', g.excluded && 'opacity-50')}>
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">{g.name}</span>
                      {g.onTop && (
                        <span className="shrink-0 rounded bg-accent/15 px-1 text-[10px] font-semibold text-accent">
                          {t('game.onTopShort')}
                        </span>
                      )}
                      {g.expansion && (
                        <span className="shrink-0 rounded bg-surface-3 px-1 text-[10px] font-semibold text-ink-soft">
                          {t('game.expansionShort')}
                        </span>
                      )}
                    </span>
                    <span className="mt-1 flex min-w-0 items-center gap-1.5">
                      {g.dims ? (
                        <span
                          className="inline-flex shrink-0 items-center gap-1 rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] text-ink-soft tabular-nums"
                          title={t('game.dims')}
                        >
                          <RulerDimensionLine className="size-3.5 text-ink-faint" />
                          {[g.dims.width, g.dims.height, g.dims.depth].map(num).join(' × ')}
                        </span>
                      ) : (
                        <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-warn/15 px-1.5 py-0.5 text-[11px] font-medium text-warn">
                          <RulerDimensionLine className="size-3.5" />
                          {t('game.noSize')}
                        </span>
                      )}
                      {saga && (
                        <span
                          className="inline-flex min-w-0 items-center gap-1 rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] text-ink-soft"
                          title={t('game.saga')}
                        >
                          <Layers className="size-3 shrink-0 text-ink-faint" />
                          <span className="truncate">{saga}</span>
                        </span>
                      )}
                      {zone && (
                        <span
                          className="inline-flex min-w-0 items-center gap-1 rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] text-ink-soft"
                          title={t('game.zone')}
                        >
                          <span className="size-2 shrink-0 rounded-full" style={{ background: zone.color }} />
                          <span className="truncate">{zoneName(t, zone)}</span>
                        </span>
                      )}
                    </span>
                  </span>
                  {g.excluded ? (
                    <span className="shrink-0 rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-semibold text-ink-soft">
                      {t('game.excludedShort')}
                    </span>
                  ) : (
                    reason &&
                    reason !== 'no-size' && (
                      <span className="shrink-0 rounded-full bg-danger/15 px-2 py-0.5 text-[10px] font-semibold text-danger">
                        {t(UNPLACED_LABEL[reason])}
                      </span>
                    )
                  )}
                </button>
                {/* Always visible on touch screens, on hover with a mouse. */}
                <div className="flex shrink-0 items-center [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100 [@media(hover:hover)]:focus-within:opacity-100">
                  {!isDesktop && !reason && (
                    <button
                      type="button"
                      onClick={() => locate(g.id)}
                      aria-label={t('game.locate')}
                      title={t('game.locate')}
                      className="flex size-9 items-center justify-center rounded-md text-ink-faint hover:text-ink"
                    >
                      <MapPin className="size-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setEditing(g.id)}
                    aria-label={t('game.edit')}
                    title={t('game.edit')}
                    className="flex size-9 items-center justify-center rounded-md text-ink-faint hover:text-ink"
                  >
                    <Pencil className="size-4" />
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}
