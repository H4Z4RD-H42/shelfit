import { ChevronDown, ChevronUp, Lock } from 'lucide-react'
import { isActive, missing } from '../../domain/rules'
import type { RuleId } from '../../domain/types'
import { useInsights, useLayout } from '../../hooks/useLayout'
import { useT } from '../../i18n'
import { useAppStore } from '../../store/appStore'
import { ruleName } from '../labels'
import { cx } from '../styles'
import { Button, Rich } from '../ui'

/**
 * The active rules in order of importance, with "every game on the shelves"
 * among them: when room runs out the engine gives up rules from the bottom,
 * never the ones above that line. Each row tells what the rule costs.
 */
export function PrioritiesSection() {
  const t = useT()
  const options = useAppStore((s) => s.options)
  const setOptions = useAppStore((s) => s.setOptions)
  const layout = useLayout()
  const { costs } = useInsights()
  const items = options.priorities.filter((r) => isActive(r, options))
  const line = items.indexOf('allIn')
  const out = missing(layout)

  // Swaps the rule with its visible neighbour; inactive rules keep their place.
  const move = (rule: RuleId, delta: -1 | 1) => {
    const other = items[items.indexOf(rule) + delta]
    if (!other) return
    const list = options.priorities.slice()
    const i = list.indexOf(rule)
    const j = list.indexOf(other)
    ;[list[i], list[j]] = [list[j]!, list[i]!]
    setOptions({ priorities: list })
  }

  const status = (rule: RuleId): { text: string; tone?: 'danger' | 'warn' } => {
    if (rule === 'allIn')
      return out === 0
        ? { text: t('rule.status.kept') }
        : { text: t(out === 1 ? 'rule.status.out.one' : 'rule.status.out.other', { count: out }), tone: 'danger' }
    if (layout.relaxed.includes(rule)) return { text: t('rule.status.relaxed'), tone: 'warn' }
    const cost = costs.find((c) => c.rule === rule)
    if (cost && cost.games > 0)
      return {
        text: t(cost.games === 1 ? 'rule.cost.games.one' : 'rule.cost.games.other', { count: cost.games }),
        tone: 'danger',
      }
    if (cost && cost.cubes > 0)
      return { text: t(cost.cubes === 1 ? 'rule.cost.cubes.one' : 'rule.cost.cubes.other', { count: cost.cubes }) }
    return { text: t('rule.cost.free') }
  }

  return (
    <>
      <p className="text-xs text-ink-soft">
        <Rich text={t('priorities.hint')} />
      </p>
      <ol className="space-y-1.5">
        {items.map((rule, index) => {
          const relaxed = layout.relaxed.includes(rule)
          const { text, tone } = status(rule)
          return (
            <li
              key={rule}
              className={cx(
                'flex items-center gap-2.5 rounded-lg border py-1.5 pr-1 pl-3',
                rule === 'allIn' ? 'border-accent/60 bg-accent/10' : 'border-line bg-surface-1',
              )}
            >
              <span className="w-3 shrink-0 text-xs text-ink-faint tabular-nums">{index + 1}</span>
              <div className="min-w-0 flex-1">
                <p
                  className={cx(
                    'flex items-center gap-1.5 text-sm',
                    rule === 'allIn' && 'font-semibold',
                    relaxed && 'text-ink-soft line-through decoration-warn',
                  )}
                >
                  <span className="truncate">{ruleName(t, rule, options)}</span>
                  {index < line && (
                    <span title={t('rule.locked')} className="shrink-0 text-ink-faint">
                      <Lock className="size-3" aria-label={t('rule.locked')} />
                    </span>
                  )}
                </p>
                <p
                  className={cx(
                    'text-xs',
                    tone === 'danger' ? 'text-danger' : tone === 'warn' ? 'font-medium text-warn' : 'text-ink-faint',
                  )}
                >
                  {text}
                </p>
              </div>
              <div className="flex shrink-0 flex-col">
                <Button
                  variant="ghost"
                  className="px-2.5 py-1"
                  disabled={index === 0}
                  onClick={() => move(rule, -1)}
                  aria-label={t('rule.moveUp')}
                  title={t('rule.moveUp')}
                >
                  <ChevronUp className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  className="px-2.5 py-1"
                  disabled={index === items.length - 1}
                  onClick={() => move(rule, 1)}
                  aria-label={t('rule.moveDown')}
                  title={t('rule.moveDown')}
                >
                  <ChevronDown className="size-4" />
                </Button>
              </div>
            </li>
          )
        })}
      </ol>
      <p className="text-xs text-ink-faint">
        <Rich text={t(items.length > 1 ? 'priorities.inactive' : 'priorities.empty')} />
      </p>
    </>
  )
}
