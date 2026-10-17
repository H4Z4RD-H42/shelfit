import { useCallback, useMemo } from 'react'
import { paintLens, type LensPaint } from '../domain/lens'
import { useAppStore } from '../store/appStore'

/** The lens applied to the games that go on the shelves. */
export function useLensPaint(): LensPaint {
  const games = useAppStore((s) => s.games)
  const lens = useAppStore((s) => s.lens)
  const shelved = useMemo(() => games.filter((g) => !g.excluded), [games])
  return useMemo(() => paintLens(shelved, lens), [shelved, lens])
}

/** Whether a game is faded out by the filters of the lens. */
export function useDimmed(): (gameId: string) => boolean {
  const { matches } = useLensPaint()
  return useCallback((gameId: string) => matches !== null && !matches.has(gameId), [matches])
}
