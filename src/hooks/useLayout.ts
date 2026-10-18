import { useEffect, useMemo, useState } from 'react'
import { freeRoom, type FreeRoom } from '../domain/room'
import { goalOf, missing, planLayout, ruleCosts, withGoal, type Goal, type RuleCost } from '../domain/rules'
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

export interface Outcome {
  usedCubes: number
  missing: number
}

export interface Insights {
  costs: RuleCost[]
  /** The same collection packed for each of the other goals. */
  goals: Record<Exclude<Goal, 'custom'>, Outcome>
}

const insights = lastResult((games, units, options, zones): Insights => {
  const layout = plan(games, units, options, zones)
  const outcome = (goal: Exclude<Goal, 'custom'>): Outcome => {
    const other = goal === goalOf(options) ? layout : planLayout(games, units, { ...options, ...withGoal(options, goal) }, zones)
    return { usedCubes: other.stats.usedCubes, missing: missing(other) }
  }
  return {
    costs: ruleCosts(games, units, options, zones, layout),
    goals: { order: outcome('order'), balanced: outcome('balanced'), space: outcome('space') },
  }
})

/** What the rules cost and what the other goals would do; extra packing, so only for the options panel. */
export function useInsights(): Insights {
  const inputs = useInputs()
  return useMemo(() => insights(...inputs), [inputs])
}

const room = lastResult((games, units, options, zones) =>
  freeRoom(games, units, options, zones, plan(games, units, options, zones)),
)

/**
 * Room left on the shelves, in standard boxes. Packs the collection again, so
 * it is worked out once the layout is on screen; meanwhile the last value shows.
 */
export function useRoom(): FreeRoom | undefined {
  const inputs = useInputs()
  const [result, setResult] = useState<FreeRoom>()
  useEffect(() => {
    const timer = setTimeout(() => setResult(room(...inputs)), 0)
    return () => clearTimeout(timer)
  }, [inputs])
  return result
}

export function useGamesById(): Map<string, Game> {
  const games = useAppStore((s) => s.games)
  return useMemo(() => new Map(games.map((g) => [g.id, g])), [games])
}
