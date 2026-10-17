import { useMemo } from 'react'
import { packCollection } from '../domain/packer'
import type { Game } from '../domain/types'
import { useAppStore } from '../store/appStore'

export function useLayout() {
  const games = useAppStore((s) => s.games)
  const units = useAppStore((s) => s.units)
  const options = useAppStore((s) => s.options)
  const zones = useAppStore((s) => s.zones)
  return useMemo(() => packCollection(games, units, options, zones), [games, units, options, zones])
}

export function useGamesById(): Map<string, Game> {
  const games = useAppStore((s) => s.games)
  return useMemo(() => new Map(games.map((g) => [g.id, g])), [games])
}
