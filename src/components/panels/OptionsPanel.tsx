import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Info,
  Layers,
  LayoutPanelLeft,
  ListOrdered,
  Ruler,
  RotateCcw,
  Shapes,
} from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { DEFAULT_OPTIONS } from '../../domain/defaults'
import { GROUP_KEYS } from '../../domain/grouping'
import type { Align, GroupKey, GroupLevel, OrientationMode, PackOptions, SortDirection, SortKey } from '../../domain/types'
import { useT } from '../../i18n'
import { useAppStore } from '../../store/appStore'
import { cx, inputClass } from '../styles'
import { Button, Field, NumberInput, Segmented, Toggle } from '../ui'
import { OptionSection } from './OptionSection'

// 'weight' becomes selectable once weights can be imported from BGG.
const SORT_KEYS: SortKey[] = ['name', 'year', 'size', 'complexity', 'playtime', 'rating', 'color', 'added']
const ORIENTATIONS: OrientationMode[] = ['auto', 'vertical', 'horizontal']

type SectionId = 'layout' | 'order' | 'grouping' | 'sagas' | 'space'

/** Options belonging to each section, used for the "modified" dot and the reset. */
const SECTION_KEYS: Record<SectionId, (keyof PackOptions)[]> = {
  layout: ['strategy', 'orientation', 'align', 'longSideFront'],
  order: ['sortBy', 'sortDirection', 'fillGaps', 'fillOrder'],
  grouping: ['groupBy', 'groupStartsNewCube'],
  sagas: ['groupSagas', 'autoDetectSagas', 'keepSagasInCube', 'keepSagasInLine'],
  space: ['oversizedOnTop', 'overhang', 'overhangSide', 'clearance', 'maxStackHeight'],
}

const OPEN_KEY = 'options.openSections'

/** Which sections are open is a per-viewer convenience; storage may be unavailable. */
function useOpenSections() {
  const [open, setOpen] = useState<SectionId[]>(() => {
    try {
      const saved = localStorage.getItem(OPEN_KEY)
      if (saved) return JSON.parse(saved) as SectionId[]
    } catch {
      // Private mode or blocked storage: fall back to the default.
    }
    return ['layout']
  })
  const toggle = (id: SectionId) =>
    setOpen((current) => {
      const next = current.includes(id) ? current.filter((s) => s !== id) : [...current, id]
      try {
        localStorage.setItem(OPEN_KEY, JSON.stringify(next))
      } catch {
        // Not saved: the panel still works.
      }
      return next
    })
  return { isOpen: (id: SectionId) => open.includes(id), toggle }
}

function DirectionButton({ value, onChange }: { value: SortDirection; onChange: (d: SortDirection) => void }) {
  const t = useT()
  const Icon = value === 'asc' ? ArrowUpNarrowWide : ArrowDownWideNarrow
  return (
    <Button
      className="shrink-0 px-2.5"
      onClick={() => onChange(value === 'asc' ? 'desc' : 'asc')}
      title={t(`options.direction.${value}`)}
    >
      <Icon className="size-4" />
      <span className="text-xs">{t(`options.direction.${value}`)}</span>
    </Button>
  )
}

function GroupSelect({
  value,
  exclude,
  onChange,
  label,
}: {
  value: GroupLevel | undefined
  exclude?: GroupKey
  onChange: (level: GroupLevel | undefined) => void
  label: string
}) {
  const t = useT()
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <select
          className={inputClass}
          value={value?.key ?? ''}
          onChange={(e) =>
            onChange(e.target.value ? { key: e.target.value as GroupKey, direction: value?.direction ?? 'asc' } : undefined)
          }
        >
          <option value="">{t('group.none')}</option>
          {GROUP_KEYS.filter((k) => k !== exclude).map((k) => (
            <option key={k} value={k}>
              {t(`group.${k}`)}
            </option>
          ))}
        </select>
        {value && <DirectionButton value={value.direction} onChange={(direction) => onChange({ ...value, direction })} />}
      </div>
    </Field>
  )
}

/** Explains why a whole section has no effect with the current strategy. */
function Note({ children }: { children: ReactNode }) {
  return (
    <p className="flex gap-2 rounded-lg bg-surface-2 px-3 py-2 text-xs text-ink-soft">
      <Info className="mt-px size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  )
}

export function OptionsPanel() {
  const t = useT()
  const language = useAppStore((s) => s.language)
  const options = useAppStore((s) => s.options)
  const colorBy = useAppStore((s) => s.colorBy)
  const { setOptions, resetOptions, setColorBy } = useAppStore.getState()
  const { isOpen, toggle } = useOpenSections()
  const ordered = options.strategy === 'ordered'
  const [primary, secondary] = options.groupBy
  const num = (n: number) => n.toLocaleString(language)

  const isModified = (id: SectionId) =>
    SECTION_KEYS[id].some((k) => JSON.stringify(options[k]) !== JSON.stringify(DEFAULT_OPTIONS[k])) ||
    (id === 'grouping' && colorBy !== 'game')
  const resetSection = (id: SectionId) => {
    setOptions(Object.fromEntries(SECTION_KEYS[id].map((k) => [k, DEFAULT_OPTIONS[k]])) as Partial<PackOptions>)
    if (id === 'grouping') setColorBy('game')
  }

  const setGroup = (index: 0 | 1, level: GroupLevel | undefined) => {
    const next = [primary, secondary]
    next[index] = level
    // Dropping the first level promotes the second one; a key is used once.
    const groupBy = next.filter((l, i): l is GroupLevel => !!l && next.findIndex((o) => o?.key === l.key) === i)
    setOptions({ groupBy })
  }

  const notUsed = t('options.summary.notUsed')
  const groupSummary = (l: GroupLevel) => `${t(`group.${l.key}`)} ${l.direction === 'asc' ? '↑' : '↓'}`
  const summaries: Record<SectionId, string> = {
    layout: [
      t(`options.strategy.${options.strategy}`),
      t(`orientation.${options.orientation}`),
      t(`options.align.${options.align}`),
      options.longSideFront && t('options.summary.longFront'),
    ]
      .filter(Boolean)
      .join(' · '),
    order: ordered
      ? [
          `${t(`options.sort.${options.sortBy}`)} ${options.sortDirection === 'asc' ? '↑' : '↓'}`,
          t(`options.fillOrder.${options.fillOrder}`),
          options.fillGaps && t('options.summary.fillGaps'),
        ]
          .filter(Boolean)
          .join(' · ')
      : notUsed,
    grouping: !ordered
      ? notUsed
      : options.groupBy.length === 0
        ? t('group.none')
        : [
            options.groupBy.map(groupSummary).join(' → '),
            options.groupStartsNewCube && t('options.summary.newCube'),
            colorBy === 'group' && t('options.summary.colored'),
          ]
            .filter(Boolean)
            .join(' · '),
    sagas: options.groupSagas
      ? [
          t('options.summary.sagasOn'),
          options.autoDetectSagas && t('options.summary.detect'),
          ordered && options.keepSagasInCube && t('options.summary.keep'),
          ordered && options.keepSagasInLine && t('options.summary.keepLine'),
        ]
          .filter(Boolean)
          .join(' · ')
      : t('options.summary.sagasOff'),
    space: [
      t('options.summary.space', { clearance: num(options.clearance), overhang: num(options.overhang) }),
      options.overhang > 0 && options.overhangSide === 'back' && t('options.summary.overhangBack'),
      options.oversizedOnTop && t('options.summary.onTop'),
    ]
      .filter(Boolean)
      .join(' · '),
  }

  const section = (id: SectionId, icon: ReactNode, title: string, children: ReactNode) => (
    <OptionSection
      icon={icon}
      title={title}
      summary={summaries[id]}
      open={isOpen(id)}
      onToggle={() => toggle(id)}
      modified={isModified(id)}
      onReset={() => resetSection(id)}
    >
      {children}
    </OptionSection>
  )

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {section(
          'layout',
          <LayoutPanelLeft className="size-4" />,
          t('options.section.layout'),
          <>
            <div className="grid grid-cols-2 gap-2">
              {(['ordered', 'compact'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-pressed={options.strategy === s}
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
            <Field label={t('options.orientation')} info={t('options.orientationHint')}>
              <Segmented
                value={options.orientation}
                onChange={(orientation) => setOptions({ orientation })}
                options={ORIENTATIONS.map((o) => ({ value: o, label: t(`orientation.${o}`) }))}
              />
            </Field>
            <Field label={t('options.align')} info={t('options.alignHint')}>
              <Segmented<Align>
                value={options.align}
                onChange={(align) => setOptions({ align })}
                options={[
                  { value: 'left', label: <AlignLeft className="size-4" />, title: t('options.align.left') },
                  { value: 'center', label: <AlignCenter className="size-4" />, title: t('options.align.center') },
                  { value: 'right', label: <AlignRight className="size-4" />, title: t('options.align.right') },
                ]}
              />
            </Field>
            <Toggle
              label={t('options.longSideFront')}
              hint={t('options.longSideFrontHint')}
              checked={options.longSideFront}
              onChange={(longSideFront) => setOptions({ longSideFront })}
            />
          </>,
        )}

        {section(
          'order',
          <ListOrdered className="size-4" />,
          t('options.section.order'),
          <>
            {!ordered && <Note>{t('options.compactNote')}</Note>}
            <div className={cx('space-y-4', !ordered && 'pointer-events-none opacity-40')}>
              <Field label={t('options.sortBy')}>
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
                  <DirectionButton value={options.sortDirection} onChange={(sortDirection) => setOptions({ sortDirection })} />
                </div>
              </Field>
              <Field label={t('options.fillOrder')} info={t('options.fillOrderHint')}>
                <Segmented
                  size="sm"
                  value={options.fillOrder}
                  onChange={(fillOrder) => setOptions({ fillOrder })}
                  options={(['rows', 'columns'] as const).map((o) => ({ value: o, label: t(`options.fillOrder.${o}`) }))}
                />
              </Field>
              <Toggle
                label={t('options.fillGaps')}
                hint={t('options.fillGapsHint')}
                checked={options.fillGaps}
                onChange={(fillGaps) => setOptions({ fillGaps })}
              />
            </div>
          </>,
        )}

        {section(
          'grouping',
          <Shapes className="size-4" />,
          t('options.grouping'),
          <>
            {!ordered && <Note>{t('options.compactNote')}</Note>}
            <div className={cx('space-y-4', !ordered && 'pointer-events-none opacity-40')}>
              <p className="text-xs text-ink-soft">{t('options.groupingHint')}</p>
              <GroupSelect label={t('options.groupBy')} value={primary} onChange={(k) => setGroup(0, k)} />
              {primary && (
                <GroupSelect
                  label={t('options.thenBy')}
                  value={secondary}
                  exclude={primary.key}
                  onChange={(k) => setGroup(1, k)}
                />
              )}
              {primary && (
                <div>
                  <Toggle
                    label={t('options.groupStartsNewCube')}
                    hint={t('options.groupStartsNewCubeHint')}
                    checked={options.groupStartsNewCube}
                    onChange={(groupStartsNewCube) => setOptions({ groupStartsNewCube })}
                  />
                  <Toggle
                    label={t('options.colorByGroup')}
                    hint={t('options.colorByGroupHint')}
                    checked={colorBy === 'group'}
                    onChange={(v) => setColorBy(v ? 'group' : 'game')}
                  />
                </div>
              )}
            </div>
          </>,
        )}

        {section(
          'sagas',
          <Layers className="size-4" />,
          t('options.section.sagas'),
          <div>
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
            <Toggle
              label={t('options.keepSagasInLine')}
              hint={t('options.keepSagasInLineHint')}
              checked={options.keepSagasInLine}
              disabled={!options.groupSagas || !ordered}
              onChange={(keepSagasInLine) => setOptions({ keepSagasInLine })}
            />
          </div>,
        )}

        {section(
          'space',
          <Ruler className="size-4" />,
          t('options.section.space'),
          <>
            <Toggle
              label={t('options.oversizedOnTop')}
              hint={t('options.oversizedOnTopHint')}
              checked={options.oversizedOnTop}
              onChange={(oversizedOnTop) => setOptions({ oversizedOnTop })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('options.clearanceShort')} info={t('options.clearanceHint')}>
                <NumberInput
                  step={0.1}
                  value={options.clearance}
                  onChange={(v) => setOptions({ clearance: Math.max(0, v ?? 0) })}
                />
              </Field>
              <Field label={t('options.overhangShort')} info={t('options.overhangHint')}>
                <NumberInput
                  step={0.5}
                  value={options.overhang}
                  onChange={(v) => setOptions({ overhang: Math.max(0, v ?? 0) })}
                />
              </Field>
              <Field label={t('options.overhangSide')} info={t('options.overhangSideHint')}>
                <Segmented
                  size="sm"
                  value={options.overhangSide}
                  onChange={(overhangSide) => setOptions({ overhangSide })}
                  options={(['front', 'back'] as const).map((o) => ({ value: o, label: t(`options.overhangSide.${o}`) }))}
                />
              </Field>
              <Field label={t('options.maxStackHeightShort')} info={t('options.maxStackHeightHint')}>
                <NumberInput
                  step={1}
                  value={options.maxStackHeight}
                  onChange={(v) => setOptions({ maxStackHeight: Math.max(0, v ?? 0) })}
                />
              </Field>
            </div>
          </>,
        )}
      </div>

      <div className="border-t border-line px-5 py-3">
        <Button
          variant="ghost"
          className="w-full"
          onClick={() => {
            resetOptions()
            setColorBy('game')
          }}
        >
          <RotateCcw className="size-4" /> {t('options.reset')}
        </Button>
      </div>
    </div>
  )
}
