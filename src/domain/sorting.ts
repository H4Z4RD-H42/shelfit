import { gameColor, hueOf } from './color'
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
  }
}

function compareValues(a: number | string, b: number | string): number {
  if (typeof a === 'string' && typeof b === 'string') return collator.compare(a, b)
  return (a as number) - (b as number)
}

/** Order of the chapters inside a saga: by year, then by title. */
function compareInSaga(a: Game, b: Game): number {
  const ya = a.year ?? Number.POSITIVE_INFINITY
  const yb = b.year ?? Number.POSITIVE_INFINITY
  if (ya !== yb) return ya - yb
  return collator.compare(a.name, b.name)
}

/**
 * Builds the ordered list of placement units. A unit is either a single game
 * or, when sagas are grouped, all the games of one saga.
 */
export function orderUnits(
  games: Game[],
  sagas: Record<string, string>,
  options: Pick<PackOptions, 'sortBy' | 'sortDirection' | 'groupSagas'>,
): Game[][] {
  const units: { key: number | string; games: Game[] }[] = []
  if (options.groupSagas) {
    const bySaga = new Map<string, Game[]>()
    for (const g of games) {
      const saga = sagas[g.id]
      if (!saga) {
        units.push({ key: sortValue(g, options.sortBy), games: [g] })
        continue
      }
      const list = bySaga.get(saga) ?? []
      list.push(g)
      bySaga.set(saga, list)
    }
    for (const [saga, list] of bySaga) {
      list.sort(compareInSaga)
      const key = options.sortBy === 'name' ? saga : sortValue(list[0]!, options.sortBy)
      units.push({ key, games: list })
    }
  } else {
    for (const g of games) units.push({ key: sortValue(g, options.sortBy), games: [g] })
  }

  const dir = options.sortDirection === 'asc' ? 1 : -1
  units.sort((a, b) => dir * compareValues(a.key, b.key) || collator.compare(a.games[0]!.name, b.games[0]!.name))
  return units.map((u) => u.games)
}
