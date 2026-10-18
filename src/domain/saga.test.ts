import { describe, expect, it } from 'vitest'
import { detectSagas, orderSaga, sagaBase } from './saga'
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

  it('lets a lone game join the explicit saga its title starts with', () => {
    const games = [
      game('a', 'The Thing: The Boardgame'),
      game('b', 'The Thing: Avamposto Norvegese', 'The Thing'),
      game('c', 'The Thing: Alien Miniatures Set', 'The Thing'),
      game('d', 'Things to Do'),
    ]
    expect(detectSagas(games, true)).toEqual({ a: 'The Thing', b: 'The Thing', c: 'The Thing' })
    expect(detectSagas(games, false)).toEqual({ b: 'The Thing', c: 'The Thing' })
  })
})

describe('orderSaga', () => {
  const chapter = (name: string, year?: number, expansion = false): Game => ({ ...game(name, name), year, expansion })
  const names = (games: Game[]) => orderSaga(games).map((g) => g.name)

  it('puts every game before its expansions, each expansion under the title it extends', () => {
    expect(
      names([
        chapter('Nemesis: Retaliation – Stretch Goals', 2026, true),
        chapter('Nemesis: Lockdown', 2022),
        chapter('Nemesis', 2019),
        chapter('Nemesis: Lockdown – Stretch Goals', 2021, true),
        chapter('Nemesis: Retaliation', 2026),
        chapter('Nemesis: Medic Character Expansion', 2021, true),
      ]),
    ).toEqual([
      'Nemesis',
      'Nemesis: Medic Character Expansion',
      'Nemesis: Lockdown',
      'Nemesis: Lockdown – Stretch Goals',
      'Nemesis: Retaliation',
      'Nemesis: Retaliation – Stretch Goals',
    ])
  })

  it('keeps a later game of the series after the expansions of the earlier one', () => {
    expect(
      names([
        chapter('Black Rose Wars: Duel – Lex', 2023),
        chapter('Black Rose Wars: Rebirth', 2022),
        chapter('Black Rose Wars: Rebirth – Rotas Box', 2024, true),
      ]),
    ).toEqual(['Black Rose Wars: Rebirth', 'Black Rose Wars: Rebirth – Rotas Box', 'Black Rose Wars: Duel – Lex'])
  })

  it('hangs other expansions under the latest base game released before them', () => {
    expect(
      names([
        chapter('Zombi!!! 4: La Fine', 2011),
        chapter('Zombi!!! 2: Zombi Corp(i)', 2008, true),
        chapter('Zombi!!! Seconda Edizione', 2006),
        chapter('Zombi!!! Bonus Pack', undefined, true),
      ]),
    ).toEqual(['Zombi!!! Seconda Edizione', 'Zombi!!! 2: Zombi Corp(i)', 'Zombi!!! Bonus Pack', 'Zombi!!! 4: La Fine'])
  })

  it('orders by year when nothing says which game extends which', () => {
    expect(names([chapter('Dice Throne: Santa v. Krampus', 2022), chapter('Dice Throne: Season One', 2020)])).toEqual([
      'Dice Throne: Season One',
      'Dice Throne: Santa v. Krampus',
    ])
  })
})
