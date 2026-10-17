import type { BoxDimensions, DimsSource, Game } from './types'

export function sameDims(a: BoxDimensions | undefined, b: BoxDimensions | undefined): boolean {
  if (!a || !b) return a === b
  return a.width === b.width && a.height === b.height && a.depth === b.depth
}

/**
 * Origin of the sizes after an edit: new or changed sizes were typed by hand,
 * untouched ones keep their origin, removed ones have none.
 */
export function dimsSourceAfterEdit(
  previous: Pick<Game, 'dims' | 'dimsSource'> | undefined,
  dims: BoxDimensions | undefined,
): DimsSource | undefined {
  if (!dims) return undefined
  if (previous && sameDims(previous.dims, dims)) return previous.dimsSource
  return 'manual'
}
