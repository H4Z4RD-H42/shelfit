import { describe, expect, it } from 'vitest'
import { DEFAULT_OPTIONS } from './defaults'
import { KALLAX_CUBE } from './kallax'
import { orientations, packCollection } from './packer'
import type { Game, GameOrientation, PackOptions, Placement, ShelfUnit } from './types'

let seq = 0
const game = (name: string, w: number, h: number, d: number, extra: Partial<Game> = {}): Game => ({
  id: `g${++seq}`,
  name,
  dims: { width: w, height: h, depth: d },
  orientation: 'inherit' as GameOrientation,
  createdAt: seq,
  ...extra,
})

const unit = (columns: number, rows: number): ShelfUnit => ({ id: 'u', name: 'U', columns, rows, color: '#fff' })
const opts = (o: Partial<PackOptions> = {}): PackOptions => ({ ...DEFAULT_OPTIONS, ...o })

function overlaps(a: Placement, b: Placement): boolean {
  return a.x < b.x + b.sx && b.x < a.x + a.sx && a.y < b.y + b.sy && b.y < a.y + a.sy
}

function assertPhysical(layout: ReturnType<typeof packCollection>) {
  for (const cube of layout.cubes) {
    for (const p of cube.placements) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x + p.sx).toBeLessThanOrEqual(KALLAX_CUBE.width + 1e-6)
      expect(p.y + p.sy).toBeLessThanOrEqual(KALLAX_CUBE.height + 1e-6)
      expect(p.z + p.sz).toBeLessThanOrEqual(KALLAX_CUBE.depth + 1e-6)
    }
    for (let i = 0; i < cube.placements.length; i++)
      for (let j = i + 1; j < cube.placements.length; j++) expect(overlaps(cube.placements[i]!, cube.placements[j]!)).toBe(false)
  }
}

describe('orientations', () => {
  it('computes vertical and horizontal extents of a standard box', () => {
    const fits = orientations(game('x', 30, 30, 7).dims!, KALLAX_CUBE, 0.3)
    expect(fits.vertical).toEqual({ sx: 7, sy: 30, sz: 30 })
    expect(fits.horizontal).toEqual({ sx: 30, sy: 7, sz: 30 })
  })

  it('rotates a deep box so that it still fits', () => {
    const fits = orientations(game('x', 38, 27, 8).dims!, KALLAX_CUBE, 0.3)
    expect(fits.vertical).toEqual({ sx: 8, sy: 27, sz: 38 })
  })

  it('can show the long side of lying boxes at the front', () => {
    const fits = orientations(game('x', 30, 22.5, 5.5).dims!, KALLAX_CUBE, 0.3, true)
    expect(fits.horizontal).toEqual({ sx: 30, sy: 5.5, sz: 22.5 })
    // Too long for the width: falls back to the long side towards the back.
    expect(orientations(game('x', 36, 22, 5).dims!, KALLAX_CUBE, 0.3, true).horizontal).toEqual({ sx: 22, sy: 5, sz: 36 })
  })

  it('rejects boxes larger than the cube', () => {
    const fits = orientations(game('x', 41.5, 30, 19).dims!, KALLAX_CUBE, 0.3)
    expect(fits).toEqual({})
  })
})

describe('packCollection', () => {
  it('stands four 7 cm boxes in one cube', () => {
    const games = Array.from({ length: 4 }, (_, i) => game(`G${i}`, 30, 30, 7))
    const layout = packCollection(games, [unit(1, 1)], KALLAX_CUBE, opts({ orientation: 'vertical' }))
    expect(layout.stats.placedGames).toBe(4)
    expect(layout.cubes[0]!.placements.every((p) => p.orientation === 'vertical')).toBe(true)
    assertPhysical(layout)
  })

  it('stacks boxes when horizontal is forced', () => {
    const games = Array.from({ length: 4 }, (_, i) => game(`G${i}`, 30, 30, 7))
    const layout = packCollection(games, [unit(1, 1)], KALLAX_CUBE, opts({ orientation: 'horizontal' }))
    const ys = layout.cubes[0]!.placements.map((p) => p.y).sort((a, b) => a - b)
    expect(ys[0]).toBe(0)
    expect(ys[3]).toBeCloseTo(3 * 7.3)
    assertPhysical(layout)
  })

  it('mixes orientations in auto mode to fit more boxes', () => {
    // Two thick books leave 8.9 cm: small boxes fit there only as a flat stack.
    const games = [game('A', 30, 30, 12), game('B', 30, 30, 12), ...Array.from({ length: 4 }, (_, i) => game(`S${i}`, 8, 8, 4))]
    const pack = (orientation: PackOptions['orientation']) =>
      packCollection(games, [unit(1, 1)], KALLAX_CUBE, opts({ sortBy: 'added', orientation }))
    expect(pack('vertical').stats.placedGames).toBe(4)
    expect(pack('horizontal').stats.placedGames).toBe(4)
    const auto = pack('auto')
    expect(auto.stats.placedGames).toBe(6)
    assertPhysical(auto)
  })

  it('lets deep boxes stick out of the front when overhang is allowed', () => {
    const deep = game('War of the Ring', 40.5, 27.5, 9)
    expect(packCollection([deep], [unit(1, 1)], KALLAX_CUBE, opts()).unplaced).toHaveLength(1)
    const layout = packCollection([deep], [unit(1, 1)], KALLAX_CUBE, opts({ overhang: 3 }))
    const p = layout.cubes[0]!.placements[0]!
    expect(p.sz).toBe(40.5)
    expect(p.z).toBeCloseTo(KALLAX_CUBE.depth - 40.5)
  })

  it('puts games on top of the shelf when asked or when they fit nowhere', () => {
    const wipper = game('Wipper', 35, 35, 8, { onTop: true })
    const crack = game('Crack!', 48.4, 24.3, 5.1)
    const azul = game('Azul', 26, 26, 7)
    const layout = packCollection([wipper, crack, azul], [unit(4, 4)], KALLAX_CUBE, opts({ oversizedOnTop: true }))
    expect(layout.unplaced).toEqual([])
    const top = layout.tops[0]!.placements
    expect(top.map((p) => p.gameId).sort()).toEqual([crack.id, wipper.id].sort())
    expect(top.every((p) => p.orientation === 'horizontal')).toBe(true)
    expect(layout.cubes[0]!.placements.map((p) => p.gameId)).toEqual([azul.id])

    const strict = packCollection([crack], [unit(2, 2)], KALLAX_CUBE, opts())
    expect(strict.unplaced).toEqual([{ gameId: crack.id, reason: 'too-big' }])
  })

  it('skips blocked cubes', () => {
    const games = Array.from({ length: 2 }, (_, i) => game(`G${i}`, 30, 30, 20))
    const blocked = { ...unit(2, 1), blocked: ['0:0'] }
    const layout = packCollection(games, [blocked], KALLAX_CUBE, opts({ orientation: 'vertical' }))
    expect(layout.cubes).toHaveLength(1)
    expect(layout.cubes[0]).toMatchObject({ column: 1, row: 0 })
    expect(layout.stats.placedGames).toBe(1)
  })

  it('never stacks a box on a narrower or shallower one', () => {
    const square = game('Square', 30, 30, 5)
    const long = game('Long', 36, 20, 5) // narrower but deeper than Square
    const layout = packCollection([square, long], [unit(1, 1)], KALLAX_CUBE, opts({ orientation: 'horizontal' }))
    expect(layout.stats.placedGames).toBe(1)

    const small = game('Small', 25, 25, 5)
    const twin = game('Twin', 30.5, 30.5, 5) // within tolerance of Square
    const ok = packCollection([small, square, twin], [unit(1, 1)], KALLAX_CUBE, opts({ orientation: 'horizontal' }))
    const stack = [...ok.cubes[0]!.placements].sort((a, b) => a.level - b.level)
    expect(stack.map((p) => p.gameId).at(-1)).toBe(small.id)
    for (let i = 1; i < stack.length; i++) {
      expect(stack[i]!.sx).toBeLessThanOrEqual(stack[i - 1]!.sx + 1)
      expect(stack[i]!.sz).toBeLessThanOrEqual(stack[i - 1]!.sz + 1)
    }
  })

  it('aligns boxes to the left, centre or right of the cube and of each stack', () => {
    const games = [game('Big', 30, 30, 5), game('Small', 20, 20, 5)]
    const at = (align: PackOptions['align']) => {
      const layout = packCollection(games, [unit(1, 1)], KALLAX_CUBE, opts({ orientation: 'horizontal', align }))
      return Object.fromEntries(layout.cubes[0]!.placements.map((p) => [p.sx, p.x]))
    }
    const half = DEFAULT_OPTIONS.clearance / 2
    expect(at('left')).toEqual({ 30: half, 20: half })
    expect(at('right')[30]! + 30).toBeCloseTo(KALLAX_CUBE.width - half)
    expect(at('right')[20]! + 20).toBeCloseTo(KALLAX_CUBE.width - half)
    expect(at('center')[20]! + 10).toBeCloseTo(KALLAX_CUBE.width / 2)
  })

  it('reports games that do not fit at all', () => {
    const big = game('Gloomhaven', 41.5, 30, 19)
    const layout = packCollection([big], [unit(1, 1)], KALLAX_CUBE, opts())
    expect(layout.unplaced).toEqual([{ gameId: big.id, reason: 'too-big' }])
  })

  it('reports games without a size and skips excluded ones', () => {
    const noSize = { ...game('Unknown', 1, 1, 1), dims: undefined }
    const excluded = game('Stored in base box', 10, 10, 3, { excluded: true })
    const layout = packCollection([noSize, excluded], [unit(1, 1)], KALLAX_CUBE, opts())
    expect(layout.unplaced).toEqual([{ gameId: noSize.id, reason: 'no-size' }])
    expect(layout.stats.totalGames).toBe(1)
    expect(layout.cubes[0]!.placements).toHaveLength(0)
  })

  it('reports games left out when shelves are full', () => {
    const games = Array.from({ length: 5 }, (_, i) => game(`G${i}`, 30, 30, 7))
    const layout = packCollection(games, [unit(1, 1)], KALLAX_CUBE, opts({ orientation: 'vertical' }))
    expect(layout.stats.placedGames).toBe(4)
    expect(layout.unplaced).toHaveLength(1)
    expect(layout.unplaced[0]!.reason).toBe('no-space')
  })

  it('keeps alphabetical order across cubes', () => {
    const names = ['Delta', 'Alpha', 'Echo', 'Charlie', 'Bravo', 'Foxtrot']
    const games = names.map((n) => game(n, 30, 30, 10))
    const layout = packCollection(games, [unit(2, 1)], KALLAX_CUBE, opts({ orientation: 'vertical', groupSagas: false }))
    const byId = new Map(games.map((g) => [g.id, g.name]))
    const order = layout.cubes.flatMap((c) => [...c.placements].sort((a, b) => a.x - b.x).map((p) => byId.get(p.gameId)))
    expect(order).toEqual(['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot'])
  })

  it('moves a saga to the next cube instead of splitting it', () => {
    const games = [
      game('Azul', 30, 30, 10),
      game('Brass', 30, 30, 10),
      game('Zombicide', 30, 30, 10),
      game('Zombicide: Black Plague', 30, 30, 10),
    ]
    const layout = packCollection(games, [unit(2, 1)], KALLAX_CUBE, opts({ orientation: 'vertical' }))
    expect(layout.cubes[0]!.placements).toHaveLength(2)
    expect(layout.cubes[1]!.placements).toHaveLength(2)
    expect(layout.sagas[games[2]!.id]).toBe('Zombicide')
  })

  it('compact strategy uses no more cubes than ordered', () => {
    const games = [
      ...Array.from({ length: 6 }, (_, i) => game(`Big ${i}`, 30, 30, 10)),
      ...Array.from({ length: 6 }, (_, i) => game(`Small ${i}`, 15, 10, 3)),
    ]
    const ordered = packCollection(games, [unit(4, 4)], KALLAX_CUBE, opts({ groupSagas: false }))
    const compact = packCollection(games, [unit(4, 4)], KALLAX_CUBE, opts({ strategy: 'compact', groupSagas: false }))
    expect(compact.stats.placedGames).toBe(12)
    expect(compact.stats.usedCubes).toBeLessThanOrEqual(ordered.stats.usedCubes)
    assertPhysical(compact)
  })

  it('handles a large collection quickly', () => {
    const games = Array.from({ length: 300 }, (_, i) => game(`Game ${i}`, 20 + (i % 11), 20 + (i % 7), 4 + (i % 9)))
    const start = performance.now()
    const layout = packCollection(games, [unit(5, 5), unit(5, 5)], KALLAX_CUBE, opts({ strategy: 'compact' }))
    expect(performance.now() - start).toBeLessThan(5000)
    expect(layout.stats.placedGames).toBeGreaterThan(200)
    assertPhysical(layout)
  })
})
