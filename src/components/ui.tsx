import { Info } from 'lucide-react'
import { Fragment, useId, useState, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { useT } from '../i18n'
import { cx, inputClass } from './styles'

// **Keywords** and the names of buttons and options, quoted «like this» or “like this”.
const EMPHASIS = /\*\*(.+?)\*\*|«(.+?)»|“(.+?)”/g

/** Explanation text with its keywords and quoted option names in bold. */
export function Rich({ text }: { text: string }) {
  const parts: ReactNode[] = []
  let last = 0
  for (const m of text.matchAll(EMPHASIS)) {
    const [whole, plain, it, en] = m
    const strong = <strong className="font-semibold text-ink">{plain ?? it ?? en}</strong>
    parts.push(
      text.slice(last, m.index),
      <Fragment key={m.index}>{plain !== undefined ? strong : [whole[0], strong, whole.at(-1)]}</Fragment>,
    )
    last = m.index + whole.length
  }
  parts.push(text.slice(last))
  return <>{parts}</>
}

const rich = (node: ReactNode) => (typeof node === 'string' ? <Rich text={node} /> : node)

type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'subtle'

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-accent-ink hover:bg-accent-strong shadow-sm shadow-accent/30',
  subtle: 'bg-surface-2 text-ink hover:bg-surface-3 border border-line',
  ghost: 'text-ink-soft hover:text-ink hover:bg-surface-2',
  danger: 'text-danger hover:bg-danger/10',
}

export function Button({
  variant = 'subtle',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
        'disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-accent',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
  disabled,
}: {
  value: T
  options: { value: T; label: ReactNode; title?: string }[]
  onChange: (value: T) => void
  size?: 'sm' | 'md'
  disabled?: boolean
}) {
  return (
    <div
      role="radiogroup"
      aria-disabled={disabled}
      className={cx('flex rounded-lg border border-line bg-surface-2 p-0.5', disabled && 'opacity-40')}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          disabled={disabled}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={cx(
            'flex flex-1 items-center justify-center gap-1.5 rounded-md font-medium transition-all',
            size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm',
            o.value === value ? 'bg-surface-0 text-ink shadow-sm' : 'text-ink-soft hover:text-ink',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Small "i" button that reveals an explanation. */
export function InfoButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  const t = useT()
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={open}
      aria-label={t('options.info')}
      title={t('options.info')}
      className={cx(
        'inline-flex size-5 shrink-0 items-center justify-center rounded-full transition-colors',
        open ? 'bg-accent/15 text-accent' : 'text-ink-faint hover:bg-surface-2 hover:text-ink',
      )}
    >
      <Info className="size-3.5" />
    </button>
  )
}

/** Animates the height of its content between 0 and auto. */
export function Reveal({ open, children }: { open: boolean; children: ReactNode }) {
  return (
    <div
      className={cx('grid transition-[grid-template-rows] duration-200 ease-out', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}
      aria-hidden={!open}
    >
      <div className="overflow-hidden">{children}</div>
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: ReactNode
  /** Explanation shown on demand, behind an info button. */
  hint?: ReactNode
  disabled?: boolean
}) {
  const id = useId()
  const [showHint, setShowHint] = useState(false)
  return (
    <div className={cx('py-1.5', disabled && 'opacity-40')}>
      <div className="flex items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-1 text-sm">
          <label htmlFor={id} className={cx(!disabled && 'cursor-pointer')}>
            {label}
          </label>
          {hint && <InfoButton open={showHint} onClick={() => setShowHint((v) => !v)} />}
        </span>
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={cx('relative h-5 w-9 shrink-0 rounded-full transition-colors', checked ? 'bg-accent' : 'bg-surface-3')}
        >
          <span
            className={cx(
              'absolute top-0.5 left-0.5 size-4 rounded-full bg-white shadow transition-transform',
              checked && 'translate-x-4',
            )}
          />
        </button>
      </div>
      {hint && (
        <Reveal open={showHint}>
          <p className="pt-1 pr-12 text-xs text-ink-soft">{rich(hint)}</p>
        </Reveal>
      )}
    </div>
  )
}

export function Field({
  label,
  children,
  hint,
  info,
}: {
  label: ReactNode
  children: ReactNode
  /** Always visible note under the control. */
  hint?: ReactNode
  /** Explanation shown on demand, behind an info button. */
  info?: ReactNode
}) {
  const [showInfo, setShowInfo] = useState(false)
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        <span className="text-xs font-semibold tracking-wide text-ink-soft uppercase">{label}</span>
        {info && <InfoButton open={showInfo} onClick={() => setShowInfo((v) => !v)} />}
      </div>
      {info && (
        <Reveal open={showInfo}>
          <p className="pb-1 text-xs text-ink-soft">{rich(info)}</p>
        </Reveal>
      )}
      {children}
      {hint && <p className="text-xs text-ink-faint">{rich(hint)}</p>}
    </div>
  )
}

export function NumberInput({
  value,
  onChange,
  min = 0,
  step = 0.5,
  className,
  ...rest
}: {
  value: number | undefined
  onChange: (value: number | undefined) => void
  min?: number
  step?: number
  className?: string
  'aria-label'?: string
  placeholder?: string
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      min={min}
      step={step}
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
      className={cx(inputClass, 'tabular-nums', className)}
      {...rest}
    />
  )
}

export function Section({ title, children, action }: { title: ReactNode; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="space-y-3 border-b border-line px-5 py-4 last:border-b-0">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm font-semibold text-ink">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  )
}

/** Slider with two handles choosing a range between `min` and `max`. */
export function RangeSlider({
  min,
  max,
  step,
  value,
  onChange,
  label,
}: {
  min: number
  max: number
  step: number
  value: [number, number]
  onChange: (value: [number, number]) => void
  label: string
}) {
  const [lo, hi] = value
  const pct = (v: number) => (max > min ? ((v - min) / (max - min)) * 100 : 0)
  const common = { type: 'range', min, max, step, className: 'range-thumb' } as const
  return (
    <div className="relative h-5">
      {/* The fill is inset by half a handle, like the travel of the native handles. */}
      <div className="absolute inset-x-2 top-1/2 h-1 -translate-y-1/2 rounded-full bg-surface-3">
        <div className="absolute h-full rounded-full bg-accent" style={{ left: `${pct(lo)}%`, right: `${100 - pct(hi)}%` }} />
      </div>
      <input
        {...common}
        value={lo}
        aria-label={`${label} (min)`}
        // When both handles meet at the top, the lower one must stay reachable.
        style={{ zIndex: lo >= hi && lo > (min + max) / 2 ? 2 : 1 }}
        onChange={(e) => onChange([Math.min(Number(e.target.value), hi), hi])}
      />
      <input
        {...common}
        value={hi}
        aria-label={`${label} (max)`}
        onChange={(e) => onChange([lo, Math.max(Number(e.target.value), lo)])}
      />
    </div>
  )
}
