import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cx, inputClass } from './styles'

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
}: {
  value: T
  options: { value: T; label: ReactNode; title?: string }[]
  onChange: (value: T) => void
  size?: 'sm' | 'md'
}) {
  return (
    <div role="radiogroup" className="flex rounded-lg border border-line bg-surface-2 p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
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

export function Toggle({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: ReactNode
  disabled?: boolean
}) {
  return (
    <label
      className={cx(
        'flex cursor-pointer items-center justify-between gap-3 py-1.5 text-sm',
        disabled && 'cursor-default opacity-40',
      )}
    >
      <span>{label}</span>
      <button
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
    </label>
  )
}

export function Field({ label, children, hint }: { label: ReactNode; children: ReactNode; hint?: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold tracking-wide text-ink-soft uppercase">{label}</span>
      {children}
      {hint && <p className="text-xs text-ink-faint">{hint}</p>}
    </label>
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
