import { describe, expect, it } from 'vitest'
import { DEFAULT_OPTIONS } from './defaults'
import { orderUnits, sortTitle } from './sorting'
import type { Game } from './types'

const game = (id: string, name: string): Game => ({ id, name, orientation: 'inherit', createdAt: 0 })

describe('sortTitle', () => {
  it.each([
    ['Le Case della Follia', 'Case della Follia'],
    ["L'Isola di Fuoco", 'Isola di Fuoco'],
    ['L’Isola di Fuoco', 'Isola di Fuoco'],
    ['La Guerra dell’Anello', 'Guerra dell’Anello'],
    ['The Game', 'Game'],
    ['A Feast for Odin', 'Feast for Odin'],
    ['Die Macher', 'Macher'],
    ['Lords of Waterdeep', 'Lords of Waterdeep'],
    ['Uno', 'Uno'],
    ['Theseus', 'Theseus'],
  ])('%s → %s', (name, title) => {
    expect(sortTitle(name, true)).toBe(title)
  })

  it('keeps the title when articles are not ignored', () => {
    expect(sortTitle('Le Case della Follia', false)).toBe('Le Case della Follia')
  })
})

describe('orderUnits', () => {
  const games = [game('a', 'Le Case della Follia'), game('b', 'Azul'), game('c', 'Dune'), game('d', 'The Thing: Expansion')]
  const names = (ignoreArticles: boolean) =>
    orderUnits(games, { d: 'The Thing' }, { ...DEFAULT_OPTIONS, ignoreArticles }).map((u) => u.games[0]!.name)

  it('files titles under their first word after the article when asked', () => {
    expect(names(false)).toEqual(['Azul', 'Dune', 'Le Case della Follia', 'The Thing: Expansion'])
    expect(names(true)).toEqual(['Azul', 'Le Case della Follia', 'Dune', 'The Thing: Expansion'])
  })
})
