import { ArrowDownAZ, ArrowUpZA, RotateCcw } from 'lucide-react'
import type { OrientationMode, SortKey } from '../../domain/types'
import { useT } from '../../i18n'
import { useAppStore } from '../../store/appStore'
import { Button, Field, NumberInput, Section, Segmented, Toggle } from '../ui'
import { cx, inputClass } from '../styles'

// 'weight' becomes selectable once weights can be imported from BGG.
const SORT_KEYS: SortKey[] = ['name', 'year', 'size', 'color', 'added']
const ORIENTATIONS: OrientationMode[] = ['auto', 'vertical', 'horizontal']

export function OptionsPanel() {
  const t = useT()
  const options = useAppStore((s) => s.options)
  const { setOptions, resetOptions } = useAppStore.getState()
  const ordered = options.strategy === 'ordered'

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
          <Toggle label={t('options.fillGaps')} checked={options.fillGaps} onChange={(fillGaps) => setOptions({ fillGaps })} />
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
          checked={options.groupSagas}
          onChange={(groupSagas) => setOptions({ groupSagas })}
        />
        <Toggle
          label={t('options.autoDetectSagas')}
          checked={options.autoDetectSagas}
          onChange={(autoDetectSagas) => setOptions({ autoDetectSagas })}
        />
        <Toggle
          label={t('options.keepSagasInCube')}
          checked={options.keepSagasInCube}
          disabled={!options.groupSagas || !ordered}
          onChange={(keepSagasInCube) => setOptions({ keepSagasInCube })}
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
