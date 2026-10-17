import { describe, expect, it } from 'vitest'
import { DEFAULT_OPTIONS } from './defaults'
import { compareGroups, groupOf } from './grouping'
import { packCollection } from './packer'
import { orderUnits } from './sorting'
import type { Game, PackOptions, ShelfUnit } from './types'

let seq = 0
const game = (name: string, extra: Partial<Game> = {}): Game => ({
  id: `g${++seq}`,
  name,
  dims: { width: 30, height: 30, depth: 10 },
  orientation: 'inherit',
  createdAt: seq,
  ...extra,
})
const opts = (o: Partial<PackOptions> = {}): PackOptions => ({ ...DEFAULT_OPTIONS, orientation: 'vertical', ...o })
const unit = (columns: number, rows: number): ShelfUnit => ({ id: 'u', name: 'U', columns, rows, color: '#fff' })

describe('groupOf', () => {
  it('buckets numeric values', () => {
    expect(groupOf(game('a', { complexity: 1.8 }), 'complexity')).toBe('light')
    expect(groupOf(game('a', { complexity: 3.4 }), 'complexity')).toBe('heavy')
    expect(groupOf(game('a', { maxPlayers: 2 }), 'players')).toBe('duo')
    expect(groupOf(game('a', { maxPlayers: 8 }), 'players')).toBe('party')
    expect(groupOf(game('a', { playTime: 120 }), 'playtime')).toBe('long')
    expect(groupOf(game('a'), 'playtime')).toBeUndefined()
  })

  it('uses the first entry of a list', () => {
    expect(groupOf(game('a', { publisher: 'Awaken Realms; Cranio Creations' }), 'publisher')).toBe('Awaken Realms')
  })

  it('orders buckets naturally and unknown values last', () => {
    expect(['heavy', undefined, 'light', 'medium'].sort((a, b) => compareGroups('complexity', a, b))).toEqual([
      'light',
      'medium',
      'heavy',
      undefined,
    ])
  })
})

describe('orderUnits with grouping', () => {
  it('orders by group, then by the sort key', () => {
    const games = [
      game('Brass', { genre: 'Strategy' }),
      game('Azul', { genre: 'Abstract' }),
      game('Agricola', { genre: 'Strategy' }),
      game('Codenames'),
    ]
    const units = orderUnits(games, {}, { ...DEFAULT_OPTIONS, groupBy: [{ key: 'genre', direction: 'asc' }] })
    expect(units.map((u) => u.games[0]!.name)).toEqual(['Azul', 'Agricola', 'Brass', 'Codenames'])
    expect(units.map((u) => u.group)).toEqual(['Abstract', 'Strategy', 'Strategy', ''])
  })

  it('supports a second level', () => {
    const games = [
      game('B', { genre: 'Party', maxPlayers: 8 }),
      game('A', { genre: 'Party', maxPlayers: 2 }),
      game('C', { genre: 'Coop', maxPlayers: 4 }),
    ]
    const units = orderUnits(
      games,
      {},
      {
        ...DEFAULT_OPTIONS,
        sortBy: 'name',
        groupBy: [
          { key: 'genre', direction: 'asc' },
          { key: 'players', direction: 'asc' },
        ],
      },
    )
    expect(units.map((u) => u.games[0]!.name)).toEqual(['C', 'A', 'B'])
  })
})

describe('year and direction', () => {
  it('groups by decade', () => {
    expect(groupOf(game('a', { year: 2017 }), 'year')).toBe('2010')
    expect(groupOf(game('a', { year: 1995 }), 'year')).toBe('1990')
  })

  it('orders groups in descending order, unknown values still last', () => {
    const games = [game('Light', { complexity: 1.5 }), game('None'), game('Heavy', { complexity: 3.5 })]
    const units = orderUnits(games, {}, { ...DEFAULT_OPTIONS, groupBy: [{ key: 'complexity', direction: 'desc' }] })
    expect(units.map((u) => u.games[0]!.name)).toEqual(['Heavy', 'Light', 'None'])
  })
})

describe('packCollection with grouping', () => {
  it('starts each group in a new cube when asked', () => {
    const games = [game('A1', { genre: 'A' }), game('B1', { genre: 'B' }), game('B2', { genre: 'B' })]
    const shared = packCollection(games, [unit(2, 1)], opts({ groupBy: [{ key: 'genre', direction: 'asc' }] }))
    expect(shared.cubes[0]!.placements).toHaveLength(3)
    const split = packCollection(
      games,
      [unit(2, 1)],
      opts({ groupBy: [{ key: 'genre', direction: 'asc' }], groupStartsNewCube: true }),
    )
    expect(split.cubes[0]!.placements).toHaveLength(1)
    expect(split.cubes[1]!.placements).toHaveLength(2)
    expect(split.groups).toEqual({ [games[0]!.id]: 'A', [games[1]!.id]: 'B', [games[2]!.id]: 'B' })
  })

  it('keeps a saga in the group of its first chapter', () => {
    const games = [
      game('Root', { publisher: 'MS Edizioni', year: 2018 }),
      game('Root: Kit del Vagabondo', { publisher: 'Leder Games; MS Edizioni', year: 2020 }),
      game('Root: The Riverfolk', { year: 2019 }),
    ]
    const layout = packCollection(games, [unit(2, 1)], opts({ groupBy: [{ key: 'publisher', direction: 'asc' }] }))
    expect(Object.values(layout.groups)).toEqual(['MS Edizioni', 'MS Edizioni', 'MS Edizioni'])
  })
})
