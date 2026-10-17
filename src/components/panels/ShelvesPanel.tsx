import { Plus, RotateCcw, X } from 'lucide-react'
import { KALLAX_CUBE, KALLAX_FINISHES, KALLAX_PRESETS, cubeKey, isBlocked, unitOuterSize } from '../../domain/kallax'
import type { CubeSize } from '../../domain/types'
import { useT } from '../../i18n'
import { useAppStore } from '../../store/appStore'
import { Button, Field, NumberInput, Section } from '../ui'
import { cx, inputClass } from '../styles'

export function ShelvesPanel() {
  const t = useT()
  const units = useAppStore((s) => s.units)
  const cube = useAppStore((s) => s.cube)
  const { addUnit, updateUnit, removeUnit, setCube } = useAppStore.getState()

  const setCubeDim = (key: keyof CubeSize) => (v: number | undefined) => {
    if (v && v > 0) setCube({ ...cube, [key]: v })
  }

  return (
    <div className="h-full overflow-y-auto">
      {units.map((unit, i) => {
        const outer = unitOuterSize(unit, cube)
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
            <Field label={t('shelves.size')} hint={t('shelves.outer', { w: outer.width.toFixed(1), h: outer.height.toFixed(1) })}>
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
              <div className="grid max-w-56 gap-1" style={{ gridTemplateColumns: `repeat(${unit.columns}, 1fr)` }}>
                {Array.from({ length: unit.columns * unit.rows }, (_, k) => {
                  const column = k % unit.columns
                  const row = Math.floor(k / unit.columns)
                  const blocked = isBlocked(unit, column, row)
                  const key = cubeKey(column, row)
                  return (
                    <button
                      key={key}
                      type="button"
                      aria-pressed={blocked}
                      title={t('shelves.blockedCube', { row: row + 1, column: column + 1 })}
                      onClick={() =>
                        updateUnit(unit.id, {
                          blocked: blocked ? unit.blocked!.filter((b) => b !== key) : [...(unit.blocked ?? []), key],
                        })
                      }
                      className={cx(
                        'flex aspect-square items-center justify-center rounded-md border transition-colors',
                        blocked
                          ? 'border-danger/50 bg-danger/15 text-danger'
                          : 'border-line bg-surface-2 text-transparent hover:border-ink-faint',
                      )}
                    >
                      <X className="size-4" />
                    </button>
                  )
                })}
              </div>
            </Field>
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
      <Section
        title={t('shelves.cube')}
        action={
          <Button variant="ghost" className="px-2 py-1 text-xs" onClick={() => setCube(KALLAX_CUBE)}>
            <RotateCcw className="size-3.5" /> {t('shelves.resetCube')}
          </Button>
        }
      >
        <div className="grid grid-cols-3 gap-2">
          <NumberInput aria-label={t('game.width')} value={cube.width} onChange={setCubeDim('width')} />
          <NumberInput aria-label={t('game.height')} value={cube.height} onChange={setCubeDim('height')} />
          <NumberInput aria-label={t('game.depth')} value={cube.depth} onChange={setCubeDim('depth')} />
        </div>
        <p className="text-xs text-ink-faint">{t('shelves.cubeHint')}</p>
      </Section>
    </div>
  )
}
