import { useMemo } from 'react'
import type { Zone } from '../domain/types'
import { useAppStore } from '../store/appStore'

export function useZonesById(): Map<string, Zone> {
  const zones = useAppStore((s) => s.zones)
  return useMemo(() => new Map(zones.map((z) => [z.id, z])), [zones])
}
