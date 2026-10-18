import { ChevronDown, ExternalLink, X } from 'lucide-react'
import { useMemo, useState, type FormEvent, type KeyboardEvent } from 'react'
import { bggVersionsUrl } from '../../domain/bgg'
import { autoColor } from '../../domain/color'
import { dimsSourceAfterEdit } from '../../domain/sizes'
import type { BoxDimensions, Game, GameOrientation } from '../../domain/types'
import { validateGame, type GameError } from '../../domain/validation'
import { useT } from '../../i18n'
import { useAppStore } from '../../store/appStore'
import { zoneName } from '../labels'
import { cx, inputClass } from '../styles'
import { Button, Field, NumberInput, Segmented, Toggle } from '../ui'

export type GameDraft = Omit<Game, 'id' | 'createdAt'>

const emptyDraft: GameDraft = { name: '', orientation: 'inherit' }

/** Values already used in the collection, offered while typing. */
export type Suggestions = Record<'genre' | 'designer' | 'publisher' | 'language', string[]>

function TextWithSuggestions({
  id,
  value,
  options,
  onChange,
}: {
  id: string
  value?: string
  options: string[]
  onChange: (v?: string) => void
}) {
  return (
    <>
      <input className={inputClass} list={id} value={value ?? ''} onChange={(e) => onChange(e.target.value || undefined)} />
      <datalist id={id}>
        {options.map((o) => (
          <option key={o} value={o} />
        ))}
      </datalist>
    </>
  )
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

/** Free labels typed one by one; Enter or a comma adds the label being typed. */
function TagInput({ value, onChange, options }: { value: string[]; onChange: (tags: string[]) => void; options: string[] }) {
  const t = useT()
  const [text, setText] = useState('')
  const add = () => {
    const tag = text.trim().replace(/,$/, '').trim()
    if (tag && !value.some((v) => v.toLowerCase() === tag.toLowerCase())) onChange([...value, tag])
    setText('')
  }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      add()
    } else if (e.key === 'Backspace' && !text && value.length > 0) onChange(value.slice(0, -1))
  }
  return (
    <div className={cx(inputClass, 'flex flex-wrap items-center gap-1 py-1.5')}>
      {value.map((tag) => (
        <span key={tag} className="inline-flex items-center gap-0.5 rounded-md bg-surface-3 py-0.5 pr-0.5 pl-1.5 text-xs">
          {tag}
          <button
            type="button"
            className="rounded p-0.5 text-ink-faint hover:text-ink"
            aria-label={t('game.removeTag', { tag })}
            title={t('game.removeTag', { tag })}
            onClick={() => onChange(value.filter((v) => v !== tag))}
          >
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        className="min-w-24 flex-1 bg-transparent text-sm outline-none"
        list="tag-list"
        placeholder={value.length === 0 ? t('game.tagsPlaceholder') : undefined}
        aria-label={t('game.tags')}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={add}
      />
      <datalist id="tag-list">
        {options
          .filter((o) => !value.includes(o))
          .map((o) => (
            <option key={o} value={o} />
          ))}
      </datalist>
    </div>
  )
}

type ZoneChoice = 'auto' | 'in' | 'out'

export function GameEditor({
  initial,
  sagas,
  detectedSaga,
  suggestions,
  onSave,
  onCancel,
  onDelete,
}: {
  initial?: Game
  sagas: string[]
  /** Saga found from the title, shown while the field is empty. */
  detectedSaga?: string
  suggestions: Suggestions
  onSave: (draft: GameDraft) => void
  onCancel: () => void
  onDelete?: () => void
}) {
  const t = useT()
  const zones = useAppStore((s) => s.zones)
  const games = useAppStore((s) => s.games)
  const tagOptions = useMemo(() => [...new Set(games.flatMap((g) => g.tags ?? []))].sort(collator.compare), [games])
  const [draft, setDraft] = useState<GameDraft>(initial ?? emptyDraft)
  const [dims, setDims] = useState<Partial<BoxDimensions>>(initial?.dims ?? {})
  const [error, setError] = useState<GameError>()
  const patch = (p: Partial<GameDraft>) => setDraft((d) => ({ ...d, ...p }))
  const setDim = (key: keyof BoxDimensions) => (v: number | undefined) => setDims((d) => ({ ...d, [key]: v }))
  const zoneChoice = (id: string): ZoneChoice => {
    const v = draft.zones?.[id]
    return v === undefined ? 'auto' : v ? 'in' : 'out'
  }
  const setZoneChoice = (id: string, choice: ZoneChoice) => {
    const { [id]: _, ...rest } = draft.zones ?? {}
    const next = choice === 'auto' ? rest : { ...rest, [id]: choice === 'in' }
    patch({ zones: Object.keys(next).length ? next : undefined })
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const problem = validateGame({ ...draft, dims })
    setError(problem)
    if (problem) return
    const filled = [dims.width, dims.height, dims.depth].filter((v) => v !== undefined)
    const newDims = filled.length === 3 ? (dims as BoxDimensions) : undefined
    onSave({
      ...draft,
      name: draft.name.trim(),
      saga: draft.saga?.trim() || undefined,
      dims: newDims,
      dimsSource: dimsSourceAfterEdit(initial, newDims),
    })
  }

  const orientations: GameOrientation[] = ['inherit', 'vertical', 'horizontal']

  return (
    // noValidate: the browser would reject decimals that are not a multiple of `step`,
    // which only sets the increment of the arrow keys; validateGame checks the values.
    <form noValidate onSubmit={submit} className="space-y-4 rounded-xl border border-line bg-surface-1 p-4">
      <h3 className="font-display text-sm font-semibold">{initial ? t('game.edit') : t('game.new')}</h3>
      <Field label={t('game.name')}>
        <input autoFocus className={inputClass} value={draft.name} onChange={(e) => patch({ name: e.target.value })} />
      </Field>
      {draft.version && <p className="-mt-2 text-xs text-ink-soft">{draft.version}</p>}
      <Field
        label={t('game.dims')}
        hint={
          <>
            {draft.dimsSource && <span className="mr-2">{t(`game.dimsSource.${draft.dimsSource}`)}</span>}
            {draft.bggId && (
              <a
                href={bggVersionsUrl(draft.bggId)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-accent hover:underline"
              >
                {t('game.findOnBgg')} <ExternalLink className="size-3" />
              </a>
            )}
          </>
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
            placeholder={detectedSaga ? t('game.sagaDetected', { saga: detectedSaga }) : t('game.sagaPlaceholder')}
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
      <details className="group rounded-lg border border-line">
        <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-xs font-semibold tracking-wide text-ink-soft uppercase">
          {t('game.details')}
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="grid grid-cols-2 gap-3 px-3 pt-1 pb-3">
          {(['genre', 'designer', 'publisher', 'language'] as const).map((key) => (
            <Field key={key} label={t(`game.${key}`)}>
              <TextWithSuggestions
                id={`suggest-${key}`}
                value={draft[key]}
                options={suggestions[key]}
                onChange={(v) => patch({ [key]: v })}
              />
            </Field>
          ))}
          <Field label={t('game.players')}>
            <div className="flex items-center gap-1.5">
              <NumberInput step={1} min={1} value={draft.minPlayers} onChange={(minPlayers) => patch({ minPlayers })} />
              <span className="text-ink-faint">–</span>
              <NumberInput step={1} min={1} value={draft.maxPlayers} onChange={(maxPlayers) => patch({ maxPlayers })} />
            </div>
          </Field>
          <Field label={t('game.playTime')}>
            <NumberInput step={5} value={draft.playTime} onChange={(playTime) => patch({ playTime })} />
          </Field>
          <Field label={t('game.complexity')}>
            <NumberInput step={0.1} min={1} value={draft.complexity} onChange={(complexity) => patch({ complexity })} />
          </Field>
          <Field label={t('game.rating')}>
            <NumberInput step={0.5} min={1} value={draft.rating} onChange={(rating) => patch({ rating })} />
          </Field>
          <Field label={t('game.plays')}>
            <NumberInput step={1} value={draft.plays} onChange={(plays) => patch({ plays })} />
          </Field>
        </div>
      </details>
      <details
        className="group rounded-lg border border-line"
        open={!!initial?.tags?.length || Object.keys(initial?.zones ?? {}).length > 0}
      >
        <summary className="flex cursor-pointer list-none items-center justify-between px-3 py-2 text-xs font-semibold tracking-wide text-ink-soft uppercase">
          {t('game.zoneAndTags')}
          <ChevronDown className="size-4 transition-transform group-open:rotate-180" />
        </summary>
        <div className="space-y-3 px-3 pt-1 pb-3">
          <Field label={t('game.tags')}>
            <TagInput
              value={draft.tags ?? []}
              options={tagOptions}
              onChange={(tags) => patch({ tags: tags.length ? tags : undefined })}
            />
          </Field>
          {zones.length > 0 && (
            <Field label={t('game.zone')} info={t('game.zonesHint')}>
              <div className="space-y-1.5">
                {zones.map((zone) => (
                  <div key={zone.id} className="flex items-center gap-2">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ background: zone.color }} />
                    <span className="min-w-0 flex-1 truncate text-sm">{zoneName(t, zone)}</span>
                    <div className="w-40 shrink-0">
                      <Segmented<ZoneChoice>
                        size="sm"
                        value={zoneChoice(zone.id)}
                        onChange={(choice) => setZoneChoice(zone.id, choice)}
                        options={(['auto', 'in', 'out'] as const).map((c) => ({ value: c, label: t(`game.zone.${c}`) }))}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Field>
          )}
        </div>
      </details>
      <div>
        <Toggle label={t('game.expansion')} checked={!!draft.expansion} onChange={(expansion) => patch({ expansion })} />
        <Toggle label={t('game.forTrade')} checked={!!draft.forTrade} onChange={(forTrade) => patch({ forTrade })} />
        <Toggle label={t('game.onTop')} checked={!!draft.onTop} onChange={(onTop) => patch({ onTop })} />
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
      {/* Stays in sight at the bottom of the panel while the long form scrolls. */}
      <div className="sticky bottom-0 -mx-4 -mb-4 space-y-2 rounded-b-xl border-t border-line bg-surface-1/95 px-4 py-3 backdrop-blur">
        {error && (
          <p className="text-sm text-danger" role="alert">
            {t(`game.error.${error}`)}
          </p>
        )}
        <div className="flex items-center gap-2">
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
      </div>
    </form>
  )
}
