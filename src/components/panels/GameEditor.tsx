import { useState, type FormEvent } from 'react'
import { autoColor } from '../../domain/color'
import type { Game, GameOrientation } from '../../domain/types'
import { useT } from '../../i18n'
import { Button, Field, NumberInput, Segmented } from '../ui'
import { inputClass } from '../styles'

export type GameDraft = Omit<Game, 'id' | 'createdAt'>

const emptyDraft: GameDraft = {
  name: '',
  dims: { width: 0, height: 0, depth: 0 },
  orientation: 'inherit',
}

export function GameEditor({
  initial,
  sagas,
  onSave,
  onCancel,
  onDelete,
}: {
  initial?: Game
  sagas: string[]
  onSave: (draft: GameDraft) => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const t = useT()
  const [draft, setDraft] = useState<GameDraft>(initial ?? emptyDraft)
  const [error, setError] = useState(false)
  const patch = (p: Partial<GameDraft>) => setDraft((d) => ({ ...d, ...p }))
  const setDim = (key: keyof GameDraft['dims']) => (v: number | undefined) =>
    setDraft((d) => ({ ...d, dims: { ...d.dims, [key]: v ?? 0 } }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const { width, height, depth } = draft.dims
    if (!draft.name.trim() || !(width > 0 && height > 0 && depth > 0)) {
      setError(true)
      return
    }
    onSave({ ...draft, name: draft.name.trim(), saga: draft.saga?.trim() || undefined })
  }

  const orientations: GameOrientation[] = ['inherit', 'vertical', 'horizontal']

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-line bg-surface-1 p-4">
      <h3 className="font-display text-sm font-semibold">{initial ? t('game.edit') : t('game.new')}</h3>
      <Field label={t('game.name')}>
        <input autoFocus className={inputClass} value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
      </Field>
      <Field label={t('game.dims')}>
        <div className="grid grid-cols-3 gap-2">
          <NumberInput
            aria-label={t('game.width')}
            placeholder={t('game.width')}
            value={draft.dims.width || undefined}
            onChange={setDim('width')}
          />
          <NumberInput
            aria-label={t('game.height')}
            placeholder={t('game.height')}
            value={draft.dims.height || undefined}
            onChange={setDim('height')}
          />
          <NumberInput
            aria-label={t('game.depth')}
            placeholder={t('game.depth')}
            value={draft.dims.depth || undefined}
            onChange={setDim('depth')}
          />
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t('game.saga')}>
          <input
            className={inputClass}
            list="saga-list"
            placeholder={t('game.sagaPlaceholder')}
            value={draft.saga ?? ''}
            onChange={(e) => patch({ saga: e.target.value })}
          />
          <datalist id="saga-list">
            {sagas.map((s) => (
              <option key={s} value={s} />
            ))}
          </datalist>
        </Field>
        <Field label={t('game.year')}>
          <NumberInput step={1} value={draft.year} onChange={(year) => patch({ year })} />
        </Field>
      </div>
      <Field label={t('game.orientation')}>
        <Segmented
          size="sm"
          value={draft.orientation}
          onChange={(orientation) => patch({ orientation })}
          options={orientations.map((o) => ({ value: o, label: t(`orientation.${o}`) }))}
        />
      </Field>
      <Field label={t('game.color')}>
        <div className="flex items-center gap-3">
          <input
            type="color"
            className="h-9 w-12 cursor-pointer rounded-md border border-line bg-transparent"
            value={draft.color ?? autoColor(draft.name || '?')}
            onChange={(e) => patch({ color: e.target.value })}
          />
          {draft.color && (
            <Button variant="ghost" onClick={() => patch({ color: undefined })}>
              {t('game.autoColor')}
            </Button>
          )}
        </div>
      </Field>
      {error && <p className="text-sm text-danger">{t('game.invalid')}</p>}
      <div className="flex items-center gap-2 pt-1">
        {onDelete && (
          <Button variant="danger" onClick={onDelete}>
            {t('game.delete')}
          </Button>
        )}
        <span className="flex-1" />
        <Button variant="ghost" onClick={onCancel}>
          {t('game.cancel')}
        </Button>
        <Button variant="primary" type="submit">
          {t('game.save')}
        </Button>
      </div>
    </form>
  )
}
