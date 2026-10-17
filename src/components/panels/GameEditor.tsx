import { ExternalLink } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { bggVersionsUrl } from '../../domain/bgg'
import { autoColor } from '../../domain/color'
import type { BoxDimensions, Game, GameOrientation } from '../../domain/types'
import { useT } from '../../i18n'
import { inputClass } from '../styles'
import { Button, Field, NumberInput, Segmented, Toggle } from '../ui'

export type GameDraft = Omit<Game, 'id' | 'createdAt'>

const emptyDraft: GameDraft = { name: '', orientation: 'inherit' }

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
  const [dims, setDims] = useState<Partial<BoxDimensions>>(initial?.dims ?? {})
  const [error, setError] = useState(false)
  const patch = (p: Partial<GameDraft>) => setDraft((d) => ({ ...d, ...p }))
  const setDim = (key: keyof BoxDimensions) => (v: number | undefined) => setDims((d) => ({ ...d, [key]: v }))

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const values = [dims.width, dims.height, dims.depth]
    const filled = values.filter((v) => v !== undefined)
    // Sizes are optional, but when given they must be complete and positive.
    const dimsValid = filled.length === 0 || (filled.length === 3 && values.every((v) => v! > 0))
    if (!draft.name.trim() || !dimsValid) {
      setError(true)
      return
    }
    onSave({
      ...draft,
      name: draft.name.trim(),
      saga: draft.saga?.trim() || undefined,
      dims: filled.length === 3 ? (dims as BoxDimensions) : undefined,
    })
  }

  const orientations: GameOrientation[] = ['inherit', 'vertical', 'horizontal']

  return (
    <form onSubmit={submit} className="space-y-4 rounded-xl border border-line bg-surface-1 p-4">
      <h3 className="font-display text-sm font-semibold">{initial ? t('game.edit') : t('game.new')}</h3>
      <Field label={t('game.name')}>
        <input autoFocus className={inputClass} value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
      </Field>
      {draft.version && <p className="-mt-2 text-xs text-ink-soft">{draft.version}</p>}
      <Field
        label={t('game.dims')}
        hint={
          draft.bggId && (
            <a
              href={bggVersionsUrl(draft.bggId)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-accent hover:underline"
            >
              {t('game.findOnBgg')} <ExternalLink className="size-3" />
            </a>
          )
        }
      >
        <div className="grid grid-cols-3 gap-2">
          <NumberInput aria-label={t('game.width')} placeholder={t('game.width')} value={dims.width} onChange={setDim('width')} />
          <NumberInput
            aria-label={t('game.height')}
            placeholder={t('game.height')}
            value={dims.height}
            onChange={setDim('height')}
          />
          <NumberInput aria-label={t('game.depth')} placeholder={t('game.depth')} value={dims.depth} onChange={setDim('depth')} />
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
      <div>
        <Toggle label={t('game.expansion')} checked={!!draft.expansion} onChange={(expansion) => patch({ expansion })} />
        <Toggle label={t('game.excluded')} checked={!!draft.excluded} onChange={(excluded) => patch({ excluded })} />
      </div>
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
