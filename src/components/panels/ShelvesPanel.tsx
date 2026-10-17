import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import { isCustom, kallaxShape, unitGeometry } from '../../domain/geometry'
import { KALLAX_FINISHES, KALLAX_PRESETS, cubeKey, isBlocked, isTopFree, unitOverhangSide } from '../../domain/kallax'
import type { CustomColumn, CustomShape, ShelfUnit, UnitKind } from '../../domain/types'
import { useT } from '../../i18n'
import { useAppStore } from '../../store/appStore'
import { cubePosition } from '../labels'
import { UnitCells } from '../UnitCells'
import { Button, Field, NumberInput, Section, Segmented, Toggle } from '../ui'
import { cx, inputClass } from '../styles'

/** Size of the maps of the compartments in the panel (px). */
const MAP = { width: 288, height: 240 }

function toggleBlocked(unit: ShelfUnit, column: number, row: number) {
  const key = cubeKey(column, row)
  const blocked = isBlocked(unit, column, row)
  useAppStore.getState().updateUnit(unit.id, {
    blocked: blocked ? unit.blocked!.filter((b) => b !== key) : [...(unit.blocked ?? []), key],
  })
}

/** Grid sizes of a KALLAX and the cubes not to use. */
function KallaxEditor({ unit }: { unit: ShelfUnit }) {
  const t = useT()
  const { updateUnit } = useAppStore.getState()
  return (
    <>
      <Field label={t('shelves.size')}>
        <div className="grid grid-cols-6 gap-1.5">
          {KALLAX_PRESETS.map((p) => {
            const active = p.columns === unit.columns && p.rows === unit.rows
            return (
              <button
                key={`${p.columns}x${p.rows}`}
                type="button"
                onClick={() => updateUnit(unit.id, { columns: p.columns, rows: p.rows })}
                className={cx(
                  'flex aspect-square flex-col items-center justify-center gap-1 rounded-lg border p-1 transition-colors',
                  active ? 'border-accent bg-accent/10' : 'border-line hover:border-ink-faint',
                )}
                title={`${p.columns} × ${p.rows}`}
              >
                <span
                  className="grid w-full max-w-7 gap-px"
                  style={{
                    gridTemplateColumns: `repeat(${p.columns}, 1fr)`,
                    aspectRatio: `${p.columns} / ${p.rows}`,
                    maxHeight: '1.75rem',
                  }}
                >
                  {Array.from({ length: p.columns * p.rows }, (_, k) => (
                    <span key={k} className={cx('rounded-[1px]', active ? 'bg-accent' : 'bg-ink-faint/60')} />
                  ))}
                </span>
                <span className="text-[10px] text-ink-soft tabular-nums">
                  {p.columns}×{p.rows}
                </span>
              </button>
            )
          })}
        </div>
      </Field>
      <Field label={t('shelves.blocked')} hint={t('shelves.blockedHint')}>
        <UnitCells
          unit={unit}
          max={{ width: 224, height: MAP.height }}
          render={({ column, row }, style) => {
            const blocked = isBlocked(unit, column, row)
            return (
              <button
                key={cubeKey(column, row)}
                type="button"
                aria-pressed={blocked}
                title={cubePosition(t, unit, column, row)}
                onClick={() => toggleBlocked(unit, column, row)}
                style={style}
                className={cx(
                  'flex items-center justify-center rounded-md border transition-colors',
                  blocked
                    ? 'border-danger/50 bg-danger/15 text-danger'
                    : 'border-line bg-surface-2 text-transparent hover:border-ink-faint',
                )}
              >
                <X className="size-4" />
              </button>
            )
          }}
        />
      </Field>
    </>
  )
}

/** Positive sizes only; an empty or zero field keeps the previous value while typing. */
const positive = (set: (v: number) => void) => (v: number | undefined) => {
  if (v !== undefined && v > 0) set(v)
}

const FRAME_FIELDS = [
  { key: 'depth', label: 'shelves.depth' },
  { key: 'outer', label: 'shelves.outerPanel' },
  { key: 'inner', label: 'shelves.innerPanel' },
] as const

/** A unit built by hand: frame, then compartment by compartment. */
function CustomEditor({ unit, shape }: { unit: ShelfUnit; shape: CustomShape }) {
  const t = useT()
  const { updateUnit, reshapeUnit } = useAppStore.getState()
  const [selected, select] = useState({ column: 0, row: 0 })
  const column = Math.min(selected.column, shape.columns.length - 1)
  const col = shape.columns[column]!
  const row = Math.min(selected.row, col.cells.length - 1)
  const blocked = isBlocked(unit, column, row)

  const setShape = (patch: Partial<CustomShape>) => updateUnit(unit.id, { custom: { ...shape, ...patch } })
  const setColumn = (patch: Partial<CustomColumn>) =>
    setShape({ columns: shape.columns.map((c, i) => (i === column ? { ...c, ...patch } : c)) })
  const setHeight = (height: number) => setColumn({ cells: col.cells.map((h, i) => (i === row ? height : h)) })

  return (
    <>
      <Field label={t('shelves.frame')} info={t('shelves.frameHint')}>
        <div className="grid grid-cols-3 gap-2">
          {FRAME_FIELDS.map(({ key, label }) => (
            <label key={key} className="space-y-1">
              <span className="block text-[11px] text-ink-faint">{t(label)}</span>
              <NumberInput
                value={shape[key]}
                onChange={(v) => {
                  // Panels may be missing (0), the depth may not.
                  if (v !== undefined && (key === 'depth' ? v > 0 : v >= 0)) setShape({ [key]: v })
                }}
              />
            </label>
          ))}
        </div>
      </Field>
      <Field label={t('shelves.cells')} hint={t('shelves.cellsHint')}>
        <div className="flex justify-center rounded-lg bg-surface-2 p-3">
          <UnitCells
            unit={unit}
            max={MAP}
            render={(cell, style) => {
              const active = cell.column === column && cell.row === row
              const off = isBlocked(unit, cell.column, cell.row)
              return (
                <button
                  key={cubeKey(cell.column, cell.row)}
                  type="button"
                  aria-pressed={active}
                  title={cubePosition(t, unit, cell.column, cell.row)}
                  onClick={() => select({ column: cell.column, row: cell.row })}
                  style={style}
                  className={cx(
                    'flex items-center justify-center overflow-hidden rounded-[3px] border text-[10px] tabular-nums transition-colors',
                    active ? 'border-accent bg-accent/20 text-ink' : 'border-line bg-surface-0 text-ink-faint',
                    off && !active && 'bg-danger/10 text-danger',
                  )}
                >
                  {off ? (
                    <X className="size-3.5" />
                  ) : (
                    // The sizes, when the compartment is large enough to show them.
                    Number(style.width) > 52 && Number(style.height) > 16 && `${cell.size.width}×${cell.size.height}`
                  )}
                </button>
              )
            }}
          />
        </div>
      </Field>
      <div className="space-y-3 rounded-lg border border-line p-3">
        <p className="font-display text-sm font-semibold">{t('shelves.cellTitle', { column: column + 1, n: row + 1 })}</p>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t('shelves.columnWidth')}>
            <NumberInput value={col.width} onChange={positive((width) => setColumn({ width }))} />
          </Field>
          <Field label={t('shelves.cellHeight')}>
            <NumberInput value={col.cells[row]} onChange={positive(setHeight)} />
          </Field>
        </div>
        <p className="text-xs text-ink-faint">{t('shelves.sizesHint')}</p>
        <Toggle
          label={t('shelves.cellBlocked')}
          hint={t('shelves.cellBlockedHint')}
          checked={blocked}
          onChange={() => toggleBlocked(unit, column, row)}
        />
        <div className="grid grid-cols-3 gap-1.5">
          <Button
            className="px-2 text-xs"
            onClick={() => {
              reshapeUnit(unit.id, { type: 'addCell', column, at: row, copy: row })
              select({ column, row })
            }}
          >
            <ArrowUp className="size-3.5" /> {t('shelves.addCellAbove')}
          </Button>
          <Button
            className="px-2 text-xs"
            onClick={() => {
              reshapeUnit(unit.id, { type: 'addCell', column, at: row + 1, copy: row })
              select({ column, row: row + 1 })
            }}
          >
            <ArrowDown className="size-3.5" /> {t('shelves.addCellBelow')}
          </Button>
          <Button
            variant="danger"
            className="px-2 text-xs"
            disabled={col.cells.length < 2}
            onClick={() => reshapeUnit(unit.id, { type: 'removeCell', column, row })}
          >
            <Trash2 className="size-3.5" /> {t('shelves.removeCell')}
          </Button>
          <Button
            className="px-2 text-xs"
            onClick={() => {
              reshapeUnit(unit.id, { type: 'addColumn', at: column, copy: column })
              select({ column, row })
            }}
          >
            <ArrowLeft className="size-3.5" /> {t('shelves.addColumnLeft')}
          </Button>
          <Button
            className="px-2 text-xs"
            onClick={() => {
              reshapeUnit(unit.id, { type: 'addColumn', at: column + 1, copy: column })
              select({ column: column + 1, row })
            }}
          >
            <ArrowRight className="size-3.5" /> {t('shelves.addColumnRight')}
          </Button>
          <Button
            variant="danger"
            className="px-2 text-xs"
            disabled={shape.columns.length < 2}
            onClick={() => reshapeUnit(unit.id, { type: 'removeColumn', column })}
          >
            <Trash2 className="size-3.5" /> {t('shelves.removeColumn')}
          </Button>
        </div>
      </div>
    </>
  )
}

export function ShelvesPanel() {
  const t = useT()
  const units = useAppStore((s) => s.units)
  const { addUnit, updateUnit, removeUnit } = useAppStore.getState()

  // A unit becomes custom starting from its KALLAX grid, or from the shape it had before.
  const setKind = (unit: ShelfUnit, kind: UnitKind) =>
    updateUnit(unit.id, kind === 'custom' ? { kind, custom: unit.custom ?? kallaxShape(unit) } : { kind })

  return (
    <div className="h-full overflow-y-auto">
      {units.map((unit, i) => {
        const outer = unitGeometry(unit)
        return (
          <Section
            key={unit.id}
            title={t('shelves.unit', { n: i + 1 })}
            action={
              units.length > 1 && (
                <Button
                  variant="ghost"
                  className="px-2 py-1"
                  onClick={() => removeUnit(unit.id)}
                  aria-label={t('shelves.remove')}
                  title={t('shelves.remove')}
                >
                  <X className="size-4" />
                </Button>
              )
            }
          >
            <Field label={t('shelves.name')}>
              <input className={inputClass} value={unit.name} onChange={(e) => updateUnit(unit.id, { name: e.target.value })} />
            </Field>
            <Field
              label={t('shelves.kind')}
              info={t('shelves.kindHint')}
              hint={t('shelves.outer', { w: outer.width.toFixed(1), h: outer.height.toFixed(1) })}
            >
              <Segmented
                size="sm"
                value={isCustom(unit) ? 'custom' : 'kallax'}
                onChange={(kind) => setKind(unit, kind)}
                options={(['kallax', 'custom'] as const).map((k) => ({ value: k, label: t(`shelves.kind.${k}`) }))}
              />
            </Field>
            {isCustom(unit) && unit.custom ? <CustomEditor unit={unit} shape={unit.custom} /> : <KallaxEditor unit={unit} />}
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('shelves.overhang')} info={t('shelves.overhangHint')}>
                <NumberInput
                  step={0.5}
                  value={unit.overhang ?? 0}
                  onChange={(v) => updateUnit(unit.id, { overhang: Math.max(0, v ?? 0) })}
                />
              </Field>
              <Field label={t('shelves.overhangSide')} info={t('shelves.overhangSideHint')}>
                <Segmented
                  size="sm"
                  value={unitOverhangSide(unit)}
                  onChange={(overhangSide) => updateUnit(unit.id, { overhangSide })}
                  options={(['front', 'back'] as const).map((o) => ({ value: o, label: t(`shelves.overhangSide.${o}`) }))}
                />
              </Field>
            </div>
            <Toggle
              label={t('shelves.topFree')}
              hint={t('shelves.topFreeHint')}
              checked={isTopFree(unit)}
              onChange={(topFree) => updateUnit(unit.id, { topFree })}
            />
            <Field label={t('shelves.finish')}>
              <div className="flex flex-wrap gap-2">
                {KALLAX_FINISHES.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    title={t(`finish.${f.id}` as Parameters<typeof t>[0])}
                    aria-label={t(`finish.${f.id}` as Parameters<typeof t>[0])}
                    onClick={() => updateUnit(unit.id, { color: f.color })}
                    className={cx(
                      'size-8 rounded-full border-2 transition-transform hover:scale-110',
                      unit.color === f.color ? 'border-accent' : 'border-line',
                    )}
                    style={{ background: f.color }}
                  />
                ))}
                <input
                  type="color"
                  value={unit.color}
                  onChange={(e) => updateUnit(unit.id, { color: e.target.value })}
                  className="size-8 cursor-pointer rounded-full border-2 border-line bg-transparent"
                />
              </div>
            </Field>
          </Section>
        )
      })}
      <div className="px-5 py-4">
        <Button className="w-full" onClick={addUnit}>
          <Plus className="size-4" /> {t('shelves.add')}
        </Button>
      </div>
    </div>
  )
}
