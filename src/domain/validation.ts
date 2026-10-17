import type { BoxDimensions, Game } from './types'

export type GameError = 'name' | 'dims' | 'players' | 'playTime' | 'complexity' | 'rating' | 'year'

type Draft = Pick<Game, 'name' | 'minPlayers' | 'maxPlayers' | 'playTime' | 'complexity' | 'rating' | 'year'> & {
  dims: Partial<BoxDimensions>
}

const inRange = (v: number | undefined, min: number, max: number) => v === undefined || (v >= min && v <= max)

/** Checks a game being edited; returns the first problem found, if any. */
export function validateGame(draft: Draft): GameError | undefined {
  if (!draft.name.trim()) return 'name'
  const sizes = [draft.dims.width, draft.dims.height, draft.dims.depth]
  const given = sizes.filter((v) => v !== undefined)
  // Sizes are optional, but when given they must be complete and positive.
  if (given.length > 0 && (given.length < 3 || given.some((v) => v! <= 0))) return 'dims'
  if (!inRange(draft.minPlayers, 1, 99) || !inRange(draft.maxPlayers, 1, 99)) return 'players'
  if (draft.minPlayers !== undefined && draft.maxPlayers !== undefined && draft.minPlayers > draft.maxPlayers) return 'players'
  if (!inRange(draft.playTime, 1, 10000)) return 'playTime'
  if (!inRange(draft.complexity, 1, 5)) return 'complexity'
  if (!inRange(draft.rating, 1, 10)) return 'rating'
  if (draft.year !== undefined && !Number.isInteger(draft.year)) return 'year'
  return undefined
}
