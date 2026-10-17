import { describe, expect, it } from 'vitest'
import {
  EMPTY_LENS,
  HEAT_RAMP,
  NO_DATA_COLOR,
  OTHER_COLOR,
  VALUE_COLORS,
  activeFilters,
  boundsOf,
  heatColor,
  heatScale,
  matchesLens,
  numberOf,
  paintLens,
  playableWith,
  rampColor,
  valueCounts,
  type Lens,
} from './lens'
import type { Game } from './types'

let seq = 0
const game = (name: string, extra: Partial<Game> = {}): Game => ({
  id: `g${++seq}`,
  name,
  orientation: 'inherit',
  createdAt: seq,
  ...extra,
})
const lens = (patch: Partial<Lens>): Lens => ({ ...EMPTY_LENS, ...patch })

describe('playableWith', () => {
  it('checks the count against the player range', () => {
    const g = game('Catan', { minPlayers: 3, maxPlayers: 4 })
    expect(playableWith(g, 2)).toBe(false)
    expect(playableWith(g, 3)).toBe(true)
    expect(playableWith(g, 4)).toBe(true)
    expect(playableWith(g, 5)).toBe(false)
  })

  it('reads the last count as "that many or more"', () => {
    expect(playableWith(game('Codenames', { minPlayers: 8, maxPlayers: 12 }), 7)).toBe(true)
    expect(playableWith(game('Catan', { minPlayers: 3, maxPlayers: 4 }), 7)).toBe(false)
  })

  it('assumes one player as minimum and nothing without a maximum', () => {
    expect(playableWith(game('A', { maxPlayers: 2 }), 1)).toBe(true)
    expect(playableWith(game('B', { minPlayers: 2 }), 2)).toBe(false)
  })
})

describe('matchesLens', () => {
  const brass = game('Brass', {
    year: 2018,
    complexity: 3.9,
    minPlayers: 2,
    maxPlayers: 4,
    designer: 'Gavan Brown; Matt Tolman; Martin Wallace',
    categories: ['Economic', 'Industry / Manufacturing'],
    plays: 0,
  })

  it('passes everything without filters', () => {
    expect(matchesLens(game('Anything'), EMPTY_LENS)).toBe(true)
  })

  it('needs every chosen player count', () => {
    expect(matchesLens(brass, lens({ players: [2, 4] }))).toBe(true)
    expect(matchesLens(brass, lens({ players: [2, 5] }))).toBe(false)
  })

  it('limits numbers to a range and never passes unknown data', () => {
    expect(matchesLens(brass, lens({ ranges: { year: [2015, 2020] } }))).toBe(true)
    expect(matchesLens(brass, lens({ ranges: { year: [2019, 2020] } }))).toBe(false)
    expect(matchesLens(brass, lens({ ranges: { rating: [1, 10] } }))).toBe(false)
  })

  it('absorbs the float rounding of the sliders', () => {
    expect(matchesLens(game('X', { complexity: 0.3 }), lens({ ranges: { complexity: [0.1 + 0.2, 1] } }))).toBe(true)
  })

  it('passes a game with any of the chosen values, inside lists too', () => {
    expect(matchesLens(brass, lens({ values: { designer: ['Martin Wallace', 'Uwe Rosenberg'] } }))).toBe(true)
    expect(matchesLens(brass, lens({ values: { category: ['Economic'] } }))).toBe(true)
    expect(matchesLens(brass, lens({ values: { category: ['Party Game'] } }))).toBe(false)
  })

  it('reads yes/no filters both ways', () => {
    expect(matchesLens(brass, lens({ flags: { unplayed: true } }))).toBe(true)
    expect(matchesLens(brass, lens({ flags: { unplayed: false } }))).toBe(false)
    expect(matchesLens(brass, lens({ flags: { expansion: false } }))).toBe(true)
    // Plays never logged: unknown, so neither played nor unplayed.
    expect(matchesLens(game('Y'), lens({ flags: { unplayed: true } }))).toBe(false)
  })

  it('combines filters', () => {
    expect(matchesLens(brass, lens({ players: [2], ranges: { complexity: [3.5, 5] } }))).toBe(true)
    expect(matchesLens(brass, lens({ players: [2], ranges: { complexity: [1, 2] } }))).toBe(false)
  })
})

describe('activeFilters', () => {
  it('counts the filters in use, not the map', () => {
    expect(activeFilters(EMPTY_LENS)).toBe(0)
    expect(activeFilters(lens({ heat: 'year' }))).toBe(0)
    expect(
      activeFilters(lens({ players: [2, 3], ranges: { year: [2000, 2010] }, values: { genre: [] }, flags: { expansion: true } })),
    ).toBe(3)
  })
})

describe('collection data', () => {
  const games = [
    game('A', { year: 2001, genre: 'Euro', dims: { width: 30, height: 30, depth: 10 } }),
    game('B', { year: 2019, genre: 'Euro' }),
    game('C', { genre: 'Party; Family' }),
  ]

  it('finds the bounds of a number', () => {
    expect(boundsOf(games, 'year')).toEqual([2001, 2019])
    expect(boundsOf(games, 'rating')).toBeUndefined()
  })

  it('measures the box volume in litres', () => {
    expect(numberOf(games[0]!, 'volume')).toBe(9)
    expect(numberOf(games[1]!, 'volume')).toBeUndefined()
  })

  it('counts the values, the most common first', () => {
    expect(valueCounts(games, 'genre')).toEqual([
      { value: 'Euro', count: 2 },
      { value: 'Family', count: 1 },
      { value: 'Party', count: 1 },
    ])
  })
})

describe('maps', () => {
  it('runs along the ramp', () => {
    expect(rampColor(0)).toBe(HEAT_RAMP[0])
    expect(rampColor(1)).toBe(HEAT_RAMP[HEAT_RAMP.length - 1])
    expect(rampColor(-3)).toBe(HEAT_RAMP[0])
  })

  it('paints numbers from the lowest to the highest value', () => {
    const old = game('Old', { year: 1995 })
    const recent = game('Recent', { year: 2020 })
    const unknown = game('Unknown')
    const scale = heatScale([old, recent, unknown], 'year')
    expect(scale).toMatchObject({ kind: 'number', min: 1995, max: 2020, missing: 1 })
    expect(heatColor(scale, old)).toBe(HEAT_RAMP[0])
    expect(heatColor(scale, recent)).toBe(HEAT_RAMP[HEAT_RAMP.length - 1])
    expect(heatColor(scale, unknown)).toBe(NO_DATA_COLOR)
  })

  it('gives the most common values their own colour', () => {
    const genres = ['Euro', 'Euro', 'Party', ...Array.from({ length: 9 }, (_, i) => `G${i}`)]
    const games = genres.map((genre, i) => game(`N${i}`, { genre }))
    const scale = heatScale([...games, game('None')], 'genre')
    if (scale.kind !== 'value') throw new Error('expected a value scale')
    expect(scale.entries[0]).toMatchObject({ value: 'Euro', count: 2, color: VALUE_COLORS[0] })
    expect(scale.entries).toHaveLength(VALUE_COLORS.length)
    expect(scale.others).toBe(genres.length - 2 - (VALUE_COLORS.length - 1))
    expect(scale.missing).toBe(1)
    expect(heatColor(scale, games[0]!)).toBe(VALUE_COLORS[0])
    expect(heatColor(scale, games[games.length - 1]!)).toBe(OTHER_COLOR)
  })
})

describe('paintLens', () => {
  const light = game('Light', { complexity: 1.5, year: 2010 })
  const heavy = game('Heavy', { complexity: 4, year: 2015 })
  const newer = game('Newer', { complexity: 4.2, year: 2022 })

  it('does nothing with an empty lens', () => {
    expect(paintLens([light, heavy], EMPTY_LENS)).toEqual({ matches: null, scale: null, colors: null })
  })

  it('lists the games passing the filters', () => {
    const paint = paintLens([light, heavy, newer], lens({ ranges: { complexity: [3, 5] } }))
    expect([...paint.matches!]).toEqual([heavy.id, newer.id])
    expect(paint.colors).toBeNull()
  })

  it('measures the map on the games that pass the filters', () => {
    const paint = paintLens([light, heavy, newer], lens({ heat: 'year', ranges: { complexity: [3, 5] } }))
    expect(paint.scale).toMatchObject({ min: 2015, max: 2022 })
    expect(paint.colors!.has(light.id)).toBe(false)
    expect(paint.colors!.get(heavy.id)).toBe(HEAT_RAMP[0])
  })
})
