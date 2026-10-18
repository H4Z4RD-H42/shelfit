import { useMemo } from 'react'
import { missing, planLayout, ruleCosts, type RuleCost } from '../domain/rules'
import type { Game, Layout, PackOptions, ShelfUnit, Zone } from '../domain/types'
import { useAppStore } from '../store/appStore'

type Inputs = [Game[], ShelfUnit[], PackOptions, Zone[]]

/**
 * Remembers the result for the last inputs, so the many components showing
 * the layout share one computation instead of packing once each.
 */
function lastResult<T>(compute: (...inputs: Inputs) => T) {
  let last: { inputs: Inputs; result: T } | undefined
  return (...inputs: Inputs): T => {
    if (!last || last.inputs.some((v, i) => v !== inputs[i])) last = { inputs, result: compute(...inputs) }
    return last.result
  }
}

const plan = lastResult((games, units, options, zones) => planLayout(games, units, options, zones))

function useInputs(): Inputs {
  const games = useAppStore((s) => s.games)
  const units = useAppStore((s) => s.units)
  const options = useAppStore((s) => s.options)
  const zones = useAppStore((s) => s.zones)
  return useMemo(() => [games, units, options, zones], [games, units, options, zones])
}

export function useLayout(): Layout {
  const inputs = useInputs()
  return useMemo(() => plan(...inputs), [inputs])
}

export interface Insights {
  costs: RuleCost[]
  /** The same collection packed with the other strategy. */
  other: { usedCubes: number; missing: number }
}

const insights = lastResult((games, units, options, zones): Insights => {
  const layout = plan(games, units, options, zones)
  const strategy = options.strategy === 'ordered' ? 'compact' : 'ordered'
  const other = planLayout(games, units, { ...options, strategy }, zones)
  return {
    costs: ruleCosts(games, units, options, zones, layout),
    other: { usedCubes: other.stats.usedCubes, missing: missing(other) },
  }
})

/** What the rules cost and what the other strategy would do; extra packing, so only for the options panel. */
export function useInsights(): Insights {
  const inputs = useInputs()
  return useMemo(() => insights(...inputs), [inputs])
}

export function useGamesById(): Map<string, Game> {
  const games = useAppStore((s) => s.games)
  return useMemo(() => new Map(games.map((g) => [g.id, g])), [games])
}
