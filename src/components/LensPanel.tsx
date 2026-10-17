import { ChevronDown, Layers, RotateCcw, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  FLAG_KEYS,
  HEAT_KEYS,
  HEAT_RAMP,
  NO_DATA_COLOR,
  OTHER_COLOR,
  PLAYER_COUNTS,
  RANGE_KEYS,
  RANGE_STEP,
  VALUE_KEYS,
  activeFilters,
  boundsOf,
  hasFlag,
  isValueHeat,
  valueCounts,
  type FlagKey,
  type HeatKey,
  type HeatScale,
  type Lens,
  type NumberHeatKey,
  type Range,
  type RangeKey,
  type ValueCount,
  type ValueKey,
} from '../domain/lens'
import type { Game } from '../domain/types'
import { useLensPaint } from '../hooks/useLens'
import { useT } from '../i18n'
import { useAppStore } from '../store/appStore'
import { cx, inputClass } from './styles'
import { Button, InfoButton, RangeSlider, Reveal, Section, Segmented } from './ui'

/** Values of a list shown before "show all". */
const SHORT_LIST = 8

const DECIMALS: Record<NumberHeatKey, number> = {
  year: 0,
  complexity: 1,
  playTime: 0,
  rating: 1,
  plays: 0,
  weightKg: 1,
  maxPlayers: 0,
  volume: 1,
}
const UNIT: Partial<Record<NumberHeatKey, string>> = { playTime: ' min', weightKg: ' kg', volume: ' L' }

function useFormat() {
  const language = useAppStore((s) => s.language)
  return (key: NumberHeatKey, v: number) =>
    // Years read better without the thousands separator.
    (key === 'year'
      ? String(Math.round(v))
      : v.toLocaleString(language, { maximumFractionDigits: DECIMALS[key], minimumFractionDigits: 0 })) + (UNIT[key] ?? '')
}

/** Rounds a value to the step grid, without float noise. */
function snap(v: number, step: number, round: (x: number) => number): number {
  const decimals = Math.max(0, -Math.floor(Math.log10(step)))
  return Number((round(v / step) * step).toFixed(decimals))
}

/** Lights up the lens panel; shows how many filters and maps are on. */
export function LensButton() {
  const t = useT()
  const lens = useAppStore((s) => s.lens)
  const open = useAppStore((s) => s.lensOpen)
  const setOpen = useAppStore((s) => s.setLensOpen)
  const count = activeFilters(lens) + (lens.heat ? 1 : 0)
  if (open) return null
  return (
    <Button
      variant="subtle"
      onClick={() => setOpen(true)}
      title={t('lens.button')}
      className={cx(
        'absolute top-3 right-3 z-10 bg-surface-0/90 shadow-lg backdrop-blur',
        count > 0 && 'border-accent text-accent',
      )}
    >
      <Layers className="size-4" />
      <span className="hidden sm:inline">{t('lens.button')}</span>
      {count > 0 && (
        <span className="flex size-5 items-center justify-center rounded-full bg-accent text-[11px] font-bold text-accent-ink">
          {count}
        </span>
      )}
    </Button>
  )
}

/**
 * Data views of the shelves: a map paints the boxes by some data, filters fade
 * out the games that do not match. Floats over the shelves on wide screens; on
 * phones it is docked under them (`docked`), so the shelves shrink but stay
 * whole in sight, and folds down to a one-line legend.
 */
export function LensPanel({ docked = false }: { docked?: boolean }) {
  const t = useT()
  const open = useAppStore((s) => s.lensOpen)
  const lens = useAppStore((s) => s.lens)
  const allGames = useAppStore((s) => s.games)
  const { setLens, clearLens, setLensOpen } = useAppStore.getState()
  const games = useMemo(() => allGames.filter((g) => !g.excluded), [allGames])
  const paint = useLensPaint()
  const data = useCollectionData(games)
  const [showMapInfo, setShowMapInfo] = useState(false)
  const [showFilterInfo, setShowFilterInfo] = useState(false)
  const [folded, setFolded] = useState(false)
  if (!open) return null

  const filters = activeFilters(lens)
  const heatKeys = HEAT_KEYS.filter((k) => (isValueHeat(k) ? data.values[k].length > 0 : data.bounds[k]))
  const hasAny = heatKeys.length > 0 || data.players || VALUE_KEYS.some((k) => data.values[k].length > 0) || data.flags.length > 0

  return (
    <aside
      className={cx(
        'flex flex-col bg-surface-0',
        docked
          ? 'max-h-[50%] flex-none border-t border-line'
          : 'absolute top-3 right-3 bottom-3 z-20 w-80 rounded-2xl border border-line bg-surface-0/95 shadow-2xl backdrop-blur',
      )}
      aria-label={t('lens.title')}
    >
      <header className={cx('flex items-center gap-2 py-2.5 pr-2 pl-5', !(docked && folded) && 'border-b border-line')}>
        <Layers className="size-4 shrink-0 text-accent" />
        {docked ? (
          <button
            type="button"
            onClick={() => setFolded((v) => !v)}
            aria-expanded={!folded}
            title={t(folded ? 'lens.unfold' : 'lens.fold')}
            className="flex min-w-0 flex-1 items-center gap-1.5 text-left"
          >
            <h2 className="font-display text-sm font-semibold">{t('lens.title')}</h2>
            <ChevronDown className={cx('size-4 text-ink-faint transition-transform', !folded && 'rotate-180')} />
          </button>
        ) : (
          <h2 className="flex-1 font-display text-sm font-semibold">{t('lens.title')}</h2>
        )}
        {(filters > 0 || lens.heat) && (
          <Button variant="ghost" className="px-2 py-1 text-xs" onClick={clearLens}>
            <RotateCcw className="size-3.5" />
            {t('lens.clear')}
          </Button>
        )}
        <Button variant="ghost" className="px-2 py-1" onClick={() => setLensOpen(false)} aria-label={t('lens.close')}>
          <X className="size-4" />
        </Button>
      </header>

      {docked && folded && <FoldedLegend scale={paint.scale} matches={paint.matches?.size} total={games.length} />}

      <div className={cx('min-h-0 flex-1 overflow-y-auto', docked && folded && 'hidden')}>
        {!hasAny && <p className="px-5 py-4 text-sm text-ink-soft">{t('lens.empty')}</p>}

        {heatKeys.length > 0 && (
          <Section
            title={
              <span className="flex items-center gap-1">
                {t('lens.map')}
                <InfoButton open={showMapInfo} onClick={() => setShowMapInfo((v) => !v)} />
              </span>
            }
          >
            <Reveal open={showMapInfo}>
              <p className="text-xs text-ink-soft">{t('lens.mapHint')}</p>
            </Reveal>
            <select
              className={inputClass}
              value={lens.heat ?? ''}
              onChange={(e) => setLens((l) => ({ ...l, heat: (e.target.value || undefined) as HeatKey | undefined }))}
            >
              <option value="">{t('lens.map.none')}</option>
              {heatKeys.map((k) => (
                <option key={k} value={k}>
                  {t(`lens.key.${k}`)}
                </option>
              ))}
            </select>
            {paint.scale && <Legend scale={paint.scale} />}
          </Section>
        )}

        {hasAny && (
          <Section
            title={
              <span className="flex items-center gap-1">
                {t('lens.filters')}
                <InfoButton open={showFilterInfo} onClick={() => setShowFilterInfo((v) => !v)} />
              </span>
            }
            action={
              paint.matches && (
                <span className="text-xs font-medium text-accent tabular-nums">
                  {t('lens.matches', { count: paint.matches.size, total: games.length })}
                </span>
              )
            }
          >
            <Reveal open={showFilterInfo}>
              <p className="text-xs text-ink-soft">{t('lens.filtersHint')}</p>
            </Reveal>

            {data.players && <PlayersFilter lens={lens} setLens={setLens} />}

            {RANGE_KEYS.map((k) => {
              const bounds = data.bounds[k]
              return bounds && bounds[1] > bounds[0] ? (
                <RangeFilter key={k} rangeKey={k} bounds={bounds} lens={lens} setLens={setLens} />
              ) : null
            })}

            {data.flags.map((k) => (
              <FlagFilter key={k} flagKey={k} lens={lens} setLens={setLens} />
            ))}

            <div className="-mx-5">
              {VALUE_KEYS.map((k) =>
                data.values[k].length > 0 ? (
                  <ValueFilter key={k} valueKey={k} counts={data.values[k]} lens={lens} setLens={setLens} />
                ) : null,
              )}
            </div>
          </Section>
        )}
      </div>
    </aside>
  )
}

/** What the collection has to filter and paint by. */
function useCollectionData(games: Game[]) {
  return useMemo(() => {
    const numberKeys: NumberHeatKey[] = [...RANGE_KEYS, 'maxPlayers', 'volume']
    return {
      bounds: Object.fromEntries(numberKeys.map((k) => [k, boundsOf(games, k)])) as Record<NumberHeatKey, Range | undefined>,
      values: Object.fromEntries(VALUE_KEYS.map((k) => [k, valueCounts(games, k)])) as Record<ValueKey, ValueCount[]>,
      flags: FLAG_KEYS.filter((k) => hasFlag(games, k)),
      players: games.some((g) => g.maxPlayers),
    }
  }, [games])
}

type SetLens = (update: (lens: Lens) => Lens) => void

function FilterLabel({ label, active, onReset }: { label: string; active: boolean; onReset: () => void }) {
  const t = useT()
  return (
    <div className="flex h-5 items-center gap-1">
      <span className={cx('text-xs font-semibold tracking-wide uppercase', active ? 'text-accent' : 'text-ink-soft')}>
        {label}
      </span>
      {active && (
        <button
          type="button"
          onClick={onReset}
          title={t('lens.reset')}
          aria-label={t('lens.reset')}
          className="flex size-5 items-center justify-center rounded text-ink-faint hover:bg-surface-2 hover:text-ink"
        >
          <X className="size-3" />
        </button>
      )}
    </div>
  )
}

function PlayersFilter({ lens, setLens }: { lens: Lens; setLens: SetLens }) {
  const t = useT()
  const toggle = (n: number) =>
    setLens((l) => ({
      ...l,
      players: l.players.includes(n) ? l.players.filter((p) => p !== n) : [...l.players, n].sort((a, b) => a - b),
    }))
  const last = PLAYER_COUNTS[PLAYER_COUNTS.length - 1]
  return (
    <div className="space-y-1.5" title={t('lens.playersHint')}>
      <FilterLabel
        label={t('lens.players')}
        active={lens.players.length > 0}
        onReset={() => setLens((l) => ({ ...l, players: [] }))}
      />
      <div className="flex gap-1">
        {PLAYER_COUNTS.map((n) => {
          const on = lens.players.includes(n)
          return (
            <button
              key={n}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(n)}
              className={cx(
                'h-8 flex-1 rounded-md border text-sm font-medium tabular-nums transition-colors',
                on ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-surface-2 text-ink-soft hover:text-ink',
              )}
            >
              {n === last ? `${n}+` : n}
            </button>
          )
        })}
      </div>
    </div>
  )
}

function RangeFilter({ rangeKey, bounds, lens, setLens }: { rangeKey: RangeKey; bounds: Range; lens: Lens; setLens: SetLens }) {
  const t = useT()
  const format = useFormat()
  const step = RANGE_STEP[rangeKey]
  const min = snap(bounds[0], step, Math.floor)
  const max = snap(bounds[1], step, Math.ceil)
  const value = lens.ranges[rangeKey] ?? [min, max]
  const active = !!lens.ranges[rangeKey]
  const set = (next: Range | undefined) =>
    setLens((l) => {
      const { [rangeKey]: _, ...rest } = l.ranges
      // The whole span is no filter: it would only hide the games without the data.
      return { ...l, ranges: next && (next[0] > min || next[1] < max) ? { ...rest, [rangeKey]: next } : rest }
    })
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between gap-2">
        <FilterLabel label={t(`lens.key.${rangeKey}`)} active={active} onReset={() => set(undefined)} />
        <span className={cx('text-xs tabular-nums', active ? 'font-medium text-ink' : 'text-ink-faint')}>
          {format(rangeKey, value[0])} – {format(rangeKey, value[1])}
        </span>
      </div>
      <RangeSlider min={min} max={max} step={step} value={value} onChange={set} label={t(`lens.key.${rangeKey}`)} />
    </div>
  )
}

function FlagFilter({ flagKey, lens, setLens }: { flagKey: FlagKey; lens: Lens; setLens: SetLens }) {
  const t = useT()
  const value = lens.flags[flagKey]
  const set = (v: 'any' | 'yes' | 'no') =>
    setLens((l) => {
      const { [flagKey]: _, ...rest } = l.flags
      return { ...l, flags: v === 'any' ? rest : { ...rest, [flagKey]: v === 'yes' } }
    })
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={cx('text-sm', value !== undefined && 'font-medium text-accent')}>{t(`lens.key.${flagKey}`)}</span>
      <div className="w-40 shrink-0">
        <Segmented
          size="sm"
          value={value === undefined ? 'any' : value ? 'yes' : 'no'}
          onChange={set}
          options={[
            { value: 'any', label: t('lens.any') },
            { value: 'yes', label: t('lens.yes') },
            { value: 'no', label: t('lens.no') },
          ]}
        />
      </div>
    </div>
  )
}

function ValueFilter({
  valueKey,
  counts,
  lens,
  setLens,
}: {
  valueKey: ValueKey
  counts: ValueCount[]
  lens: Lens
  setLens: SetLens
}) {
  const t = useT()
  const chosen = lens.values[valueKey] ?? []
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [all, setAll] = useState(false)
  const q = query.trim().toLowerCase()
  const matching = q ? counts.filter((c) => c.value.toLowerCase().includes(q)) : counts
  // Chosen values stay in sight even beyond the short list.
  const shown = all || q ? matching : matching.filter((c, i) => i < SHORT_LIST || chosen.includes(c.value))
  const toggle = (value: string) =>
    setLens((l) => {
      const current = l.values[valueKey] ?? []
      const next = current.includes(value) ? current.filter((v) => v !== value) : [...current, value]
      const { [valueKey]: _, ...rest } = l.values
      return { ...l, values: next.length ? { ...rest, [valueKey]: next } : rest }
    })

  return (
    <div className="border-t border-line first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-5 py-2.5 text-left hover:bg-surface-1"
      >
        <span className={cx('flex-1 text-sm', chosen.length > 0 && 'font-medium text-accent')}>{t(`lens.key.${valueKey}`)}</span>
        <span className="max-w-[9rem] truncate text-xs text-ink-faint">
          {chosen.length === 0 ? t('lens.any') : chosen.length === 1 ? chosen[0] : t('lens.chosen', { count: chosen.length })}
        </span>
        <ChevronDown className={cx('size-4 shrink-0 text-ink-faint transition-transform', open && 'rotate-180')} />
      </button>
      <Reveal open={open}>
        <div className="space-y-2 px-5 pb-3">
          {counts.length > SHORT_LIST && (
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-ink-faint" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('lens.search')}
                className={cx(inputClass, 'py-1.5 pl-8 text-xs')}
              />
            </div>
          )}
          <ul className="space-y-0.5">
            {shown.map((c) => (
              <li key={c.value}>
                <label className="flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1 text-sm hover:bg-surface-2">
                  <input
                    type="checkbox"
                    checked={chosen.includes(c.value)}
                    onChange={() => toggle(c.value)}
                    className="size-3.5 accent-[var(--accent)]"
                  />
                  <span className="min-w-0 flex-1 truncate">{c.value}</span>
                  <span className="text-xs text-ink-faint tabular-nums">{c.count}</span>
                </label>
              </li>
            ))}
          </ul>
          {!all && !q && matching.length > shown.length && (
            <button type="button" onClick={() => setAll(true)} className="text-xs font-medium text-accent hover:underline">
              {t('lens.showAll', { count: matching.length })}
            </button>
          )}
        </div>
      </Reveal>
    </div>
  )
}

/** The map and the filter count in one line, for the folded panel. */
function FoldedLegend({ scale, matches, total }: { scale: HeatScale | null; matches?: number; total: number }) {
  const format = useFormat()
  if (!scale && matches === undefined) return null
  return (
    <div className="flex items-center gap-2.5 px-5 pb-2.5 text-xs text-ink-soft tabular-nums">
      {scale?.kind === 'number' && (
        <>
          <span>{format(scale.key, scale.min)}</span>
          <div
            className="h-2 min-w-8 flex-1 rounded-full"
            style={{ background: `linear-gradient(to right, ${HEAT_RAMP.join(', ')})` }}
          />
          <span>{format(scale.key, scale.max)}</span>
        </>
      )}
      {scale?.kind === 'value' && (
        <div className="flex min-w-0 flex-1 gap-2.5 overflow-hidden">
          {scale.entries.slice(0, 4).map((e) => (
            <span key={e.value} className="flex min-w-0 items-center gap-1">
              <Swatch color={e.color} />
              <span className="truncate">{e.value}</span>
            </span>
          ))}
        </div>
      )}
      {!scale && <span className="flex-1" />}
      {matches !== undefined && (
        <span className="shrink-0 font-medium text-accent">
          {matches}/{total}
        </span>
      )}
    </div>
  )
}

function Swatch({ color }: { color: string }) {
  return <span className="size-3 shrink-0 rounded-sm border border-black/20" style={{ background: color }} />
}

/** Key of the map: the colour ramp with its ends, or the colour of each value. */
function Legend({ scale }: { scale: HeatScale }) {
  const t = useT()
  const format = useFormat()
  const missing =
    scale.missing > 0 ? (
      <li className="flex items-center gap-2 text-xs text-ink-soft">
        <Swatch color={NO_DATA_COLOR} />
        <span className="flex-1">{t('lens.noData')}</span>
        <span className="tabular-nums">{scale.missing}</span>
      </li>
    ) : null

  if (scale.kind === 'number') {
    const mid = scale.log ? Math.expm1((Math.log1p(scale.min) + Math.log1p(scale.max)) / 2) : (scale.min + scale.max) / 2
    return (
      <div className="space-y-2">
        <div className="h-3 rounded-full" style={{ background: `linear-gradient(to right, ${HEAT_RAMP.join(', ')})` }} />
        <div className="flex justify-between text-xs text-ink-soft tabular-nums">
          <span>{format(scale.key, scale.min)}</span>
          {scale.max > scale.min && <span>{format(scale.key, mid)}</span>}
          <span>{format(scale.key, scale.max)}</span>
        </div>
        {missing && <ul>{missing}</ul>}
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <ul className="space-y-1">
        {scale.entries.map((e) => (
          <li key={e.value} className="flex items-center gap-2 text-xs">
            <Swatch color={e.color} />
            <span className="min-w-0 flex-1 truncate">{e.value}</span>
            <span className="text-ink-soft tabular-nums">{e.count}</span>
          </li>
        ))}
        {scale.others > 0 && (
          <li className="flex items-center gap-2 text-xs text-ink-soft">
            <Swatch color={OTHER_COLOR} />
            <span className="flex-1">{t('lens.others')}</span>
            <span className="tabular-nums">{scale.others}</span>
          </li>
        )}
        {missing}
      </ul>
      <p className="text-xs text-ink-faint">{t('lens.mapFirst')}</p>
    </div>
  )
}
