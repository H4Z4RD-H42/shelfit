import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  Box,
  Info,
  Layers,
  LayoutGrid,
  ListOrdered,
  RotateCcw,
  Scale,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { DEFAULT_OPTIONS } from '../../domain/defaults'
import { GROUP_KEYS } from '../../domain/grouping'
import { goalOf, missing, negotiable, withGoal } from '../../domain/rules'
import type {
  Align,
  GroupKey,
  GroupLevel,
  OrientationMode,
  PackOptions,
  RuleId,
  SortDirection,
  SortKey,
} from '../../domain/types'
import { useInsights, useLayout } from '../../hooks/useLayout'
import { useT } from '../../i18n'
import { useAppStore } from '../../store/appStore'
import { ruleName, zoneName } from '../labels'
import { cx, inputClass } from '../styles'
import { Button, Field, NumberInput, Segmented, Toggle } from '../ui'
import { OptionSection } from './OptionSection'
import { PrioritiesSection } from './PrioritiesSection'
import { ZonesSection } from './ZonesSection'

// 'weight' becomes selectable once weights can be imported from BGG.
const SORT_KEYS: SortKey[] = ['name', 'year', 'size', 'complexity', 'playtime', 'rating', 'color', 'added']
const ORIENTATIONS: OrientationMode[] = ['auto', 'vertical', 'horizontal']

type SectionId = 'order' | 'sagas' | 'zones' | 'priorities' | 'boxes'
const SECTIONS: SectionId[] = ['order', 'sagas', 'zones', 'priorities', 'boxes']

/** Options belonging to each section, used for the "modified" dot and the reset. */
const SECTION_KEYS: Record<SectionId, (keyof PackOptions)[]> = {
  order: ['sortBy', 'sortDirection', 'ignoreArticles', 'groupBy', 'groupStartsNewCube', 'fillGaps', 'fillOrder'],
  sagas: ['groupSagas', 'autoDetectSagas', 'keepSagasInCube', 'keepSagasInLine'],
  // Zones are not options: the reset buttons leave them alone.
  zones: [],
  priorities: ['priorities'],
  boxes: ['orientation', 'longSideFront', 'align', 'clearance', 'maxStackHeight'],
}

const OPEN_KEY = 'options.openSections'

/** Which sections are open is a per-viewer convenience; storage may be unavailable. */
function useOpenSections() {
  const [open, setOpen] = useState<SectionId[]>(() => {
    try {
      const saved = localStorage.getItem(OPEN_KEY)
      // Sections of older versions are dropped.
      if (saved) return (JSON.parse(saved) as SectionId[]).filter((s) => SECTIONS.includes(s))
    } catch {
      // Private mode or blocked storage: fall back to the default.
    }
    return ['order']
  })
  const update = useCallback(
    (change: (current: SectionId[]) => SectionId[]) =>
      setOpen((current) => {
        const next = change(current)
        try {
          localStorage.setItem(OPEN_KEY, JSON.stringify(next))
        } catch {
          // Not saved: the panel still works.
        }
        return next
      }),
    [],
  )
  const show = useCallback((id: SectionId) => update((c) => (c.includes(id) ? c : [...c, id])), [update])
  return {
    isOpen: (id: SectionId) => open.includes(id),
    toggle: (id: SectionId) => update((c) => (c.includes(id) ? c.filter((s) => s !== id) : [...c, id])),
    show,
  }
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

const GOALS = ['order', 'balanced', 'space'] as const

/**
 * The main choice, from order to room: rules always kept, rules given up to
 * fit every game, or no order at all. Tells what another goal would give.
 */
function Goal() {
  const t = useT()
  const options = useAppStore((s) => s.options)
  const setOptions = useAppStore((s) => s.setOptions)
  const layout = useLayout()
  const { goals } = useInsights()
  const goal = goalOf(options)
  const used = layout.stats.usedCubes
  const out = missing(layout)

  let comparison: string
  if (goal === 'space') {
    const { missing: left, usedCubes } = goals.balanced
    if (left > out) comparison = t('options.goal.orderLeavesOut', { count: left - out })
    else if (usedCubes > used) comparison = t('options.goal.orderCosts', { other: usedCubes, used })
    else comparison = t('options.goal.orderFree')
  } else if (goal !== 'balanced' && goals.balanced.missing < out) {
    comparison = t('options.goal.balancedFits', { count: out - goals.balanced.missing })
  } else if (goals.space.missing < out) {
    comparison = t('options.goal.compactFits', { count: out - goals.space.missing })
  } else if (goals.space.usedCubes < used) {
    comparison = t('options.goal.compactSaves', { other: goals.space.usedCubes, used })
  } else {
    comparison = t('options.goal.orderFree')
  }

  return (
    <div className="space-y-2.5 border-b border-line px-5 py-4">
      <p className="text-xs font-semibold tracking-wide text-ink-soft uppercase">{t('options.goal')}</p>
      <div className="grid grid-cols-3 gap-1.5">
        {GOALS.map((g) => (
          <button
            key={g}
            type="button"
            aria-pressed={goal === g}
            onClick={() => setOptions(withGoal(options, g))}
            className={cx(
              'rounded-xl border px-2.5 py-2 text-left transition-colors',
              goal === g ? 'border-accent bg-accent/10' : 'border-line hover:border-ink-faint',
            )}
          >
            <span className="block text-sm leading-tight font-semibold">{t(`options.goal.${g}`)}</span>
            <span className="mt-0.5 block text-[11px] leading-snug text-ink-soft">{t(`options.goal.${g}Hint`)}</span>
          </button>
        ))}
      </div>
      <p className="text-xs text-ink-soft">{t(`options.goal.${goal}About`)}</p>
      <p className="flex gap-2 text-xs text-ink-soft">
        <Scale className="mt-px size-3.5 shrink-0" />
        <span>{comparison}</span>
      </p>
    </div>
  )
}

export function OptionsPanel() {
  const t = useT()
  const language = useAppStore((s) => s.language)
  const options = useAppStore((s) => s.options)
  const colorBy = useAppStore((s) => s.colorBy)
  const zones = useAppStore((s) => s.zones)
  const focus = useAppStore((s) => s.optionsFocus)
  const { setOptions, resetOptions, setColorBy, focusOptions } = useAppStore.getState()
  const layout = useLayout()
  const { isOpen, toggle, show } = useOpenSections()
  const sectionRefs = useRef<Partial<Record<SectionId, HTMLDivElement | null>>>({})
  const ordered = options.strategy === 'ordered'
  const [primary, secondary] = options.groupBy
  const num = (n: number) => n.toLocaleString(language)

  // Opened from elsewhere (the stats bar): show the section asked for, once.
  useEffect(() => {
    if (!focus) return
    show(focus as SectionId)
    sectionRefs.current[focus as SectionId]?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    focusOptions(null)
  }, [focus, show, focusOptions])

  const isModified = (id: SectionId) =>
    SECTION_KEYS[id].some((k) => JSON.stringify(options[k]) !== JSON.stringify(DEFAULT_OPTIONS[k])) ||
    (id === 'order' && colorBy !== 'game') ||
    (id === 'zones' && zones.length > 0)
  const resetSection = (id: SectionId) => {
    setOptions(Object.fromEntries(SECTION_KEYS[id].map((k) => [k, DEFAULT_OPTIONS[k]])) as Partial<PackOptions>)
    if (id === 'order') setColorBy('game')
  }

  const setGroup = (index: 0 | 1, level: GroupLevel | undefined) => {
    const next = [primary, secondary]
    next[index] = level
    // Dropping the first level promotes the second one; a key is used once.
    const groupBy = next.filter((l, i): l is GroupLevel => !!l && next.findIndex((o) => o?.key === l.key) === i)
    setOptions({ groupBy })
  }

  /** Label of a rule's switch, marked when the layout had to give the rule up. */
  const ruleLabel = (text: string, rule: RuleId) => (
    <>
      {text}
      {layout.relaxed.includes(rule) && (
        <span className="ml-1.5 rounded bg-warn/15 px-1.5 py-px text-[10px] font-semibold text-warn uppercase">
          {t('rule.relaxedBadge')}
        </span>
      )}
    </>
  )

  const notUsed = t('options.summary.notUsed')
  const groupSummary = (l: GroupLevel) => `${t(`group.${l.key}`)} ${l.direction === 'asc' ? '↑' : '↓'}`
  const relaxedCount = layout.relaxed.length
  const summaries: Record<SectionId, string> = {
    order: ordered
      ? [
          `${t(`options.sort.${options.sortBy}`)} ${options.sortDirection === 'asc' ? '↑' : '↓'}`,
          options.sortBy === 'name' && options.ignoreArticles && t('options.summary.noArticles'),
          options.groupBy.length > 0 && options.groupBy.map(groupSummary).join(' → '),
          options.groupBy.length > 0 && options.groupStartsNewCube && t('options.summary.newCube'),
          t(`options.fillOrder.${options.fillOrder}`),
          options.fillGaps && t('options.summary.fillGaps'),
        ]
          .filter(Boolean)
          .join(' · ')
      : notUsed,
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
    zones: zones.length > 0 ? zones.map((z) => zoneName(t, z)).join(' · ') : t('zones.summary.none'),
    priorities:
      relaxedCount > 0
        ? t(relaxedCount === 1 ? 'priorities.summary.relaxed.one' : 'priorities.summary.relaxed.other', {
            count: relaxedCount,
            rules: layout.relaxed.map((r) => ruleName(t, r, options)).join(', '),
          })
        : negotiable(options).length > 0
          ? t('priorities.summary.kept')
          : t('priorities.summary.none'),
    boxes: [
      t(`orientation.${options.orientation}`),
      options.longSideFront && t('options.summary.longFront'),
      t('options.summary.space', { clearance: num(options.clearance) }),
      options.maxStackHeight > 0 && t('options.summary.stack', { height: num(options.maxStackHeight) }),
    ]
      .filter(Boolean)
      .join(' · '),
  }

  const section = (id: SectionId, icon: ReactNode, title: string, children: ReactNode) => (
    <div
      ref={(el) => {
        sectionRefs.current[id] = el
      }}
    >
      <OptionSection
        icon={icon}
        title={title}
        summary={summaries[id]}
        open={isOpen(id)}
        onToggle={() => toggle(id)}
        modified={isModified(id)}
        onReset={id === 'zones' ? undefined : () => resetSection(id)}
      >
        {children}
      </OptionSection>
    </div>
  )

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Goal />

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
              {options.sortBy === 'name' && (
                <div className="-mt-2">
                  <Toggle
                    label={t('options.ignoreArticles')}
                    hint={t('options.ignoreArticlesHint')}
                    checked={options.ignoreArticles}
                    onChange={(ignoreArticles) => setOptions({ ignoreArticles })}
                  />
                </div>
              )}
              <GroupSelect label={t('options.groupBy')} value={primary} onChange={(k) => setGroup(0, k)} />
              {primary && (
                <GroupSelect
                  label={t('options.thenBy')}
                  value={secondary}
                  exclude={primary.key}
                  onChange={(k) => setGroup(1, k)}
                />
              )}
              {!primary && <p className="-mt-2 text-xs text-ink-faint">{t('options.groupingHint')}</p>}
              <Field label={t('options.fillOrder')} info={t('options.fillOrderHint')}>
                <Segmented
                  size="sm"
                  value={options.fillOrder}
                  onChange={(fillOrder) => setOptions({ fillOrder })}
                  options={(['rows', 'columns'] as const).map((o) => ({ value: o, label: t(`options.fillOrder.${o}`) }))}
                />
              </Field>
              <div>
                <Toggle
                  label={ruleLabel(t('options.strictOrder'), 'strictOrder')}
                  hint={t('options.strictOrderHint')}
                  checked={!options.fillGaps}
                  onChange={(strict) => setOptions({ fillGaps: !strict })}
                />
                {primary && (
                  <>
                    <Toggle
                      label={ruleLabel(t('options.groupStartsNewCube'), 'groupCube')}
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
                  </>
                )}
              </div>
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
              label={ruleLabel(t('options.keepSagasInCube'), 'sagaInCube')}
              hint={t('options.keepSagasInCubeHint')}
              checked={options.keepSagasInCube}
              disabled={!options.groupSagas || !ordered}
              onChange={(keepSagasInCube) => setOptions({ keepSagasInCube })}
            />
            <Toggle
              label={ruleLabel(t('options.keepSagasInLine'), 'sagaInLine')}
              hint={t('options.keepSagasInLineHint')}
              checked={options.keepSagasInLine}
              disabled={!options.groupSagas || !ordered}
              onChange={(keepSagasInLine) => setOptions({ keepSagasInLine })}
            />
          </div>,
        )}

        {section('zones', <LayoutGrid className="size-4" />, t('options.section.zones'), <ZonesSection />)}

        {section('priorities', <Scale className="size-4" />, t('options.section.priorities'), <PrioritiesSection />)}

        {section(
          'boxes',
          <Box className="size-4" />,
          t('options.section.boxes'),
          <>
            <Field label={ruleLabel(t('options.orientation'), 'orientation')} info={t('options.orientationHint')}>
              <Segmented
                value={options.orientation}
                onChange={(orientation) => setOptions({ orientation })}
                options={ORIENTATIONS.map((o) => ({ value: o, label: t(`orientation.${o}`) }))}
              />
            </Field>
            <Toggle
              label={ruleLabel(t('options.longSideFront'), 'longSideFront')}
              hint={t('options.longSideFrontHint')}
              checked={options.longSideFront}
              onChange={(longSideFront) => setOptions({ longSideFront })}
            />
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
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('options.clearanceShort')} info={t('options.clearanceHint')}>
                <NumberInput
                  step={0.1}
                  value={options.clearance}
                  onChange={(v) => setOptions({ clearance: Math.max(0, v ?? 0) })}
                />
              </Field>
              <Field label={ruleLabel(t('options.maxStackHeightShort'), 'stackHeight')} info={t('options.maxStackHeightHint')}>
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
