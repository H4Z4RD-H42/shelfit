import { describe, expect, it } from 'vitest'
import { DEFAULT_OPTIONS } from './defaults'
import { cubeSlots } from './geometry'
import { packCollection } from './packer'
import type { Game, ShelfUnit, Zone } from './types'
import { assignZones, newZone, sizeClasses, splitPoint, zoneRuns, zoneSlots, type ZoneContext } from './zones'

let seq = 0
const game = (name: string, dims: [number, number, number] | undefined, extra: Partial<Game> = {}): Game => ({
  id: `g${++seq}`,
  name,
  ...(dims && { dims: { width: dims[0], height: dims[1], depth: dims[2] } }),
  orientation: 'inherit',
  createdAt: seq,
  ...extra,
})
const standard = (name: string, extra: Partial<Game> = {}) => game(name, [30, 30, 7], extra)
const pocket = (name: string, extra: Partial<Game> = {}) => game(name, [12, 9, 3.5], extra)

const unit = (columns: number, rows: number): ShelfUnit => ({ id: 'u', name: 'U', columns, rows, color: '#fff' })
const zone = (id: string, patch: Partial<Zone> = {}): Zone => ({ ...newZone(id, []), ...patch })

describe('splitPoint', () => {
  it('splits where the values separate most clearly', () => {
    expect(splitPoint([1, 1.2, 1.1, 5, 5.5])).toBe(5)
  })

  it('finds nothing to split in equal values', () => {
    expect(splitPoint([3, 3, 3])).toBeUndefined()
    expect(splitPoint([3])).toBeUndefined()
  })
})

describe('sizeClasses', () => {
  const capacity = (entries: Record<string, number>) => new Map(Object.entries(entries))

  it('keeps only the clearly smaller boxes as small', () => {
    // 4 standard boxes fit in a cube; Splendor-like 8, Codenames-like 10, pocket games 24 and 30.
    const { small } = sizeClasses(capacity({ catan: 4, splendor: 8, codenames: 10, theGame: 24, loveLetter: 30 }), 4)
    expect([...small].sort()).toEqual(['loveLetter', 'theGame'])
  })

  it('has every box small in a collection of small boxes only', () => {
    const { small } = sizeClasses(capacity({ a: 24, b: 30, c: 30 }), 4)
    expect(small.size).toBe(3)
  })

  it('finds no small boxes when none is smaller than the standard one', () => {
    expect(sizeClasses(capacity({ a: 4, b: 4, c: 2 }), 4).small.size).toBe(0)
  })

  it('finds the large boxes the same way', () => {
    const { large, small } = sizeClasses(capacity({ catan: 4, big: 3, deluxe: 1, huge: 1 }), 4)
    expect([...large].sort()).toEqual(['deluxe', 'huge'])
    expect(small.size).toBe(0)
  })
})

describe('assignZones', () => {
  const ctx = (games: Game[], sagas: Record<string, string> = {}): ZoneContext => ({
    sagas,
    groupSagas: true,
    capacity: new Map(games.map((g) => [g.id, g.dims!.depth < 5 ? 24 : 4])),
    standard: 4,
  })

  it('puts a game in the first zone whose rule it satisfies', () => {
    const party = standard('Codenames', { tags: ['Party'] })
    const games = [standard('Catan'), pocket('The Game', { tags: ['party'] }), party]
    const zones = [zone('small'), zone('party', { rule: 'tag', tag: 'party' })]
    expect(assignZones(games, zones, ctx(games))).toEqual({ [games[1]!.id]: 'small', [party.id]: 'party' })
  })

  it('lets choices made by hand win over the rules', () => {
    const kept = pocket('The Game', { zones: { small: false } })
    const moved = standard('Catan', { zones: { other: true } })
    const games = [kept, moved, pocket('Love Letter')]
    const zones = [zone('small'), zone('other', { rule: 'manual' })]
    expect(assignZones(games, zones, ctx(games))).toEqual({ [moved.id]: 'other', [games[2]!.id]: 'small' })
  })

  it('keeps a saga with its first chapter', () => {
    const base = standard('Root', { year: 2018 })
    const expansion = pocket('Root: Exiles', { year: 2020 })
    const games = [base, expansion]
    const sagas = { [base.id]: 'Root', [expansion.id]: 'Root' }
    expect(assignZones(games, [zone('small')], ctx(games, sagas))).toEqual({})
    expect(assignZones(games, [zone('small')], { ...ctx(games, sagas), groupSagas: false })).toEqual({
      [expansion.id]: 'small',
    })
  })

  it('takes a whole saga to the zone of its first chapter', () => {
    const first = pocket('Love Letter', { year: 2012 })
    const second = standard('Love Letter: Big Box', { year: 2015 })
    const out = standard('Love Letter: Premium', { year: 2016, zones: { small: false } })
    const games = [first, second, out]
    const sagas = Object.fromEntries(games.map((g) => [g.id, 'Love Letter']))
    expect(assignZones(games, [zone('small')], ctx(games, sagas))).toEqual({ [first.id]: 'small', [second.id]: 'small' })
  })

  it('matches the BGG data and the personal data', () => {
    const games = [
      standard('Dixit', { categories: ['Party Game'] }),
      standard('Unplayed', { plays: 0 }),
      standard('Played', { plays: 3 }),
      standard('Old', { forTrade: true }),
      standard('Loved', { rating: 9 }),
      standard('Friday', { maxPlayers: 1 }),
    ]
    const zones = [
      zone('party', { rule: 'party' }),
      zone('unplayed', { rule: 'unplayed' }),
      zone('trade', { rule: 'forTrade' }),
      zone('fav', { rule: 'favorites' }),
      zone('solo', { rule: 'solo' }),
    ]
    expect(Object.values(assignZones(games, zones, ctx(games)))).toEqual(['party', 'unplayed', 'trade', 'fav', 'solo'])
  })
})

describe('zoneSlots', () => {
  const units = [unit(4, 4)]
  const slots = cubeSlots(units, 'rows')
  const free = slots.map((_, i) => i)
  const pick = (patch: Partial<Zone>, needed: number, from = free) => zoneSlots(zone('z', patch), needed, slots, from)

  it('takes the first or the last free cubes', () => {
    expect(pick({ place: 'start' }, 3)).toEqual([0, 1, 2])
    expect(pick({ place: 'end' }, 3)).toEqual([13, 14, 15])
    expect(pick({ place: 'end' }, 2, [0, 1, 2, 3, 4, 5])).toEqual([4, 5])
  })

  it('fills the bottom row first, then the one above', () => {
    expect(pick({ place: 'bottom' }, 5)).toEqual([8, 12, 13, 14, 15])
  })

  it('finds the cubes at eye level', () => {
    // The top row of a 4×4 KALLAX is the closest to 140 cm.
    expect(pick({ place: 'eye' }, 2)).toEqual([0, 1])
    const tall = [unit(5, 5)]
    const tallSlots = cubeSlots(tall, 'rows')
    expect(
      zoneSlots(
        zone('z', { place: 'eye' }),
        1,
        tallSlots,
        tallSlots.map((_, i) => i),
      ).map((i) => tallSlots[i]!.row),
    ).toEqual([1])
  })

  it('keeps every chosen cube, even the empty ones', () => {
    expect(pick({ place: 'cubes', cubes: ['u:2:3', 'u:1:0'] }, 1)).toEqual([1, 14])
    expect(pick({ place: 'cubes', cubes: ['u:2:3', 'u:1:0'] }, 1, [0, 14])).toEqual([14])
  })
})

describe('packing with zones', () => {
  const opts = DEFAULT_OPTIONS
  const layoutOf = (games: Game[], zones: Zone[], columns = 2, rows = 2) =>
    packCollection(games, [unit(columns, rows)], opts, zones)
  const namesIn = (layout: ReturnType<typeof layoutOf>, index: number, games: Game[]) =>
    layout.cubes[index]!.placements.map((p) => games.find((g) => g.id === p.gameId)!.name).sort()

  it('moves the small boxes to their own cubes at the end of the shelves', () => {
    const games = [...['A', 'C', 'E', 'G', 'I', 'K'].map((n) => standard(n)), ...['B', 'D', 'F', 'H'].map((n) => pocket(n))]
    const plain = layoutOf(games, [])
    expect(namesIn(plain, 0, games)).toEqual(['A', 'B', 'C', 'D', 'E', 'F'])

    const layout = layoutOf(games, [zone('small')])
    expect(namesIn(layout, 0, games)).toEqual(['A', 'C', 'E', 'G'])
    expect(namesIn(layout, 1, games)).toEqual(['I', 'K'])
    expect(layout.cubes[2]!.placements).toHaveLength(0)
    expect(namesIn(layout, 3, games)).toEqual(['B', 'D', 'F', 'H'])
    expect(layout.cubes.map((c) => c.zoneId)).toEqual([undefined, undefined, undefined, 'small'])
    expect(layout.zoneStats.small).toEqual({ games: 4, cubes: 1, unplaced: 0 })
    expect(layout.stats.usedCubes).toBe(3)
  })

  it('lays out the zones at the end in list order', () => {
    const games = [standard('A'), pocket('B'), standard('C', { tags: ['kids'] })]
    const layout = layoutOf(games, [zone('small'), zone('kids', { rule: 'tag', tag: 'kids' })])
    expect(layout.cubes.map((c) => c.zoneId)).toEqual([undefined, undefined, 'small', 'kids'])
    expect(namesIn(layout, 0, games)).toEqual(['A'])
  })

  it('puts a zone at the start before the rest of the collection', () => {
    const games = [standard('A'), pocket('B')]
    const layout = layoutOf(games, [zone('small', { place: 'start' })])
    expect(namesIn(layout, 0, games)).toEqual(['B'])
    expect(namesIn(layout, 1, games)).toEqual(['A'])
  })

  it('reports the games that do not fit in the chosen cubes', () => {
    const forced = ['A', 'B', 'C', 'D', 'E', 'F'].map((n) => standard(n, { zones: { mine: true } }))
    const games = [...forced, standard('G')]
    const layout = layoutOf(games, [zone('mine', { rule: 'manual', place: 'cubes', cubes: ['u:1:1'] })])
    expect(layout.cubes[3]!.zoneId).toBe('mine')
    expect(layout.cubes[3]!.placements).toHaveLength(4)
    expect(layout.unplaced.map((u) => u.reason)).toEqual(['zone-full', 'zone-full'])
    expect(layout.zoneStats.mine).toEqual({ games: 6, cubes: 1, unplaced: 2 })
    expect(namesIn(layout, 0, games)).toEqual(['G'])
  })

  it('keeps chosen cubes for the zone even while they are empty', () => {
    const games = ['A', 'B', 'C', 'D', 'E'].map((n) => standard(n))
    const layout = layoutOf(games, [zone('mine', { rule: 'manual', place: 'cubes', cubes: ['u:0:0'] })])
    expect(layout.cubes[0]!.zoneId).toBe('mine')
    expect(layout.cubes[0]!.placements).toHaveLength(0)
    expect(namesIn(layout, 1, games)).toEqual(['A', 'B', 'C', 'D'])
    expect(namesIn(layout, 2, games)).toEqual(['E'])
  })
})

describe('zoneRuns', () => {
  it('joins adjacent cubes of a zone on the same row', () => {
    const cube = (column: number, row: number, zoneId?: string) => ({ unitId: 'u', column, row, zoneId })
    const cubes = [cube(0, 0), cube(1, 0, 'a'), cube(2, 0, 'a'), cube(3, 0, 'b'), cube(0, 1, 'a'), cube(2, 1, 'a')]
    // KALLAX 4×2: columns start every 35 cm after the 4.25 cm side; the top row stands on a 1.5 cm shelf.
    expect(zoneRuns(cubes, [unit(4, 2)])).toEqual([
      { zoneId: 'a', unitId: 'u', x: 39.25, y: 39.25, width: 68.5, below: 1.5 },
      { zoneId: 'b', unitId: 'u', x: 109.25, y: 39.25, width: 33.5, below: 1.5 },
      { zoneId: 'a', unitId: 'u', x: 4.25, y: 4.25, width: 33.5, below: 4.25 },
      { zoneId: 'a', unitId: 'u', x: 74.25, y: 4.25, width: 33.5, below: 4.25 },
    ])
  })
})
