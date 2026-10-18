import { gameColor, hueOf } from './color'
import { compareGroups, groupPath } from './grouping'
import { orderSaga } from './saga'
import type { Game, PackOptions, SortKey } from './types'

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' })

export function boxVolume(game: Game): number {
  return game.dims ? game.dims.width * game.dims.height * game.dims.depth : 0
}

function sortValue(game: Game, key: SortKey): number | string {
  switch (key) {
    case 'name':
      return game.name
    case 'year':
      return game.year ?? Number.POSITIVE_INFINITY
    case 'size':
      return boxVolume(game)
    case 'weight':
      return game.weightKg ?? 0
    case 'color':
      return hueOf(gameColor(game))
    case 'added':
      return game.createdAt
    case 'complexity':
      return game.complexity ?? Number.POSITIVE_INFINITY
    case 'playtime':
      return game.playTime ?? Number.POSITIVE_INFINITY
    case 'rating':
      return game.rating ?? 0
  }
}

function compareValues(a: number | string, b: number | string): number {
  if (typeof a === 'string' && typeof b === 'string') return collator.compare(a, b)
  return (a as number) - (b as number)
}

export interface Unit {
  games: Game[]
  /** Outermost group of the unit; units of the same group are contiguous. */
  group: string
}

/**
 * Builds the ordered list of placement units. A unit is either a single game
 * or, when sagas are grouped, all the games of one saga. Units are ordered by
 * group (outermost level first), then by the sort key.
 */
export function orderUnits(
  games: Game[],
  sagas: Record<string, string>,
  options: Pick<PackOptions, 'sortBy' | 'sortDirection' | 'groupSagas' | 'groupBy'>,
): Unit[] {
  const raw: Game[][] = []
  if (options.groupSagas) {
    const bySaga = new Map<string, Game[]>()
    for (const g of games) {
      const saga = sagas[g.id]
      if (!saga) {
        raw.push([g])
        continue
      }
      const list = bySaga.get(saga) ?? []
      list.push(g)
      bySaga.set(saga, list)
    }
    for (const list of bySaga.values()) raw.push(orderSaga(list))
  } else {
    for (const g of games) raw.push([g])
  }

  const units = raw.map((list) => {
    const first = list[0]!
    const saga = sagas[first.id]
    const key = options.groupSagas && saga && options.sortBy === 'name' ? saga : sortValue(first, options.sortBy)
    return { games: list, key, path: groupPath(first, options.groupBy) }
  })

  const dir = options.sortDirection === 'asc' ? 1 : -1
  units.sort((a, b) => {
    for (let level = 0; level < options.groupBy.length; level++) {
      const { key, direction } = options.groupBy[level]!
      const c = compareGroups(key, a.path[level], b.path[level], direction)
      if (c) return c
    }
    return dir * compareValues(a.key, b.key) || collator.compare(a.games[0]!.name, b.games[0]!.name)
  })
  return units.map((u) => ({ games: u.games, group: u.path[0] ?? '' }))
}
