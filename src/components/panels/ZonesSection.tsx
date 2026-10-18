import { ChevronDown, ChevronUp, Plus, Trash2, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { isBlocked } from '../../domain/kallax'
import type { Strategy, Zone, ZonePlace, ZoneRule } from '../../domain/types'
import { ZONE_PLACES, ZONE_RULES, cubeId, defaultStrategy } from '../../domain/zones'
import { useGamesById, useLayout } from '../../hooks/useLayout'
import { useT } from '../../i18n'
import { useAppStore } from '../../store/appStore'
import { cubePosition, zoneName } from '../labels'
import { UnitCells } from '../UnitCells'
import { cx, inputClass } from '../styles'
import { Button, InfoButton, Reveal, Rich, Segmented } from '../ui'

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

/** Grid of every unit to pick the cubes of a zone, like the blocked cubes. */
function CubePicker({ zone }: { zone: Zone }) {
  const t = useT()
  const units = useAppStore((s) => s.units)
  const zones = useAppStore((s) => s.zones)
  const { updateZone } = useAppStore.getState()
  const chosen = new Set(zone.cubes)
  // Cubes chosen by an earlier zone are taken; a later zone would lose them anyway.
  const takenBy = new Map<string, Zone>()
  for (const other of zones)
    if (other.id !== zone.id && other.place === 'cubes') for (const key of other.cubes ?? []) takenBy.set(key, other)

  const toggle = (key: string) =>
    updateZone(zone.id, { cubes: chosen.has(key) ? zone.cubes!.filter((c) => c !== key) : [...(zone.cubes ?? []), key] })

  return (
    <div className="flex flex-wrap gap-4">
      {units.map((unit) => (
        <div key={unit.id} className="space-y-1">
          {units.length > 1 && <p className="text-[11px] text-ink-faint">{unit.name}</p>}
          <UnitCells
            unit={unit}
            max={{ width: 160, height: 200 }}
            render={({ column, row }, style) => {
              const key = cubeId({ unitId: unit.id, column, row })
              const blocked = isBlocked(unit, column, row)
              const other = takenBy.get(key)
              const selected = chosen.has(key)
              return (
                <button
                  key={key}
                  type="button"
                  aria-pressed={selected}
                  disabled={blocked || !!other}
                  title={other ? zoneName(t, other) : cubePosition(t, unit, column, row)}
                  onClick={() => toggle(key)}
                  className={cx(
                    'flex items-center justify-center rounded-md border transition-colors',
                    blocked && 'border-line bg-surface-3 text-ink-faint',
                    !blocked && !selected && !other && 'border-line bg-surface-2 hover:border-ink-faint',
                  )}
                  style={{
                    ...style,
                    ...(selected
                      ? { background: zone.color, borderColor: zone.color }
                      : other
                        ? { background: `${other.color}40`, borderColor: `${other.color}80` }
                        : undefined),
                  }}
                >
                  {blocked && <X className="size-3.5" />}
                </button>
              )
            }}
          />
        </div>
      ))}
    </div>
  )
}

function ZoneCard({ zone, index, count }: { zone: Zone; index: number; count: number }) {
  const t = useT()
  const layout = useLayout()
  const games = useGamesById()
  const allGames = useAppStore((s) => s.games)
  const { updateZone, removeZone, moveZone } = useAppStore.getState()
  const [showRule, setShowRule] = useState(false)
  const [showPlace, setShowPlace] = useState(false)
  const [showStrategy, setShowStrategy] = useState(false)
  const [showGames, setShowGames] = useState(false)
  const stats = layout.zoneStats[zone.id]
  const patch = (p: Partial<Zone>) => updateZone(zone.id, p)

  const members = useMemo(
    () =>
      Object.entries(layout.zones)
        .filter(([, z]) => z === zone.id)
        .map(([id]) => games.get(id)?.name ?? '')
        .sort(collator.compare),
    [layout.zones, games, zone.id],
  )
  const tags = useMemo(() => [...new Set(allGames.flatMap((g) => g.tags ?? []))].sort(collator.compare), [allGames])

  return (
    <article
      className="space-y-3 rounded-xl border border-line bg-surface-1 p-3"
      style={{ borderLeft: `4px solid ${zone.color}` }}
    >
      <div className="flex items-center gap-2">
        <label
          className="relative size-6 shrink-0 cursor-pointer rounded-full border-2 border-surface-0 shadow"
          style={{ background: zone.color }}
          title={t('zones.color')}
        >
          <input
            type="color"
            className="absolute inset-0 cursor-pointer opacity-0"
            value={zone.color}
            aria-label={t('zones.color')}
            onChange={(e) => patch({ color: e.target.value })}
          />
        </label>
        <input
          className={cx(inputClass, 'min-w-0 flex-1 py-1.5 font-medium')}
          aria-label={t('zones.name')}
          placeholder={zoneName(t, { ...zone, name: undefined })}
          value={zone.name ?? ''}
          onChange={(e) => patch({ name: e.target.value || undefined })}
        />
        <div className="flex shrink-0">
          <Button
            variant="ghost"
            className="px-1.5 py-1"
            disabled={index === 0}
            onClick={() => moveZone(zone.id, -1)}
            aria-label={t('zones.moveUp')}
            title={t('zones.moveUp')}
          >
            <ChevronUp className="size-4" />
          </Button>
          <Button
            variant="ghost"
            className="px-1.5 py-1"
            disabled={index === count - 1}
            onClick={() => moveZone(zone.id, 1)}
            aria-label={t('zones.moveDown')}
            title={t('zones.moveDown')}
          >
            <ChevronDown className="size-4" />
          </Button>
          <Button
            variant="ghost"
            className="px-1.5 py-1 hover:text-danger"
            onClick={() => removeZone(zone.id)}
            aria-label={t('zones.remove')}
            title={t('zones.remove')}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold tracking-wide text-ink-soft uppercase">{t('zones.rule')}</span>
          <InfoButton open={showRule} onClick={() => setShowRule((v) => !v)} />
        </div>
        <Reveal open={showRule}>
          <p className="pb-1 text-xs text-ink-soft">
            <Rich text={t(`zones.ruleHint.${zone.rule}`)} />
          </p>
        </Reveal>
        <div className="flex gap-2">
          <select
            className={inputClass}
            value={zone.rule}
            onChange={(e) => {
              const rule = e.target.value as ZoneRule
              patch({ rule, strategy: defaultStrategy(rule) })
            }}
          >
            {ZONE_RULES.map((r) => (
              <option key={r} value={r}>
                {t(`zones.rule.${r}`)}
              </option>
            ))}
          </select>
          {zone.rule === 'tag' && (
            <>
              <input
                className={inputClass}
                list={`zone-tags-${zone.id}`}
                aria-label={t('zones.tag')}
                placeholder={t('zones.tagPlaceholder')}
                value={zone.tag ?? ''}
                onChange={(e) => patch({ tag: e.target.value || undefined })}
              />
              <datalist id={`zone-tags-${zone.id}`}>
                {tags.map((tag) => (
                  <option key={tag} value={tag} />
                ))}
              </datalist>
            </>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold tracking-wide text-ink-soft uppercase">{t('zones.place')}</span>
          <InfoButton open={showPlace} onClick={() => setShowPlace((v) => !v)} />
        </div>
        <Reveal open={showPlace}>
          <p className="pb-1 text-xs text-ink-soft">
            <Rich text={zone.place === 'cubes' ? t('zones.cubesHint') : t('zones.placeHint')} />
          </p>
        </Reveal>
        <select className={inputClass} value={zone.place} onChange={(e) => patch({ place: e.target.value as ZonePlace })}>
          {ZONE_PLACES.map((p) => (
            <option key={p} value={p}>
              {t(`zones.place.${p}`)}
            </option>
          ))}
        </select>
        {zone.place === 'cubes' && <CubePicker zone={zone} />}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold tracking-wide text-ink-soft uppercase">{t('zones.strategy')}</span>
          <InfoButton open={showStrategy} onClick={() => setShowStrategy((v) => !v)} />
        </div>
        <Reveal open={showStrategy}>
          <p className="pb-1 text-xs text-ink-soft">
            <Rich text={t('zones.strategyHint')} />
          </p>
        </Reveal>
        <Segmented<Strategy>
          size="sm"
          value={zone.strategy}
          onChange={(strategy) => patch({ strategy })}
          options={(['compact', 'ordered'] as const).map((s) => ({ value: s, label: t(`zones.strategy.${s}`) }))}
        />
      </div>

      <div className="border-t border-line pt-2 text-xs">
        {members.length === 0 ? (
          <p className="text-ink-faint">{t('zones.noGames')}</p>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <span className="text-ink-soft tabular-nums">
                {t('zones.stats', { games: stats?.games ?? 0, cubes: stats?.cubes ?? 0 })}
              </span>
              <button
                type="button"
                className="flex items-center gap-1 text-accent hover:underline"
                aria-expanded={showGames}
                onClick={() => setShowGames((v) => !v)}
              >
                {t('zones.showGames')}
                <ChevronDown className={cx('size-3.5 transition-transform', showGames && 'rotate-180')} />
              </button>
            </div>
            {!!stats?.unplaced && (
              <p className="mt-1 font-medium text-danger">{t('zones.overflow', { count: stats.unplaced })}</p>
            )}
            <Reveal open={showGames}>
              <ul className="flex flex-wrap gap-1 pt-2">
                {members.map((name, i) => (
                  <li key={i} className="rounded-md bg-surface-2 px-1.5 py-0.5 text-[11px] text-ink-soft">
                    {name}
                  </li>
                ))}
              </ul>
            </Reveal>
          </>
        )}
      </div>
    </article>
  )
}

/** Content of the "Zones" section of the options. */
export function ZonesSection() {
  const t = useT()
  const zones = useAppStore((s) => s.zones)
  const { addZone } = useAppStore.getState()
  return (
    <>
      <p className="text-xs text-ink-soft">
        <Rich text={t('zones.hint')} />
      </p>
      {zones.map((zone, i) => (
        <ZoneCard key={zone.id} zone={zone} index={i} count={zones.length} />
      ))}
      <Button className="w-full" onClick={() => addZone(zones.length === 0 ? 'small' : 'manual')}>
        <Plus className="size-4" /> {t('zones.add')}
      </Button>
    </>
  )
}
