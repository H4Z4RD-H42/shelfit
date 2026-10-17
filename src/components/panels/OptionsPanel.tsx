import { ArrowDownAZ, ArrowUpZA, RotateCcw } from 'lucide-react'
import { GROUP_KEYS } from '../../domain/grouping'
import type { GroupKey, OrientationMode, SortKey } from '../../domain/types'
import { useT } from '../../i18n'
import { useAppStore } from '../../store/appStore'
import { cx, inputClass } from '../styles'
import { Button, Field, NumberInput, Section, Segmented, Toggle } from '../ui'

// 'weight' becomes selectable once weights can be imported from BGG.
const SORT_KEYS: SortKey[] = ['name', 'year', 'size', 'complexity', 'playtime', 'rating', 'color', 'added']
const ORIENTATIONS: OrientationMode[] = ['auto', 'vertical', 'horizontal']

function GroupSelect({
  value,
  exclude,
  onChange,
  label,
}: {
  value: GroupKey | undefined
  exclude?: GroupKey
  onChange: (key: GroupKey | undefined) => void
  label: string
}) {
  const t = useT()
  return (
    <Field label={label}>
      <select
        className={inputClass}
        value={value ?? ''}
        onChange={(e) => onChange((e.target.value || undefined) as GroupKey | undefined)}
      >
        <option value="">{t('group.none')}</option>
        {GROUP_KEYS.filter((k) => k !== exclude).map((k) => (
          <option key={k} value={k}>
            {t(`group.${k}`)}
          </option>
        ))}
      </select>
    </Field>
  )
}

export function OptionsPanel() {
  const t = useT()
  const options = useAppStore((s) => s.options)
  const colorBy = useAppStore((s) => s.colorBy)
  const { setOptions, resetOptions, setColorBy } = useAppStore.getState()
  const ordered = options.strategy === 'ordered'
  const [primary, secondary] = options.groupBy

  const setGroup = (level: 0 | 1, key: GroupKey | undefined) => {
    const next = [primary, secondary]
    next[level] = key
    // Dropping the first level promotes the second one.
    const groupBy = next.filter((k, i): k is GroupKey => !!k && next.indexOf(k) === i)
    setOptions({ groupBy })
  }

  return (
    <div className="h-full overflow-y-auto">
      <Section title={t('options.orientation')}>
        <Segmented
          value={options.orientation}
          onChange={(orientation) => setOptions({ orientation })}
          options={ORIENTATIONS.map((o) => ({ value: o, label: t(`orientation.${o}`) }))}
        />
      </Section>

      <Section title={t('options.strategy')}>
        <div className="grid grid-cols-2 gap-2">
          {(['ordered', 'compact'] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setOptions({ strategy: s })}
              className={cx(
                'rounded-xl border p-3 text-left transition-colors',
                options.strategy === s ? 'border-accent bg-accent/10' : 'border-line hover:border-ink-faint',
              )}
            >
              <span className="block text-sm font-semibold">{t(`options.strategy.${s}`)}</span>
              <span className="mt-1 block text-xs text-ink-soft">{t(`options.strategy.${s}Hint`)}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title={t('options.grouping')}>
        <div className={cx('space-y-3', !ordered && 'pointer-events-none opacity-40')}>
          <p className="text-xs text-ink-soft">{t('options.groupingHint')}</p>
          <div className="grid grid-cols-2 gap-3">
            <GroupSelect label={t('options.groupBy')} value={primary} onChange={(k) => setGroup(0, k)} />
            {primary && (
              <GroupSelect label={t('options.thenBy')} value={secondary} exclude={primary} onChange={(k) => setGroup(1, k)} />
            )}
          </div>
          <Toggle
            label={t('options.groupStartsNewCube')}
            hint={t('options.groupStartsNewCubeHint')}
            checked={options.groupStartsNewCube}
            disabled={!primary}
            onChange={(groupStartsNewCube) => setOptions({ groupStartsNewCube })}
          />
        </div>
        <Toggle
          label={t('options.colorByGroup')}
          hint={t('options.colorByGroupHint')}
          checked={colorBy === 'group'}
          disabled={!primary}
          onChange={(v) => setColorBy(v ? 'group' : 'game')}
        />
      </Section>

      <Section title={t('options.sortBy')}>
        <div className={cx('space-y-3', !ordered && 'pointer-events-none opacity-40')}>
          <div className="flex gap-2">
            <select
              className={inputClass}
              value={options.sortBy}
              onChange={(e) => setOptions({ sortBy: e.target.value as SortKey })}
            >
              {SORT_KEYS.map((k) => (
                <option key={k} value={k}>
                  {t(`options.sort.${k}`)}
                </option>
              ))}
            </select>
            <Button
              onClick={() => setOptions({ sortDirection: options.sortDirection === 'asc' ? 'desc' : 'asc' })}
              title={t(`options.direction.${options.sortDirection}`)}
              aria-label={t(`options.direction.${options.sortDirection}`)}
            >
              {options.sortDirection === 'asc' ? <ArrowDownAZ className="size-4" /> : <ArrowUpZA className="size-4" />}
            </Button>
          </div>
          <Toggle
            label={t('options.fillGaps')}
            hint={t('options.fillGapsHint')}
            checked={options.fillGaps}
            onChange={(fillGaps) => setOptions({ fillGaps })}
          />
        </div>
        <Field label={t('options.fillOrder')}>
          <Segmented
            size="sm"
            value={options.fillOrder}
            onChange={(fillOrder) => setOptions({ fillOrder })}
            options={(['rows', 'columns'] as const).map((o) => ({ value: o, label: t(`options.fillOrder.${o}`) }))}
          />
        </Field>
      </Section>

      <Section title={t('game.saga')}>
        <Toggle
          label={t('options.groupSagas')}
          hint={t('options.groupSagasHint')}
          checked={options.groupSagas}
          onChange={(groupSagas) => setOptions({ groupSagas })}
        />
        <Toggle
          label={t('options.autoDetectSagas')}
          hint={t('options.autoDetectSagasHint')}
          checked={options.autoDetectSagas}
          onChange={(autoDetectSagas) => setOptions({ autoDetectSagas })}
        />
        <Toggle
          label={t('options.keepSagasInCube')}
          hint={t('options.keepSagasInCubeHint')}
          checked={options.keepSagasInCube}
          disabled={!options.groupSagas || !ordered}
          onChange={(keepSagasInCube) => setOptions({ keepSagasInCube })}
        />
      </Section>

      <Section title={t('options.top')}>
        <Toggle
          label={t('options.oversizedOnTop')}
          hint={t('options.oversizedOnTopHint')}
          checked={options.oversizedOnTop}
          onChange={(oversizedOnTop) => setOptions({ oversizedOnTop })}
        />
      </Section>

      <Section title={t('shelves.cube')}>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('options.clearance')}>
            <NumberInput step={0.1} value={options.clearance} onChange={(v) => setOptions({ clearance: Math.max(0, v ?? 0) })} />
          </Field>
          <Field label={t('options.overhang')}>
            <NumberInput step={0.5} value={options.overhang} onChange={(v) => setOptions({ overhang: Math.max(0, v ?? 0) })} />
          </Field>
          <Field label={t('options.maxStackHeight')}>
            <NumberInput
              step={1}
              value={options.maxStackHeight}
              onChange={(v) => setOptions({ maxStackHeight: Math.max(0, v ?? 0) })}
            />
          </Field>
        </div>
      </Section>

      <div className="px-5 py-4">
        <Button variant="ghost" className="w-full" onClick={resetOptions}>
          <RotateCcw className="size-4" /> {t('options.reset')}
        </Button>
      </div>
    </div>
  )
}
