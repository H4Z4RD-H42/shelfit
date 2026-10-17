import { useMemo } from 'react'
import { packCollection } from '../domain/packer'
import type { Game } from '../domain/types'
import { useAppStore } from '../store/appStore'

export function useLayout() {
  const games = useAppStore((s) => s.games)
  const units = useAppStore((s) => s.units)
  const cube = useAppStore((s) => s.cube)
  const options = useAppStore((s) => s.options)
  return useMemo(() => packCollection(games, units, cube, options), [games, units, cube, options])
}

export function useGamesById(): Map<string, Game> {
  const games = useAppStore((s) => s.games)
  return useMemo(() => new Map(games.map((g) => [g.id, g])), [games])
}
