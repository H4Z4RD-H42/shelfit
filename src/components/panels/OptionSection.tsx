import { ChevronDown, RotateCcw } from 'lucide-react'
import { useId, type ReactNode } from 'react'
import { useT } from '../../i18n'
import { cx } from '../styles'
import { Reveal } from '../ui'

/**
 * Collapsible group of options. The header always shows a one-line summary of
 * the current values, so the whole panel can be read without opening it.
 */
export function OptionSection({
  icon,
  title,
  summary,
  open,
  onToggle,
  modified,
  onReset,
  children,
}: {
  icon: ReactNode
  title: string
  summary: string
  open: boolean
  onToggle: () => void
  /** Some value differs from the defaults. */
  modified: boolean
  onReset: () => void
  children: ReactNode
}) {
  const t = useT()
  const bodyId = useId()
  return (
    <section className="border-b border-line">
      <div className="flex items-center gap-1 pr-3">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={bodyId}
          className="flex min-w-0 flex-1 items-center gap-3 px-5 py-3.5 text-left transition-colors hover:bg-surface-1"
        >
          <span
            className={cx(
              'flex size-8 shrink-0 items-center justify-center rounded-lg transition-colors',
              open ? 'bg-accent/15 text-accent' : 'bg-surface-2 text-ink-soft',
            )}
          >
            {icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className="font-display text-sm font-semibold">{title}</span>
              {modified && <span className="size-1.5 rounded-full bg-accent" title={t('options.modified')} />}
            </span>
            <span className="block truncate text-xs text-ink-soft">{summary}</span>
          </span>
          <ChevronDown className={cx('size-4 shrink-0 text-ink-faint transition-transform', open && 'rotate-180')} />
        </button>
        {modified && open && (
          <button
            type="button"
            onClick={onReset}
            title={t('options.resetSection')}
            aria-label={t('options.resetSection')}
            className="flex size-7 shrink-0 items-center justify-center rounded-md text-ink-faint hover:bg-surface-2 hover:text-ink"
          >
            <RotateCcw className="size-3.5" />
          </button>
        )}
      </div>
      <Reveal open={open}>
        <div id={bodyId} className="space-y-4 px-5 pt-1 pb-5">
          {children}
        </div>
      </Reveal>
    </section>
  )
}
