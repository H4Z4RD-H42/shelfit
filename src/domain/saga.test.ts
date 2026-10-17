import { describe, expect, it } from 'vitest'
import { detectSagas, sagaBase } from './saga'
import type { Game } from './types'

const game = (id: string, name: string, saga?: string): Game => ({
  id,
  name,
  saga,
  dims: { width: 30, height: 30, depth: 7 },
  orientation: 'inherit',
  createdAt: 0,
})

describe('sagaBase', () => {
  it.each([
    ['Zombicide: Black Plague', 'zombicide'],
    ['Zombicide 2nd Edition', 'zombicide'],
    ['Pandemic Legacy Season 1', 'pandemic'],
    ['Catan – Seafarers', 'catan'],
    ['Star Wars: Rebellion', 'star wars'],
    ['Civilization III', 'civilization'],
    ['Ticket to Ride Europe', 'ticket to ride europe'],
    ['Les Châteaux de Bourgogne', 'les chateaux de bourgogne'],
  ])('%s → %s', (name, base) => {
    expect(sagaBase(name)).toBe(base)
  })
})

describe('detectSagas', () => {
  it('groups chapters of the same franchise', () => {
    const sagas = detectSagas(
      [
        game('a', 'Zombicide'),
        game('b', 'Zombicide: Black Plague'),
        game('c', 'Zombicide Invader'),
        game('d', 'Azul'),
        game('e', 'Ticket to Ride'),
        game('f', 'Ticket to Ride Europe'),
      ],
      true,
    )
    expect(sagas).toEqual({ a: 'Zombicide', b: 'Zombicide', c: 'Zombicide', e: 'Ticket to Ride', f: 'Ticket to Ride' })
  })

  it('keeps explicit sagas and skips detection when disabled', () => {
    const games = [game('a', 'Zombicide'), game('b', 'Zombicide 2'), game('c', 'Marvel Zombies', 'Zombicide')]
    expect(detectSagas(games, false)).toEqual({ c: 'Zombicide' })
    expect(detectSagas(games, true)).toEqual({ a: 'Zombicide', b: 'Zombicide', c: 'Zombicide' })
  })
})
