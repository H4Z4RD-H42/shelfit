import { describe, expect, it } from 'vitest'
import { DEFAULT_OPTIONS } from './defaults'
import { freeRoom } from './room'
import { planLayout } from './rules'
import type { Game, PackOptions, ShelfUnit } from './types'

let seq = 0
const game = (w: number, h: number, d: number, orientation: Game['orientation'] = 'inherit'): Game => ({
  id: `g${++seq}`,
  name: `G${seq}`,
  dims: { width: w, height: h, depth: d },
  orientation,
  createdAt: seq,
})

const unit = (columns: number, rows: number): ShelfUnit => ({ id: 'u', name: 'U', columns, rows, color: '#fff' })
const room = (games: Game[], units: ShelfUnit[], o: Partial<PackOptions> = {}) => {
  const options = { ...DEFAULT_OPTIONS, ...o }
  return freeRoom(games, units, options, [], planLayout(games, units, options))
}

describe('freeRoom', () => {
  it('counts the standard boxes empty cubes take', () => {
    // 33.5 cm wide: four 7.2 cm boxes standing, or a stack of four.
    expect(room([], [unit(2, 1)])).toEqual({ emptyCubes: 2, boxes: 8 })
  })

  it('counts the room beside standing boxes', () => {
    const games = [game(30, 30, 7, 'vertical'), game(30, 30, 7, 'vertical')]
    expect(room(games, [unit(1, 1)])).toEqual({ emptyCubes: 0, boxes: 2 })
  })

  it('counts the room on top of a stack', () => {
    const games = [game(30, 30, 7, 'horizontal'), game(30, 30, 7, 'horizontal')]
    expect(room(games, [unit(1, 1)])).toEqual({ emptyCubes: 0, boxes: 2 })
  })

  it('never takes the place of a game, even with max space', () => {
    const games = Array.from({ length: 4 }, () => game(30, 30, 7))
    expect(room(games, [unit(1, 1)], { strategy: 'compact' })).toEqual({ emptyCubes: 0, boxes: 0 })
    expect(room(games.slice(1), [unit(1, 1)], { strategy: 'compact' })).toEqual({ emptyCubes: 0, boxes: 1 })
  })
})
