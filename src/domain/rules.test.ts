import { describe, expect, it } from 'vitest'
import { DEFAULT_OPTIONS, RULES, normalizePriorities } from './defaults'
import { goalOf, missing, negotiable, planLayout, ruleCosts, withGoal } from './rules'
import type { Game, PackOptions, RuleId, ShelfUnit } from './types'

let seq = 0
const game = (name: string, w: number, h: number, d: number): Game => ({
  id: `g${++seq}`,
  name,
  dims: { width: w, height: h, depth: d },
  orientation: 'inherit',
  createdAt: seq,
})

const unit = (columns: number, rows: number): ShelfUnit => ({ id: 'u', name: 'U', columns, rows, color: '#fff' })
const opts = (o: Partial<PackOptions> = {}): PackOptions => ({ ...DEFAULT_OPTIONS, ...o })
/** The default priorities with `rule` moved just above `allIn`. */
const aboveAllIn = (rule: RuleId): RuleId[] => [rule, ...RULES.filter((r) => r !== rule)]

// A cube takes five of these standing, or a stack of five plus one standing.
const six = () => Array.from({ length: 6 }, (_, i) => game(`Box ${i}`, 30, 22, 6))
// Two of these never share a cube; the small one fits beside either.
const bigAndSmall = () => [game('A', 30, 30, 18), game('B', 30, 30, 18), game('C', 30, 30, 18), game('Z', 30, 22, 6)]

describe('planLayout', () => {
  it('keeps every rule when everything fits', () => {
    const layout = planLayout(six(), [unit(2, 1)], opts({ orientation: 'vertical' }))
    expect(missing(layout)).toBe(0)
    expect(layout.relaxed).toEqual([])
  })

  it('gives up a rule that keeps games off the shelves', () => {
    const layout = planLayout(six(), [unit(1, 1)], opts({ orientation: 'vertical' }))
    expect(layout.stats.placedGames).toBe(6)
    expect(layout.relaxed).toEqual(['orientation'])
  })

  it('never gives up the rules placed above every game on the shelves', () => {
    const layout = planLayout(six(), [unit(1, 1)], opts({ orientation: 'vertical', priorities: aboveAllIn('orientation') }))
    expect(missing(layout)).toBe(1)
    expect(layout.relaxed).toEqual([])
  })

  it('keeps the more important rules when giving up a lesser one is enough', () => {
    // Strict order leaves A alone in the first cube; filling the gap with Z frees room for one more.
    const layout = planLayout(bigAndSmall(), [unit(2, 1)], opts({ orientation: 'vertical' }))
    expect(missing(layout)).toBe(1)
    expect(layout.relaxed).toEqual(['strictOrder'])
  })

  it('gives up nothing when no rule brings a game in', () => {
    const games = Array.from({ length: 5 }, (_, i) => game(`G${i}`, 30, 30, 18))
    const layout = planLayout(games, [unit(2, 1)], opts({ orientation: 'vertical' }))
    expect(missing(layout)).toBe(3)
    expect(layout.relaxed).toEqual([])
  })
})

describe('ruleCosts', () => {
  it('tells the cubes and games each kept rule costs', () => {
    const games = six()
    const options = opts({ orientation: 'vertical' })
    const layout = planLayout(games, [unit(2, 1)], options)
    expect(ruleCosts(games, [unit(2, 1)], options, [], layout)).toEqual([
      { rule: 'orientation', cubes: 1, games: 0 },
      { rule: 'sagaInCube', cubes: 0, games: 0 },
      { rule: 'strictOrder', cubes: 0, games: 0 },
    ])
  })

  it('leaves out the rules already given up', () => {
    const games = six()
    const options = opts({ orientation: 'vertical' })
    const layout = planLayout(games, [unit(1, 1)], options)
    expect(ruleCosts(games, [unit(1, 1)], options, [], layout).map((c) => c.rule)).toEqual(['sagaInCube', 'strictOrder'])
  })
})

describe('negotiable', () => {
  it('lists the active rules below every game on the shelves', () => {
    expect(negotiable(DEFAULT_OPTIONS)).toEqual(['sagaInCube', 'strictOrder'])
    expect(negotiable(opts({ fillGaps: true, keepSagasInLine: true }))).toEqual(['sagaInLine', 'sagaInCube'])
    expect(negotiable(opts({ strategy: 'compact', maxStackHeight: 20 }))).toEqual(['stackHeight'])
    expect(negotiable(opts({ priorities: aboveAllIn('strictOrder') }))).toEqual(['sagaInCube'])
  })
})

describe('goals', () => {
  it('reads the goal from the strategy and the place of every game on the shelves', () => {
    expect(goalOf(DEFAULT_OPTIONS)).toBe('balanced')
    expect(goalOf(opts({ strategy: 'compact' }))).toBe('space')
    expect(goalOf(opts({ priorities: [...RULES.slice(1), 'allIn'] }))).toBe('order')
    expect(goalOf(opts({ priorities: aboveAllIn('strictOrder') }))).toBe('custom')
  })

  it('moves every game on the shelves first or last, keeping the order of the rules', () => {
    const custom = opts({ strategy: 'compact', priorities: aboveAllIn('strictOrder') })
    const rest = RULES.filter((r) => r !== 'allIn' && r !== 'strictOrder')
    expect(withGoal(custom, 'balanced')).toEqual({ strategy: 'ordered', priorities: ['allIn', 'strictOrder', ...rest] })
    expect(withGoal(custom, 'order')).toEqual({ strategy: 'ordered', priorities: ['strictOrder', ...rest, 'allIn'] })
    expect(withGoal(custom, 'space')).toEqual({ strategy: 'compact' })
  })

  it('never gives up a rule with the order goal', () => {
    const options = opts({ orientation: 'vertical' })
    const layout = planLayout(six(), [unit(1, 1)], { ...options, ...withGoal(options, 'order') })
    expect(missing(layout)).toBe(1)
    expect(layout.relaxed).toEqual([])
  })
})

describe('normalizePriorities', () => {
  it('drops unknown and repeated rules and appends the missing ones', () => {
    const saved = ['strictOrder', 'allIn', 'bogus', 'strictOrder'] as RuleId[]
    expect(normalizePriorities(saved)).toEqual([
      'strictOrder',
      'allIn',
      ...RULES.filter((r) => r !== 'strictOrder' && r !== 'allIn'),
    ])
    expect(normalizePriorities(undefined)).toEqual(RULES)
  })
})
