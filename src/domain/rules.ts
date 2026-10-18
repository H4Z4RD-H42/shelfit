import { packCollection } from './packer'
import type { Game, Layout, PackOptions, RuleId, ShelfUnit, Zone } from './types'

/** Whether the options ask for the rule; `allIn` always holds its place. */
export function isActive(rule: RuleId, o: PackOptions): boolean {
  const ordered = o.strategy === 'ordered'
  switch (rule) {
    case 'allIn':
      return true
    case 'strictOrder':
      return ordered && !o.fillGaps
    case 'sagaInCube':
      return ordered && o.groupSagas && o.keepSagasInCube
    case 'sagaInLine':
      return ordered && o.groupSagas && o.keepSagasInLine
    case 'groupCube':
      return ordered && o.groupBy.length > 0 && o.groupStartsNewCube
    case 'orientation':
      return o.orientation !== 'auto'
    case 'longSideFront':
      return o.longSideFront
    case 'stackHeight':
      return o.maxStackHeight > 0
  }
}

/** The options without the rule. */
export function relax(o: PackOptions, rule: RuleId): PackOptions {
  switch (rule) {
    case 'allIn':
      return o
    case 'strictOrder':
      return { ...o, fillGaps: true }
    case 'sagaInCube':
      return { ...o, keepSagasInCube: false }
    case 'sagaInLine':
      return { ...o, keepSagasInLine: false }
    case 'groupCube':
      return { ...o, groupStartsNewCube: false }
    case 'orientation':
      return { ...o, orientation: 'auto' }
    case 'longSideFront':
      return { ...o, longSideFront: false }
    case 'stackHeight':
      return { ...o, maxStackHeight: 0 }
  }
}

/** Games left out for want of room: the only ones giving up a rule can bring in. */
export function missing(layout: Layout): number {
  return layout.unplaced.filter((u) => u.reason === 'no-space' || u.reason === 'zone-full').length
}

/** Active rules below `allIn`, most important first: the ones the engine may give up. */
export function negotiable(options: PackOptions): RuleId[] {
  const order = options.priorities
  return order.slice(order.indexOf('allIn') + 1).filter((r) => isActive(r, options))
}

/**
 * Packs the collection as asked, or, when games are left out for want of
 * room, gives up the least important rules that keep them out. The fewest
 * games left out is what giving up every negotiable rule achieves; then each
 * rule, from the most important, is kept if that number does not grow.
 */
export function planLayout(games: Game[], units: ShelfUnit[], options: PackOptions, zones: Zone[] = []): Layout {
  const asked = packCollection(games, units, options, zones)
  const rules = negotiable(options)
  if (missing(asked) === 0 || rules.length === 0) return asked

  const pack = (given: RuleId[]) => packCollection(games, units, given.reduce(relax, options), zones)
  let best = pack(rules)
  const fewest = missing(best)
  if (fewest >= missing(asked)) return asked

  let given = rules
  for (const rule of rules) {
    const kept = given.filter((r) => r !== rule)
    const layout = pack(kept)
    if (missing(layout) <= fewest) {
      given = kept
      best = layout
    }
  }
  return { ...best, relaxed: given }
}

export interface RuleCost {
  rule: RuleId
  /** Cubes giving up the rule would free (negative: it would take more). */
  cubes: number
  /** Games giving up the rule would bring onto the shelves. */
  games: number
}

/** What each rule the layout keeps costs, compared with the same layout without it. */
export function ruleCosts(games: Game[], units: ShelfUnit[], options: PackOptions, zones: Zone[], layout: Layout): RuleCost[] {
  const applied = layout.relaxed.reduce(relax, options)
  return options.priorities
    .filter((r) => r !== 'allIn' && isActive(r, options) && !layout.relaxed.includes(r))
    .map((rule) => {
      const without = packCollection(games, units, relax(applied, rule), zones)
      return {
        rule,
        cubes: layout.stats.usedCubes - without.stats.usedCubes,
        games: missing(layout) - missing(without),
      }
    })
}
